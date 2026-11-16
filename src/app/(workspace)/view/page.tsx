import type { Metadata } from "next";
import Link from "next/link";
import { createClient, requireOwner } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/signed-urls";
import { FILTERS, fileKind, formatBytes, parseFilter } from "@/lib/format";

export const metadata: Metadata = {
  title: "view",
  robots: { index: false, follow: false },
};

const kindLabel = Object.fromEntries(FILTERS.map((filter) => [filter.value, filter.label]));

// Spelled out under the extension on tiles without a picture.
const kindName = {
  image: "imagem",
  video: "vídeo",
  audio: "áudio",
  pdf: "documento",
  text: "texto",
  other: "arquivo",
} as const;

/** "clip.final.mp4" → { stem: "clip.final", ext: "mp4" }; dotfiles and names without one keep it all. */
function splitName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  return /^[a-z0-9]{1,8}$/i.test(ext) ? { stem: name.slice(0, dot), ext: ext.toLowerCase() } : { stem: name, ext: "" };
}

// Day only on the tile, in São Paulo time; the file's own page has the full date and time.
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function ViewPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string | string[] }>;
}) {
  const { tipo } = await searchParams;
  const filter = parseFilter(Array.isArray(tipo) ? tipo[0] : tipo);

  // The owner check and the listings run together; RLS returns nothing to non-owners anyway.
  const supabase = await createClient();
  const [, { data: allFiles, error: fileError }, { data: allTracks, error: trackError }] = await Promise.all([
    requireOwner("/view"),
    supabase
      .from("files")
      .select("id, path, thumb_path, name, mime, size, in_gallery, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("tracks")
      .select("id, name, artists, cover, in_gallery, created_at")
      .order("created_at", { ascending: false }),
  ]);
  const error = fileError ?? trackError;

  const files = filter === "music" ? [] : allFiles?.filter((file) => filter === "all" || fileKind(file.mime) === filter);
  const tracks = filter === "all" || filter === "music" ? (allTracks ?? []) : [];
  // Uploads and songs in one grid, newest first.
  const items = [
    ...(files ?? []).map((file) => ({ kind: "file" as const, file, created_at: file.created_at })),
    ...tracks.map((track) => ({ kind: "track" as const, track, created_at: track.created_at })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const total = (allFiles?.length ?? 0) + (allTracks?.length ?? 0);

  // Tiles use the small copy. An image without one (an older upload) falls back to the
  // original; a video without a cover frame shows its type instead.
  const thumbPath = (file: { path: string; thumb_path: string | null; mime: string }) =>
    file.thumb_path ?? (fileKind(file.mime) === "image" ? file.path : null);
  const thumbPaths = (files ?? []).flatMap((file) => thumbPath(file) ?? []);
  const thumbs = await signedUrls(thumbPaths);

  return (
    <main className="cli-root private-root">
      <div className="cli-col">

        {error && <p className="cli-dim">erro ao carregar: {error.message}</p>}
        {total > 0 && items.length === 0 && (
          <p className="cli-dim">
            nenhum arquivo desse tipo. <Link href="/view">ver todos</Link>
          </p>
        )}
        {!error && total === 0 && (
          <p className="cli-dim">
            nada aqui ainda. <Link href="/drop">enviar algo</Link>
          </p>
        )}

        <ul className="file-grid">
          {items.map((item) => {
            if (item.kind === "track") {
              const { track } = item;
              const artists = (track.artists as string[]).join(", ");
              return (
                <li key={`track-${track.id}`}>
                  <Link href={`/view/musica/${track.id}`} className="file-card" title={`${track.name} — ${artists}`}>
                    <span className="file-thumb">
                      {track.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Spotify's CDN
                        <img src={track.cover} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="file-thumb-type">
                          <span className="file-thumb-ext">♪</span>
                          <span className="file-thumb-kind">música</span>
                        </span>
                      )}
                    </span>
                    <span className="file-card-name">
                      <span className="file-card-stem">{track.name}</span>
                    </span>
                    <span className="file-card-meta">
                      <span className="file-card-stem">♪ {artists}</span>
                      {track.in_gallery && (
                        <span className="file-card-gallery" title="na gallery">
                          <span aria-hidden="true">✦</span>
                          <span className="sr-only">na gallery</span>
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            }
            const { file } = item;
            const kind = fileKind(file.mime);
            const coverPath = thumbPath(file);
            const thumb = coverPath ? thumbs.get(coverPath) : undefined;
            const { stem, ext } = splitName(file.name);
            return (
              <li key={file.id}>
                <Link href={`/view/${file.id}`} className="file-card" title={file.name}>
                  <span className="file-thumb">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                      <img src={thumb} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="file-thumb-type">
                        <span className="file-thumb-ext">{ext || kindLabel[kind]}</span>
                        <span className="file-thumb-kind">{kindName[kind]}</span>
                      </span>
                    )}
                  </span>
                  <span className="file-card-name">
                    <span className="file-card-stem">{stem}</span>
                    {ext && <span className="file-card-ext">.{ext}</span>}
                  </span>
                  <span className="file-card-meta">
                    <span>
                      {formatBytes(file.size)} · {formatDay(file.created_at)}
                    </span>
                    {file.in_gallery && (
                      <span className="file-card-gallery" title="na gallery">
                        <span aria-hidden="true">✦</span>
                        <span className="sr-only">na gallery</span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
