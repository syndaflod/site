import { coverPath, sharedFile, signShared } from "@/lib/shares";

/**
 * Stable addresses for a shared file's bytes, used by the embed card on /s/[token]:
 * /s/[token]/file is the file itself and /s/[token]/cover the picture the card shows.
 * Each request signs a fresh R2 link, so an app that fetches the card again later (Discord does)
 * still gets the media for as long as the share lasts, and nothing once it ends.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; part: string }> }) {
  const { token, part } = await params;
  if (part !== "file" && part !== "cover") return new Response("not found", { status: 404 });

  const file = await sharedFile(token);
  const path = file && (part === "file" ? file.path : coverPath(file));
  if (!file || !path) return new Response("not found", { status: 404 });

  return new Response(null, {
    status: 307,
    // The signed URL changes on every request; caches must come back here instead of reusing one.
    headers: { location: await signShared(file, path), "cache-control": "no-store" },
  });
}
