import "server-only";
import { presignGet } from "./r2";

// A presigned URL changes every time it's made, so the browser sees a "new" file on each visit
// and downloads it again. Reusing one URL per key for a few hours lets the browser cache
// (objects are uploaded with a one-year max-age) do its job.
const SIGN_SECONDS = 6 * 60 * 60;
const REUSE_MS = 5 * 60 * 60 * 1000; // leaves at least an hour on every URL handed out

const cache = new Map<string, { url: string; reuseUntil: number }>();

/**
 * View URLs keyed by storage key. R2 signs whatever it's asked to, so only call this with keys
 * from rows the caller's own Supabase query returned: RLS on the files table has already decided
 * they may see those objects (the owner sees everything, visitors only published gallery items).
 */
export async function signedUrls(paths: string[]) {
  const now = Date.now();
  const urls = new Map<string, string>();
  const missing: string[] = [];

  for (const path of new Set(paths)) {
    const hit = cache.get(path);
    if (hit && hit.reuseUntil > now) urls.set(path, hit.url);
    else missing.push(path);
  }

  // Signing is local (HMAC), so there's no network round trip to batch. A key that can't be
  // signed (say, R2 isn't configured) is left out, so pages skip that file instead of failing.
  await Promise.all(
    missing.map(async (path) => {
      try {
        const url = await presignGet(path, SIGN_SECONDS);
        urls.set(path, url);
        cache.set(path, { url, reuseUntil: now + REUSE_MS });
      } catch (error) {
        console.error(`signedUrls: ${path}: ${error instanceof Error ? error.message : error}`);
      }
    }),
  );

  if (cache.size > 2000) {
    for (const [path, entry] of cache) if (entry.reuseUntil <= now) cache.delete(path);
  }
  return urls;
}
