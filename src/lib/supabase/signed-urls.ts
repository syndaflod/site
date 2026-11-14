import type { createClient } from "./server";
import { DROP_BUCKET } from "./env";

type Client = Awaited<ReturnType<typeof createClient>>;

// A signed URL gets a new token every time it's made, so the browser sees a "new" file on each
// visit and downloads it again. Reusing one URL per path for a few hours lets the browser cache
// (objects are uploaded with a one-year max-age) do its job.
const SIGN_SECONDS = 6 * 60 * 60;
const REUSE_MS = 5 * 60 * 60 * 1000; // leaves at least an hour on every URL handed out

const cache = new Map<string, { url: string; reuseUntil: number }>();

/**
 * Signed view URLs keyed by path. Only call it with paths from rows the caller's own query
 * returned: RLS has already decided they may see those objects, so sharing a URL made for an
 * earlier request for the same path gives nobody anything new.
 */
export async function signedUrls(supabase: Client, paths: string[]) {
  const now = Date.now();
  const urls = new Map<string, string>();
  const missing: string[] = [];

  for (const path of new Set(paths)) {
    const hit = cache.get(path);
    if (hit && hit.reuseUntil > now) urls.set(path, hit.url);
    else missing.push(path);
  }

  if (missing.length > 0) {
    const { data } = await supabase.storage.from(DROP_BUCKET).createSignedUrls(missing, SIGN_SECONDS);
    for (const entry of data ?? []) {
      if (!entry.path || !entry.signedUrl || entry.error) continue;
      urls.set(entry.path, entry.signedUrl);
      cache.set(entry.path, { url: entry.signedUrl, reuseUntil: now + REUSE_MS });
    }
  }

  if (cache.size > 2000) {
    for (const [path, entry] of cache) if (entry.reuseUntil <= now) cache.delete(path);
  }
  return urls;
}
