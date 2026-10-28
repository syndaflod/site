"use client";

import { useEffect, useState } from "react";

type Language = "pt-br" | "en-us";

type LastFmTrack = {
  name?: string;
  album?: string | { name?: string; "#text"?: string };
  artist?: string | { name?: string; "#text"?: string };
  url?: string;
  image?: { "#text"?: string; size?: string }[];
  date?: { uts?: string };
  "@attr"?: { nowplaying?: string };
};

type LastFmAlbum = {
  name?: string;
  artist?: string | { name?: string; "#text"?: string };
  url?: string;
  playcount?: string | number;
  image?: { "#text"?: string; size?: string }[];
};

type LastFmResponse = {
  recenttracks?: { track?: LastFmTrack[] | LastFmTrack };
  topalbums?: { album?: LastFmAlbum[] | LastFmAlbum };
  error?: number;
};

type SectionState<T> = { items: T[]; loading: boolean; error: boolean };

const CLIENT_REQUEST_TIMEOUT_MS = 12_000;
const REFRESH_INTERVAL_MS = 30_000;

const messages = {
  "pt-br": {
    recentTracks: "recém tocadas",
    mostPlayed: "top álbuns (últimos 30 dias)",
    loading: "carregando...",
    error: "não foi possível carregar",
    noRecent: "sem recém tocadas",
    nowPlaying: "tocando agora",
    unavailable: "horário indisponível",
    noTop: "sem álbuns reproduzidos neste período",
    plays: "reproduções",
  },
  "en-us": {
    recentTracks: "recent tracks",
    mostPlayed: "top albums (last 30 days)",
    loading: "Loading...",
    error: "couldn't load",
    noRecent: "no recent plays",
    nowPlaying: "now playing",
    unavailable: "time unavailable",
    noTop: "no albums played in this period",
    plays: "plays",
  },
} as const;

function asArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getArtistName(artist: LastFmTrack["artist"]): string {
  if (typeof artist === "string") return artist;
  return artist?.name || artist?.["#text"] || "";
}

function getLastFmUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "last.fm" || url.hostname.endsWith(".last.fm"))
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function getLastFmArtistUrl(artist: string): string | undefined {
  const name = artist.trim();
  if (!name) return undefined;
  return "https://www.last.fm/music/" + encodeURIComponent(name).replace(/%20/g, "+");
}

function relativeTime(uts: string | undefined, language: Language): string | undefined {
  const timestamp = Number(uts);
  if (!Number.isFinite(timestamp)) return undefined;

  const elapsed = Date.now() - timestamp * 1000;
  const magnitude = Math.abs(elapsed);
  const units = [
    { name: "second" as const, ms: 1_000 },
    { name: "minute" as const, ms: 60_000 },
    { name: "hour" as const, ms: 3_600_000 },
    { name: "day" as const, ms: 86_400_000 },
    { name: "month" as const, ms: 2_592_000_000 },
    { name: "year" as const, ms: 31_536_000_000 },
  ];
  const unit = units.find((item) => magnitude < item.ms * (item.name === "second" ? 60 : item.name === "minute" ? 60 : item.name === "hour" ? 24 : item.name === "day" ? 30 : 12)) ?? units[units.length - 1];
  const value = Math.round(-elapsed / unit.ms);
  return new Intl.RelativeTimeFormat(language === "pt-br" ? "pt-BR" : "en-US", { numeric: "auto" }).format(value, unit.name);
}

function getCoverUrl(images: LastFmAlbum["image"], preferredSize: "medium" | "extralarge"): string | undefined {
  const fallbackSizes = preferredSize === "medium" ? ["large", "small"] : ["large", "medium", "small"];
  const image = images?.find((item) => item.size === preferredSize)
    || fallbackSizes.map((size) => images?.find((item) => item.size === size)).find(Boolean)
    || images?.at(-1);
  if (!image?.["#text"]) return undefined;
  try {
    const url = new URL(image["#text"]);
    if (url.pathname.includes("2a96cbd8b46e442fc41c2b86b821562f")) return undefined;
    return url.protocol === "https:"
      && (
        url.hostname === "last.fm"
        || url.hostname.endsWith(".last.fm")
        || url.hostname === "lastfm-img.freetls.fastly.net"
        || url.hostname === "lastfm.freetls.fastly.net"
      )
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="cli-rule">
      <span className="cli-acc" aria-hidden="true">&gt;</span>
      <span>{children}</span>
    </h2>
  );
}

