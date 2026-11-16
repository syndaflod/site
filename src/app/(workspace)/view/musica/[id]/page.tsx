import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, requireOwner } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { deleteTrack, setTrackInGallery } from "../../actions";
import { GalleryDetails } from "../../gallery-details";
import { TodayOption } from "../../today-option";

export const metadata: Metadata = {
  title: "view",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A Spotify song added on /view: its player, the gallery switch, and the date and comment
// the gallery shows under it, like an uploaded photo's page.
export default async function ViewTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [, { data: track, error }] = await Promise.all([
    requireOwner(`/view/musica/${id}`),
    supabase
      .from("tracks")
      .select("id, spotify_id, name, artists, album, year, in_gallery, gallery_date, gallery_comment, created_at")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (error) throw new Error(`erro ao carregar a música: ${error.message}`);
  if (!track) notFound();

  const artists = (track.artists as string[]).join(", ");
  const spotifyUrl = `https://open.spotify.com/track/${track.spotify_id}`;

  return (
    <main className="cli-root private-root">
      <div className="cli-col">
        <h1 className="cli-acc cli-b file-title">♪ {track.name}</h1>
        <p className="cli-dim file-meta">
          {artists} · {track.album}
          {track.year && ` (${track.year})`} · adicionada {formatDate(track.created_at)}
        </p>

        <div className="file-preview">
          <iframe
            className="gallery-track-player"
            src={`https://open.spotify.com/embed/track/${track.spotify_id}?theme=0`}
            title={`${track.name} — ${artists}`}
            height={352}
            allow="autoplay; clipboard-write; encrypted-media"
          />
        </div>

        {track.in_gallery && (
          <GalleryDetails table="tracks" id={track.id} date={track.gallery_date} comment={track.gallery_comment} />
        )}

        <div className="file-actions">
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">abrir no spotify</a>
          <form action={setTrackInGallery.bind(null, track.id, !track.in_gallery)} className="action-group">
            <button type="submit" className="cli-button">
              {track.in_gallery ? "tirar da gallery" : "pôr na gallery"}
            </button>
            {!track.in_gallery && <TodayOption />}
          </form>
          <form action={deleteTrack.bind(null, track.id)}>
            <button type="submit" className="cli-button is-danger">apagar</button>
          </form>
        </div>
      </div>
    </main>
  );
}
