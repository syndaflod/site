import "server-only";

import { parse } from "node-html-parser";
import { unstable_cache } from "next/cache";
import { favoriteFilmsFallback, type FavoriteFilm } from "../data/favorite-films";
import { parseFavoriteFilms, parsePosterImage } from "./letterboxd-parser";

export const FAVORITE_COUNT = 4;
const LETTERBOXD_ORIGIN = "https://letterboxd.com";
const LETTERBOXD_USER_AGENT = "HeitorTureckPortfolio/1.0 (+https://github.com/syndaflod)";
const LETTERBOXD_REQUEST_TIMEOUT_MS = 4_000;
const LETTERBOXD_CACHE_SECONDS = 86_400;

function letterboxdFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": LETTERBOXD_USER_AGENT },
    signal: AbortSignal.timeout(LETTERBOXD_REQUEST_TIMEOUT_MS),
  });
}

function parseFilmPoster(html: string): string | undefined {
  const document = parse(html);
  for (const image of document.querySelectorAll("img")) {
    const posterUrl = parsePosterImage(image);
    if (posterUrl) return posterUrl;
  }
  return undefined;
}

async function fetchFilmPoster(filmUrl: string): Promise<string | undefined> {
  try {
    const response = await letterboxdFetch(filmUrl);
    if (!response.ok) return undefined;
    return parseFilmPoster(await response.text());
  } catch {
    return undefined;
  }
}

async function addMissingPosters(films: FavoriteFilm[]): Promise<FavoriteFilm[]> {
  const filmsWithPosters = await Promise.all(films.map(async (film) => {
    const fallbackPoster = favoriteFilmsFallback.find(
      (fallbackFilm) => fallbackFilm.letterboxdUrl === film.letterboxdUrl,
    )?.posterUrl;
    const posterUrl = film.posterUrl
      || await fetchFilmPoster(film.letterboxdUrl)
      || fallbackPoster;

    return { ...film, posterUrl };
  }));

  const filmsWithoutPosters = filmsWithPosters.filter((film) => !film.posterUrl);
  if (filmsWithoutPosters.length > 0) {
    console.warn(
      `[favorite-films] No usable Letterboxd poster was found for ${filmsWithoutPosters.map((film) => film.title).join(", ")}.`,
    );
  }
  return filmsWithPosters;
}

async function fetchFavoriteFilms(username: string): Promise<FavoriteFilm[]> {
  const response = await letterboxdFetch(`${LETTERBOXD_ORIGIN}/${encodeURIComponent(username)}/`);
  if (!response.ok) {
    throw new Error(`Letterboxd returned HTTP ${response.status}.`);
  }

  const films = parseFavoriteFilms(await response.text());
  if (films.length === 0) {
    throw new Error("No favorite films were found in the Letterboxd profile.");
  }

  return addMissingPosters(films.slice(0, FAVORITE_COUNT));
}

const getCachedFavoriteFilms = unstable_cache(fetchFavoriteFilms, ["letterboxd-favorite-films"], {
  revalidate: LETTERBOXD_CACHE_SECONDS,
});

export async function getFavoriteFilms(username: string): Promise<FavoriteFilm[]> {
  try {
    return await getCachedFavoriteFilms(username);
  } catch (error) {
    console.warn("[favorite-films] Could not fetch Letterboxd favorites; using fallback films.", error);
    return favoriteFilmsFallback;
  }
}
