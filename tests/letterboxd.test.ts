import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { decodeHtml, parseFavoriteFilms } from "../src/lib/letterboxd-parser";

function readFixture(): Promise<string> {
  return readFile(new URL("./fixtures/letterboxd-profile.html", import.meta.url), "utf8");
}

test("parseFavoriteFilms parses titles, entities, years, and the favourites boundary", async () => {
  const fixture = await readFixture();
  const films = parseFavoriteFilms(fixture);

  assert.equal(films.length, 3);
  assert.deepEqual(films.map((film) => film.title), [
    "Schindler's List",
    "Amélie",
    "The Lord & the Rings",
  ]);
  assert.deepEqual(films.map((film) => film.year), [1993, 2001, 2001]);
  assert.equal(films[0].posterUrl, "https://a.ltrbxd.com/posters/schindler-300.jpg");
  assert.equal(films[1].posterUrl, "https://a.ltrbxd.com/posters/amelie.jpg");
  assert.equal(films.some((film) => film.title === "Recently Liked (2025)"), false);
});

test("parseFavoriteFilms still scopes to favourites when the sibling container is missing", async () => {
  const fixture = await readFixture();
  const html = fixture.replace('<section id="recently-liked">', '<section id="profile-footer">');
  const films = parseFavoriteFilms(html);

  assert.equal(films.length, 3);
});

test("parseFavoriteFilms keeps data-src separate from src", () => {
  const html = '<section id="favourites"><a href="/film/example/"><img alt="Poster for Example" data-src="empty-poster.jpg" src="https://a.ltrbxd.com/posters/src.jpg" /></a></section>';

  assert.equal(parseFavoriteFilms(html)[0].posterUrl, "https://a.ltrbxd.com/posters/src.jpg");
});

test("decodeHtml supports numeric entities without decoding ampersands twice", () => {
  assert.equal(decodeHtml("Schindler&#039;s &#x27;List&#x27; &amp; Co."), "Schindler's 'List' & Co.");
  assert.equal(decodeHtml("&amp;quot;"), "&quot;");
});
