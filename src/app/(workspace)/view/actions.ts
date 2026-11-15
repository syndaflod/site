"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/supabase/server";
import { STORAGE_QUOTA_BYTES } from "@/lib/storage-limits";
import { deleteObjects, moveObject } from "@/lib/r2";
import { fileKind, todaySaoPaulo, type FileKind } from "@/lib/format";
import { randomName, storageName } from "@/lib/file-names";
import { getTrack, parseTrackId } from "@/lib/spotify";

// Server Actions are public endpoints: every one checks the owner again.

export type StorageUsage = {
  quota: number;
  bytes: number;
  count: number;
  kinds: Record<FileKind, { count: number; bytes: number }>;
};

const PAGE = 1000; // PostgREST's default row cap per request

/**
 * Bytes stored in R2, by file type, for the storage panel on /view. Summed from
 * the files table (original uploads); the small thumb/preview copies aren't sized there.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  const { supabase } = await requireOwner("/view");
  const empty = () => ({ count: 0, bytes: 0 });
  const usage: StorageUsage = {
    quota: STORAGE_QUOTA_BYTES,
    bytes: 0,
    count: 0,
    kinds: { image: empty(), video: empty(), audio: empty(), pdf: empty(), text: empty(), other: empty() },
  };

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("files")
      .select("mime, size")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const file of data ?? []) {
      const kind = usage.kinds[fileKind(file.mime)];
      kind.count += 1;
      kind.bytes += file.size;
      usage.count += 1;
      usage.bytes += file.size;
    }
    if (!data || data.length < PAGE) break;
  }
  return usage;
}

/** "data de hoje": the checkbox next to "pôr na gallery", or the /drop option sent with a song. */
const wantsToday = (formData?: FormData) => formData?.get("auto_date") === "on";

/**
 * Puts a row in /gallery or takes it out. Putting it in with "data de hoje" checked gives it
 * today's date, so it sorts with the newest; a date already set is kept.
 */
async function setGallery(table: GalleryTable, id: string, inGallery: boolean, formData?: FormData) {
  const { supabase } = await requireOwner(table === "tracks" ? `/view/musica/${id}` : `/view/${id}`);
  const { error } = await supabase.from(table).update({ in_gallery: inGallery }).eq("id", id);
  if (error) throw new Error(error.message);
  if (inGallery && wantsToday(formData)) {
    const { error: dateError } = await supabase
      .from(table)
      .update({ gallery_date: todaySaoPaulo() })
      .eq("id", id)
      .is("gallery_date", null);
    if (dateError) throw new Error(dateError.message);
  }
  refresh();
}

export async function setInGallery(id: string, inGallery: boolean, formData?: FormData) {
  await setGallery("files", id, inGallery, formData);
}

/**
 * Gives an uploaded file a random name, like the "nome aleatório" upload option: the row's
 * name and the stored object's key both change, so the original name is gone from links too.
 */
export async function randomizeName(id: string) {
  const { supabase } = await requireOwner(`/view/${id}`);
  const { data: file, error: readError } = await supabase.from("files").select("path, name").eq("id", id).single();
  if (readError || !file) throw new Error(readError?.message ?? "arquivo não encontrado");

  const name = randomName(file.name);
  const folder = file.path.slice(0, file.path.lastIndexOf("/") + 1);
  const path = `${folder}${storageName(name)}`;

  await moveObject(file.path, path);

  const { error } = await supabase.from("files").update({ name, path }).eq("id", id);
  if (error) {
    // Put the object back so the row still points at it.
    const undoError = await moveObject(path, file.path).then(
      () => null,
      (undo: unknown) => (undo instanceof Error ? undo : new Error(String(undo))),
    );
    throw new Error(
      undoError ? `${error.message} (e o arquivo ficou em ${path}: ${undoError.message})` : error.message,
    );
  }
  refresh();
}

const MAX_COMMENT = 1000;

