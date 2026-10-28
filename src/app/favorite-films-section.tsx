import { getFavoriteFilms } from "../lib/letterboxd";
import { favoriteFilmsFallback, type FavoriteFilm } from "../data/favorite-films";

const LETTERBOXD_USER = process.env.LETTERBOXD_USER?.trim();
if (!LETTERBOXD_USER) {
  console.warn("[favorite-films] LETTERBOXD_USER is missing; using fallback films.");
}

export async function FavoriteFilmsSection() {
  const films: FavoriteFilm[] = LETTERBOXD_USER
    ? await getFavoriteFilms(LETTERBOXD_USER)
    : favoriteFilmsFallback;

  return (
    <section className="favorite-films-section cli-block" aria-label="filmes favoritos">
      <h2 className="cli-rule">
        <span className="cli-acc" aria-hidden="true">&gt;</span>
        <span>filmes favoritos</span>
      </h2>
      <ul className="favorite-films-grid">
        {films.map((film, index) => (
          <li className="favorite-film" key={`${film.letterboxdUrl}-${index}`}>
            <a
              className="favorite-film-cover"
              href={film.letterboxdUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${film.title}${film.year ? ` (${film.year})` : ""}`}
            >
              {film.posterUrl ? (
                // Letterboxd serves poster art from its own CDN; the URL is validated above.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="favorite-film-poster"
                  src={film.posterUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="favorite-film-poster-empty" aria-hidden="true" />
              )}
              <span className="favorite-film-overlay">
                <span className="favorite-film-title">{film.title}</span>
                {film.year && <span className="favorite-film-year">{film.year}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
