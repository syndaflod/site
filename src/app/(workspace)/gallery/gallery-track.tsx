"use client";

import { useState } from "react";

type Props = {
  spotifyId: string;
  name: string;
  artists: string[];
  album: string;
  year: string | null;
  cover: string | null;
  durationMs: number;
  children?: React.ReactNode; // date and comment, under the song like a photo's caption
};

// 3:42
function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A Spotify song as its own gallery tile: the album cover where a photo would be, then title,
 * artists and album. Clicking the cover swaps it for Spotify's player; it only loads then, so
 * the gallery doesn't pull in an iframe (and its scripts and cookies) per song.
 */
export function GalleryTrack({ spotifyId, name, artists, album, year, cover, durationMs, children }: Props) {
  const [playing, setPlaying] = useState(false);
  const label = `${name} — ${artists.join(", ")}`;

  return (
    <>
      {playing ? (
        <iframe
          className="gallery-track-player"
          src={`https://open.spotify.com/embed/track/${spotifyId}?theme=0`}
          title={label}
          height={352}
          allow="autoplay; clipboard-write; encrypted-media"
        />
      ) : (
        <button type="button" className="gallery-track-cover" onClick={() => setPlaying(true)}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Spotify's CDN
            <img src={cover} alt="" width={640} height={640} loading="lazy" decoding="async" />
          ) : (
            <span className="gallery-track-blank" aria-hidden="true">♪</span>
          )}
          <span className="sr-only">ouvir {label}</span>
        </button>
      )}
      <p className="gallery-track-info">
        <a href={`https://open.spotify.com/track/${spotifyId}`} target="_blank" rel="noopener noreferrer">
          {name}
        </a>
        <span className="cli-dim">
          {artists.join(", ")} · {album}
          {year && ` (${year})`} · {duration(durationMs)}
        </span>
      </p>
      {children}
    </>
  );
}
