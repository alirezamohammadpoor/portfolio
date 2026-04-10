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
    fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers }),
    fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers }),
  ]);

  // Check currently playing first (includes paused tracks)
  if (nowRes.status === 200) {
    const now = await nowRes.json();
    if (now?.item) {
      return {
        status: 200,
        data: {
          isPlaying: now.is_playing === true,
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

  // Fall back to recently played
  const recent = await recentRes.json();
  const item = recent.items?.[0];

  if (!item) {
    return { status: 404, data: { error: "No data" } };
  }

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
