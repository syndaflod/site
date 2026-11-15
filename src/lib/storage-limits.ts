// File bytes live in Cloudflare R2 (src/lib/r2.ts); these limits are shared with the browser.

/**
 * Per file. R2 takes up to 5 GB in one PUT; 1 GB keeps phone uploads from running for hours.
 * Only the browser checks it: a presigned PUT can't cap its own size.
 */
export const MAX_FILE_BYTES = 1024 * 1024 * 1024;

/** Storage included in R2's free tier; the /view storage panel measures against it. */
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
