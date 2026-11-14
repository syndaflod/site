"use server";

import { requireOwner } from "@/lib/supabase/server";
import { deleteObjects, presignPut } from "@/lib/r2";

// Server Actions are public endpoints: every one checks the owner again.

const FOLDER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// What storageName() and the "_v/thumb.webp" variant names produce: no slashes, and never a
// bare "." or ".." (URLs would resolve those and point outside the folder).
const NAME = /^(_v\/)?[\w.-]{1,100}$/;
const DOTS = /(^|\/)\.{1,2}$/;

function checkFolder(folder: string, names: string[]) {
  if (!FOLDER.test(folder)) throw new Error("pasta inválida");
  if (names.length === 0 || names.length > 3 || names.some((name) => !NAME.test(name) || DOTS.test(name))) {
    throw new Error("nome inválido");
  }
  return names.map((name) => `${folder}/${name}`);
}

/** True when a saved row already uses this folder, so its objects must not be touched. */
async function folderTaken(supabase: Awaited<ReturnType<typeof requireOwner>>["supabase"], folder: string) {
  const { data, error } = await supabase.from("files").select("id").like("path", `${folder}/%`).limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/**
 * Presigned PUT URLs for the objects of one new upload. A PUT to R2 replaces whatever is at the
 * key, so folders that already belong to a saved file are refused (each upload picks a new uuid).
 */
export async function signUploads(folder: string, names: string[]) {
  const { supabase } = await requireOwner("/drop");
  const keys = checkFolder(folder, names);
  if (await folderTaken(supabase, folder)) throw new Error("pasta já usada");
  return Promise.all(keys.map(async (key) => ({ key, url: await presignPut(key) })));
}

/** Removes the objects of an upload whose row was never saved. */
export async function discardUploads(folder: string, names: string[]) {
  const { supabase } = await requireOwner("/drop");
  const keys = checkFolder(folder, names);
  if (await folderTaken(supabase, folder)) return;
  await deleteObjects(keys);
}
