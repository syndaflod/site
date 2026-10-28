import { parse, type HTMLElement } from "node-html-parser";
import type { FavoriteFilm } from "../data/favorite-films";

const LETTERBOXD_ORIGIN = "https://letterboxd.com";

export function decodeHtml(value: string): string {
  return value.replace(
    /&(?:amp|quot|apos|lt|gt);|&#(?:x([\da-f]+)|([\d]+));/gi,
    (entity, hexadecimal, decimal) => {
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));

      switch (entity.toLowerCase()) {
        case "&quot;": return '"';
        case "&apos;": return "'";
        case "&lt;": return "<";
        case "&gt;": return ">";
        case "&amp;": return "&";
        default: return entity;
      }
    },
  );
}

function getSafePosterUrl(value: string | undefined): string | undefined {
  if (!value || /empty-poster/i.test(value)) return undefined;

  try {
    const url = new URL(decodeHtml(value), LETTERBOXD_ORIGIN);
    return url.protocol === "https:"
      && url.hostname.endsWith(".ltrbxd.com")
      && !/empty-poster/i.test(url.href)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function parsePosterImage(image: HTMLElement | null): string | undefined {
  if (!image) return undefined;

  const alt = decodeHtml(image.getAttribute("alt") || "");
  if (!/^Poster for\b/i.test(alt)) return undefined;

  const posterSources = [
    image.getAttribute("data-srcset"),
    image.getAttribute("data-src"),
    image.getAttribute("srcset"),
    image.getAttribute("src"),
  ].filter((source): source is string => Boolean(source));

  for (const source of posterSources) {
    const candidates = source
      .split(",")
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean);

    for (const candidate of candidates.reverse()) {
      const safeUrl = getSafePosterUrl(candidate);
      if (safeUrl) return safeUrl;
    }
  }

  return undefined;
}

function parseFilmLabel(link: HTMLElement, image: HTMLElement | null): string {
  const label = decodeHtml(image?.getAttribute("alt") || link.getAttribute("aria-label") || "");
  return label.replace(/^Poster for\s+/i, "").trim();
}

export function parseFavoriteFilms(html: string): FavoriteFilm[] {
  const document = parse(html);
  const section = document.querySelector("#favourites");
  if (!section) return [];

  const films: FavoriteFilm[] = [];
  for (const link of section.querySelectorAll('a[href^="/film/"]')) {
    const href = link.getAttribute("href");
    if (!href) continue;

    const image = link.querySelector("img");
    const label = parseFilmLabel(link, image);
    if (!label) continue;

    const yearMatch = label.match(/\s\((\d{4})\)$/);
    const film: FavoriteFilm = {
      title: yearMatch ? label.slice(0, yearMatch.index).trim() : label,
      letterboxdUrl: new URL(href, LETTERBOXD_ORIGIN).toString(),
    };
    film.posterUrl = parsePosterImage(image);
    if (yearMatch) film.year = Number(yearMatch[1]);
    films.push(film);
  }

  return films;
}
