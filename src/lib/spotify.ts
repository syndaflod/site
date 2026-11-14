// Spotify Web API lookups for the songs shown in /gallery. Server only: it reads the
// client secret. Uses the Client Credentials flow, so nobody signs in to Spotify.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const REQUEST_TIMEOUT_MS = 8_000;

/** What the gallery shows for a song; stored in the tracks table. */
export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  year: string | null;
  cover: string | null;
  duration_ms: number;
};

/**
 * Track ID from what the share menu copies, or null for anything else (albums, playlists,
 * other sites). Accepts open.spotify.com/track/ID (with ?si=, intl-xx/ or embed/ in the path)
 * and spotify:track:ID.
 */
export function parseTrackId(input: string): string | null {
  const value = input.trim();
  const uri = /^spotify:track:([A-Za-z0-9]{22})$/.exec(value);
  if (uri) return uri[1];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return null;
  const match = /^\/(?:intl-[a-z-]+\/)?(?:embed\/)?track\/([A-Za-z0-9]{22})\/?$/i.exec(url.pathname);
  return match ? match[1] : null;
}

export function trackUrl(id: string) {
  return `https://open.spotify.com/track/${id}`;
}

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now()) return token.value;

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("spotify não configurado (SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET).");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`spotify recusou as credenciais (${response.status}).`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  // A minute early, so a token never expires between this check and the request.
  token = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return token.value;
}

type ApiTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; release_date?: string; images: { url: string; width: number | null }[] };
};

async function fetchTrack(id: string) {
  return fetch(`${API}/tracks/${id}`, {
    headers: { authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function getTrack(id: string): Promise<SpotifyTrack> {
  let response = await fetchTrack(id);
  if (response.status === 401) {
    // The cached token stopped working before its expiry: get a new one and try once more.
    token = null;
    response = await fetchTrack(id);
  }
  if (response.status === 404 || response.status === 400) throw new Error("essa música não existe no spotify.");
  if (!response.ok) throw new Error(`spotify respondeu ${response.status}. tente de novo.`);

  const track = (await response.json()) as ApiTrack;
  // Images come largest first (640, 300, 64); a song fills a whole gallery tile, so the largest.
  const cover = track.album.images[0];
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    year: track.album.release_date?.slice(0, 4) ?? null,
    cover: cover?.url ?? null,
    duration_ms: track.duration_ms,
  };
}
