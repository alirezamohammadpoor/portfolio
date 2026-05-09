const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN!;

const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

// Cache access token (valid ~3600s) separately from response data
let tokenCache: { token: string; expiresAt: number } | null = null;

// Cache response data for 1s to deduplicate concurrent requests
const CACHE_TTL = 1_000;
let cachedData: Record<string, unknown> | null = null;
let cachedAt = 0;
let cachedStatus = 200;

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
  const { access_token, expires_in } = await res.json();
  tokenCache = { token: access_token, expiresAt: now + (expires_in - 60) * 1000 };
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

  // Infer "still playing" from timestamp + duration. Spotify's `played_at`
  // is when the track started, so if now < played_at + duration_ms the track
  // is almost certainly still playing, just not visible to `currently-playing`.
  const playedAtMs = new Date(item.played_at).getTime();
  const durationMs = typeof item.track.duration_ms === "number" ? item.track.duration_ms : 0;
  const inferredStillPlaying = Date.now() < playedAtMs + durationMs;

  return {
    status: 200,
    data: {
      isPlaying: inferredStillPlaying,
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
  const now = Date.now();
  if (cachedData && now - cachedAt < CACHE_TTL) {
    return Response.json(cachedData, { status: cachedStatus });
  }

  const { data, status } = await fetchSpotifyData();
  cachedData = data;
  cachedStatus = status;
  cachedAt = now;
  return Response.json(data, { status });
}
