export type FavoriteFilm = {
  title: string;
  year?: number;
  letterboxdUrl: string;
  posterUrl?: string;
};

export const favoriteFilmsFallback: FavoriteFilm[] = [
  {
    title: "Eyes Wide Shut",
    letterboxdUrl: "https://letterboxd.com/film/eyes-wide-shut/",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/5/1/7/1/7/51717-eyes-wide-shut-0-300-0-450-crop.jpg?v=7010402aeb",
  },
  {
    title: "The Notebook",
    letterboxdUrl: "https://letterboxd.com/film/the-notebook/",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/4/5/6/6/7/45667-the-notebook-0-300-0-450-crop.jpg?v=d867e84f30",
  },
  {
    title: "Ford v Ferrari",
    letterboxdUrl: "https://letterboxd.com/film/ford-v-ferrari/",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/2/9/1/4/1/9/291419-ford-v-ferrari-0-300-0-450-crop.jpg?v=27ed4e72db",
  },
  {
    title: "Being there",
    letterboxdUrl: "https://letterboxd.com/film/being-there/",
    posterUrl: "https://a.ltrbxd.com/resized/sm/upload/ut/38/ta/f1/being-there-0-460-0-690-crop.jpg?v=9799a46603",
  },
];
