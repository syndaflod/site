// Read with literal names so Next can inline them into the browser bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function supabaseEnv() {
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return { url, key };
}

export const DROP_BUCKET = "drop";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** Storage included in Supabase's free plan; the /view storage panel measures against it. */
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;
