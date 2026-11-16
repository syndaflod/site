import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2";

export const metadata: Metadata = {
  title: "link",
  robots: { index: false, follow: false },
};

const TOKEN = /^[A-Za-z0-9_-]{22}$/;
// Each visit gets a fresh R2 link that lasts at most this long (or until the share ends, if
// sooner), so a copied R2 link stops working soon after the share is revoked or expires.
const LINK_SECONDS = 60 * 60;

/**
 * A shared file (see "compartilhar" on /view/[id]): looks the token up and sends the visitor to
 * the file itself, which the browser shows or plays. An unknown, expired or revoked token is a 404.
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shared_file", { share_token: token });
  if (error) throw new Error(`erro ao abrir o link: ${error.message}`);
  const file = (data as { path: string; expires_at: string | null }[] | null)?.[0];
  if (!file) notFound();

  const left = file.expires_at ? Math.floor((Date.parse(file.expires_at) - Date.now()) / 1000) : LINK_SECONDS;
  const url = await presignGet(file.path, Math.max(1, Math.min(LINK_SECONDS, left)));
  redirect(url);
}