/** "13/11/2026" → "2026-11-13", or null when it isn't a real calendar day (31/02, 13/13). */
function parseDay(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const iso = `${year}-${month}-${day}`;
  return date.toISOString().slice(0, 10) === iso ? iso : null;
}

export type GalleryDetailsState = { status: "idle" | "saved" | "error"; message?: string };

/** Rows with a gallery date and comment: uploaded photos and videos, and Spotify songs. */
export type GalleryTable = "files" | "tracks";

export async function saveGalleryDetails(
  target: GalleryTable,
  id: string,
  _previous: GalleryDetailsState,
  formData: FormData,
): Promise<GalleryDetailsState> {
  // Bound arguments come from the browser, so the table name is checked, not trusted.
  const table: GalleryTable = target === "tracks" ? "tracks" : "files";
  const { supabase } = await requireOwner(table === "tracks" ? `/view/musica/${id}` : `/view/${id}`);

  const date = String(formData.get("gallery_date") ?? "").trim();
  const comment = String(formData.get("gallery_comment") ?? "").trim();
  const day = date ? parseDay(date) : null;
  if (date && !day) {
    return { status: "error", message: "essa data não existe. use dd/mm/aaaa." };
  }
  if (comment.length > MAX_COMMENT) {
    return { status: "error", message: `comentário passa de ${MAX_COMMENT} caracteres.` };
  }

  const { error } = await supabase
    .from(table)
    .update({ gallery_date: day, gallery_comment: comment || null })
    .eq("id", id);
  if (error) return { status: "error", message: error.message };
  refresh();
  return { status: "saved" };
}

export async function deleteFile(id: string) {
  const { supabase } = await requireOwner(`/view/${id}`);
  const { data: file } = await supabase.from("files").select("path, thumb_path, preview_path").eq("id", id).single();
  if (file) {
    // Row first: if it fails nothing changed; if storage then fails, only unlisted objects remain.
    const { error } = await supabase.from("files").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await deleteObjects(
      [file.path, file.thumb_path, file.preview_path].filter((path): path is string => Boolean(path)),
    );
  }
  redirect("/view");
}

// ---------------------------------------------------------------------------
// Spotify songs: their own rows in the tracks table, shown in /gallery next to the photos
// ---------------------------------------------------------------------------

export type AddTrackState = { status: "idle" | "added" | "error"; message?: string; id?: string };

/** Adds the song behind a pasted Spotify link, straight into /gallery. */
export async function addTrack(_previous: AddTrackState, formData: FormData): Promise<AddTrackState> {
  const { supabase } = await requireOwner("/drop");
  const link = String(formData.get("spotify_link") ?? "").trim();
  if (!link) return { status: "error", message: "cole um link de música do spotify." };
  const trackId = parseTrackId(link);
  if (!trackId) return { status: "error", message: "isso não é um link de música do spotify." };

  const { data: existing } = await supabase.from("tracks").select("name").eq("spotify_id", trackId).limit(1);
  if (existing?.length) return { status: "error", message: `essa música já está aqui: ${existing[0].name}.` };

  let track;
  try {
    track = await getTrack(trackId);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "erro ao buscar a música." };
  }

  const { data: added, error } = await supabase.from("tracks").insert({
    spotify_id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    year: track.year,
    cover: track.cover,
    duration_ms: track.duration_ms,
    in_gallery: true,
    gallery_date: wantsToday(formData) ? todaySaoPaulo() : null,
  }).select("id").single();
  // 23505: the unique index caught a song added at the same moment from somewhere else.
  if (error?.code === "23505") return { status: "error", message: "essa música já está aqui." };
  if (error) return { status: "error", message: error.message };
  refresh();
  return { status: "added", message: `adicionada: ${track.name} — ${track.artists.join(", ")}`, id: added.id };
}

export async function setTrackInGallery(id: string, inGallery: boolean, formData?: FormData) {
  await setGallery("tracks", id, inGallery, formData);
}

export async function deleteTrack(id: string) {
  const { supabase } = await requireOwner(`/view/musica/${id}`);
  const { error } = await supabase.from("tracks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/view");
}
