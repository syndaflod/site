import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/supabase/signed-urls";
import { formatDay } from "@/lib/format";
import { GalleryPhoto } from "./gallery-photo";
import { GalleryTrack } from "./gallery-track";

export const metadata: Metadata = {
  title: "gallery · heitor tureck de oliveira",
  description: "fotos, vídeos e músicas de heitor tureck de oliveira.",
};

type Dated = { gallery_date: string | null; created_at: string };

// Newest gallery date first; items without one follow, newest first. ISO strings sort as dates.
function newestFirst(a: Dated, b: Dated) {
  if (a.gallery_date !== b.gallery_date) {
    if (!a.gallery_date) return 1;
    if (!b.gallery_date) return -1;
    return a.gallery_date < b.gallery_date ? 1 : -1;
  }
  return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
}

// A plain function, not a component: it returns null when empty, so GalleryPhoto gets no
// children and leaves out the caption box in the expanded view.
function caption(date: string | null, comment: string | null) {
  if (!date && !comment) return null;
  return (
    <p className="gallery-caption">
      {comment && <span>{comment}</span>}
      {date && (
        <time dateTime={date} className="cli-acc">
          {formatDay(date)}
        </time>
      )}
    </p>
  );
}

export default async function GalleryPage() {
  const supabase = await createClient();

  // RLS only returns the images, videos and songs the owner published, for anyone who asks.
  const [{ data: photos, error: photoError }, { data: tracks, error: trackError }] = await Promise.all([
    supabase
      .from("files")
      .select("id, path, preview_path, width, height, name, mime, gallery_date, gallery_comment, created_at")
      .eq("in_gallery", true)
      .or("mime.like.image/%,mime.like.video/%"),
    supabase
      .from("tracks")
      .select("id, spotify_id, name, artists, album, year, cover, duration_ms, gallery_date, gallery_comment, created_at")
      .eq("in_gallery", true),
  ]);
  // Songs are extra: if their query fails (say, the tracks table isn't set up yet), the
  // photos still show and the failure goes to the server log instead of blanking the page.
  const error = photoError;
  if (trackError) console.error(`gallery: songs not loaded: ${trackError.message}`);

  // Tiles show the resized copy; clicking one expands the original over the page.
  const paths = (photos ?? []).flatMap((photo) =>
    photo.preview_path ? [photo.path, photo.preview_path] : [photo.path],
  );
  const urls = await signedUrls(supabase, paths);

  const items = [
    ...(photos ?? []).map((row) => ({ kind: "photo" as const, row })),
    ...(tracks ?? []).map((row) => ({ kind: "track" as const, row })),
  ].sort((a, b) => newestFirst(a.row, b.row));

  return (
    <main className="cli-root">
      <div className="cli-col">
        <h1 className="cli-rule">
          <span className="cli-acc" aria-hidden="true">&gt;</span>
          <span>gallery</span>
        </h1>

        {error ? (
          <p className="cli-dim">erro ao carregar: {error.message}</p>
        ) : items.length === 0 ? (
          <p className="cli-dim">nada exposto ainda.</p>
        ) : (
          <ul className="gallery-grid">
            {items.map((item) => {
              if (item.kind === "track") {
                const track = item.row;
                return (
                  <li key={`track-${track.id}`}>
                    <GalleryTrack
                      spotifyId={track.spotify_id}
                      name={track.name}
                      artists={track.artists}
                      album={track.album}
                      year={track.year}
                      cover={track.cover}
                      durationMs={track.duration_ms}
                    >
                      {caption(track.gallery_date, track.gallery_comment)}
                    </GalleryTrack>
                  </li>
                );
              }
              const photo = item.row;
              const url = urls.get(photo.path);
              const src = (photo.preview_path && urls.get(photo.preview_path)) || url;
              if (!url || !src) return null;
              return (
                <li key={photo.id}>
                  <GalleryPhoto
                    src={src}
                    full={url}
                    alt={photo.name}
                    width={photo.width}
                    height={photo.height}
                    video={photo.mime.startsWith("video/")}
                  >
                    {caption(photo.gallery_date, photo.gallery_comment)}
                  </GalleryPhoto>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
