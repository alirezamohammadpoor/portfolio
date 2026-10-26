import { connection } from "next/server";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN!;

const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

// Cache access token (valid ~3600s) separately from response data
let tokenCache: { token: string; expiresAt: number } | null = null;

// Cache response data for 1s, and share the in-flight request: visitors
// who arrive while a fetch is running get that fetch, not their own.
const CACHE_TTL = 1_000;
let cachedData: Record<string, unknown> | null = null;
let cachedAt = 0;
let cachedStatus = 200;
let inFlight: Promise<{ data: Record<string, unknown>; status: number }> | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  });
  if (!res.ok) {
    // The body says why (e.g. "Refresh token revoked", which means a new
    // token from scripts/spotify-refresh-token.mjs is needed).
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify token refresh failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const { access_token, expires_in } = await res.json();
  if (typeof access_token !== "string") throw new Error("Spotify token refresh returned no token");
  tokenCache = { token: access_token, expiresAt: now + ((expires_in ?? 3600) - 60) * 1000 };
  return access_token;
}

async function fetchSpotifyData(): Promise<{ data: Record<string, unknown>; status: number }> {
  const accessToken = await getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Fetch both endpoints in parallel
  const [nowRes, recentRes] = await Promise.all([
    // cache: "no-store" — the route handler keeps its own 1s in-memory
    // cache (see CACHE_TTL above). Letting Next.js silently forever-cache
    // the upstream Spotify responses on top of that would mean the widget
    // could show a stale "now playing" track for the lifetime of the
    // server process.
    fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers, cache: "no-store" }),
    fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers, cache: "no-store" }),
  ]);

  // Trust currently-playing when either:
  //   (a) the track is actively playing (is_playing: true), OR
  //   (b) the track is paused mid-playback (is_playing: false but progress_ms > 0) —
  //       the user actually listened to part of it, so it's the "last listened" track.
  // Skip when the track is just queued/loaded with progress_ms == 0 — that wasn't
  // listened to, it was just selected. Fall through to recently-played in that case.
  if (nowRes.status === 200) {
    const now = await nowRes.json();
    const progressMs = typeof now?.progress_ms === "number" ? now.progress_ms : 0;
    const isPlayingNow = now?.is_playing === true;
    if (now?.item && (isPlayingNow || progressMs > 0)) {
      return {
        status: 200,
        data: {
          isPlaying: isPlayingNow,
          title: now.item.name,
          artist: now.item.artists.map((a: { name: string }) => a.name).join(", "),
          album: now.item.album.name,
          albumImageUrl: now.item.album.images[0]?.url ?? null,
          songUrl: now.item.external_urls.spotify,
          playedAt: null,
        },
      };
    }
  }

  // Fall back to recently played (covers paused + nothing-loaded cases, plus
  // cases where `currently-playing` returns 204 even though a track is active —
  // happens when Spotify can't see the user's device through the API).
  const recent = await recentRes.json();
  const item = recent.items?.[0];

  if (!item) {
    return { status: 404, data: { error: "No data" } };
  }

  // `played_at` is when the track finished (or was skipped), not when it
  // started, so nothing about "still playing" can be read from it: a track
  // that is not in `currently-playing` is reported as last listened to.
  return {
    status: 200,
    data: {
      isPlaying: false,
      title: item.track.name,
      artist: item.track.artists.map((a: { name: string }) => a.name).join(", "),
      album: item.track.album.name,
      albumImageUrl: item.track.album.images[0]?.url ?? null,
      songUrl: item.track.external_urls.spotify,
      playedAt: item.played_at,
    },
  };
}

export async function GET() {
  // Always served on request (cacheComponents would otherwise try to
  // prerender this handler at build time, where the upstream fetch rejects).
  await connection();
  const now = Date.now();
  if (cachedData && now - cachedAt < CACHE_TTL) {
    return Response.json(cachedData, { status: cachedStatus });
  }

  if (!inFlight) {
    inFlight = fetchSpotifyData()
      .catch((err) => {
        // A non-JSON upstream body (an HTML 502) or a failed token refresh:
        // the shape the widget already handles, not an unhandled 500.
        console.error("Spotify now-playing error:", err);
        return { status: 503, data: { error: "Spotify unavailable" } };
      })
      .finally(() => {
        inFlight = null;
      });
  }
  const { data, status } = await inFlight;
  cachedData = data;
  cachedStatus = status;
  cachedAt = Date.now();
  return Response.json(data, { status });
}
