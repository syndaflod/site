import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2";
import { fileKind } from "@/lib/format";
import { LINK_PREVIEW_BOTS } from "@/lib/link-preview-bots";

export const SHARE_TOKEN = /^[A-Za-z0-9_-]{22}$/;

// Each visit gets a fresh R2 link that lasts at most this long (or until the share ends, if
// sooner), so a copied R2 link stops working soon after the share is revoked or expires.
const LINK_SECONDS = 60 * 60;

/** Link-preview crawlers get an HTML page with Open Graph tags; everyone else goes to the file. */
export const isLinkPreviewBot = (userAgent: string | null) => !!userAgent && LINK_PREVIEW_BOTS.test(userAgent);

export type SharedFile = {
  path: string;
  name: string;
  mime: string;
  // Older versions of the shared_file() function in supabase/schema.sql don't return these.
  size?: number | null;
  preview_path?: string | null;
  width?: number | null;
  height?: number | null;
  expires_at: string | null;
};

/** The file behind a share token, or null when the token is unknown, expired or revoked. */
export const sharedFile = cache(async (token: string): Promise<SharedFile | null> => {
  if (!SHARE_TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shared_file", { share_token: token });
  if (error) throw new Error(`erro ao abrir o link: ${error.message}`);
  return (data as SharedFile[] | null)?.[0] ?? null;
});

/**
 * The picture an embed card shows: an image's resized copy (animated GIFs keep the original, which
 * the resize would freeze) or a video's cover frame. Null for anything else.
 */
export function coverPath(file: SharedFile) {
  const kind = fileKind(file.mime);
  if (kind === "image") return (file.mime !== "image/gif" && file.preview_path) || file.path;
  if (kind === "video") return file.preview_path ?? null;
  return null;
}

/** A presigned R2 URL for one of the shared file's objects, valid while the share is. */
export function signShared(file: SharedFile, path: string) {
  const left = file.expires_at ? Math.floor((Date.parse(file.expires_at) - Date.now()) / 1000) : LINK_SECONDS;
  return presignGet(path, Math.max(1, Math.min(LINK_SECONDS, left)));
}