function RecentTracks({ tracks, language }: { tracks: LastFmTrack[]; language: Language }) {
  const text = messages[language];
  if (tracks.length === 0) return <p className="cli-dim">{text.noRecent}</p>;

  return (
    <ol className="lastfm-list">
      {tracks.slice(0, 5).map((track, index) => {
        const nowPlaying = track["@attr"]?.nowplaying === "true";
        const time = nowPlaying ? text.nowPlaying : relativeTime(track.date?.uts, language) || text.unavailable;
        const artist = getArtistName(track.artist);
        const artistHref = getLastFmArtistUrl(artist);
        const href = getLastFmUrl(track.url);
        const cover = getCoverUrl(track.image, "medium");
        const title = track.name || "unknown track";

        return (
          <li className="lastfm-track" key={`${title}-${artist}-${index}`}>
            {cover ? (
              // Last.fm image hosts are validated in getCoverUrl above.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="lastfm-track-cover" src={cover} alt={`${title} album cover`} loading="lazy" />
            ) : <span className="lastfm-track-cover lastfm-track-cover-empty" aria-hidden="true" />}
            <span className="lastfm-track-main">
              {href ? <a className="lastfm-title" href={href} target="_blank" rel="noopener noreferrer">{title}</a> : <span className="lastfm-title">{title}</span>}
              {artist && (
                <span className="lastfm-meta">
                  {" · "}
                  <a className="lastfm-artist" href={artistHref} target="_blank" rel="noopener noreferrer">
                    {artist}
                  </a>
                </span>
              )}
            </span>
            <span className={nowPlaying ? "lastfm-now-playing" : "lastfm-meta"}>{time}</span>
          </li>
        );
      })}
    </ol>
  );
}

function TopAlbums({ albums, language }: { albums: LastFmAlbum[]; language: Language }) {
  const text = messages[language];
  const locale = language === "pt-br" ? "pt-BR" : "en-US";
  if (albums.length === 0) return <p className="cli-dim">{text.noTop}</p>;

  return (
    <ol className="lastfm-album-list">
      {albums.slice(0, 9).map((album, index) => {
        const artist = getArtistName(album.artist);
        const href = getLastFmUrl(album.url);
        const cover = getCoverUrl(album.image, "extralarge");
        const title = album.name || "unknown album";
        const plays = Number(album.playcount);
        const playCount = `${new Intl.NumberFormat(locale).format(Number.isFinite(plays) ? plays : 0)} ${text.plays}`;
        const details = (
          <>
            {cover ? (
              // Last.fm image hosts are validated in getCoverUrl above.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="lastfm-album-cover" src={cover} alt={`${title} cover`} loading="lazy" />
            ) : <span className="lastfm-album-cover lastfm-album-cover-empty" aria-hidden="true" />}
            <span className="lastfm-album-overlay" aria-hidden="true">
              <span className="lastfm-album-title">{title}</span>
              {artist && <span className="lastfm-album-artist">{artist}</span>}
              <span className="lastfm-album-plays">{playCount}</span>
            </span>
          </>
        );

        return (
          <li className="lastfm-album" key={`${title}-${artist}-${index}`}>
            {href ? (
              <a className="lastfm-album-tile" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${title}${artist ? `, ${artist}` : ""}, ${playCount}`}>
                {details}
              </a>
            ) : (
              <div className="lastfm-album-tile" tabIndex={0} aria-label={`${title}${artist ? `, ${artist}` : ""}, ${playCount}`}>
                {details}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function LastFmSection({ language }: { language: Language }) {
  const [recent, setRecent] = useState<SectionState<LastFmTrack>>({ items: [], loading: true, error: false });
  const [top, setTop] = useState<SectionState<LastFmAlbum>>({ items: [], loading: true, error: false });
  const text = messages[language];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadSection<T>(
      method: string,
      setter: (state: SectionState<T>) => void,
      getItems: (response: LastFmResponse) => T[],
    ) {
      const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/lastfm?method=${encodeURIComponent(method)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Last.fm request failed");
        const data = (await response.json()) as LastFmResponse;
        if (data.error) throw new Error("Last.fm returned an error");
        if (active) setter({ items: getItems(data), loading: false, error: false });
      } catch {
        // A timeout must end loading too; only suppress state updates after unmount.
        if (active) setter({ items: [], loading: false, error: true });
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    let refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      await Promise.all([
        loadSection("user.getRecentTracks", setRecent, (data) => asArray(data.recenttracks?.track)),
        loadSection("user.getTopAlbums", setTop, (data) => asArray(data.topalbums?.album)),
      ]);
      refreshing = false;
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controller.abort();
    };
  }, []);

  return (
    <div className="cli-block lastfm-section" aria-label="Last.fm">
      <section className="lastfm-block" aria-label={text.recentTracks}>
        <SectionHeading>{text.recentTracks}</SectionHeading>
        {recent.loading ? <p className="cli-dim">{text.loading}</p> : null}
        {recent.error ? <p className="cli-dim">{text.error}</p> : null}
        {!recent.loading && !recent.error ? <RecentTracks tracks={recent.items} language={language} /> : null}
      </section>
      <section className="lastfm-block" aria-label={text.mostPlayed}>
        <SectionHeading>{text.mostPlayed}</SectionHeading>
        {top.loading ? <p className="cli-dim">{text.loading}</p> : null}
        {top.error ? <p className="cli-dim">{text.error}</p> : null}
        {!top.loading && !top.error ? <TopAlbums albums={top.items} language={language} /> : null}
      </section>
    </div>
  );
}
