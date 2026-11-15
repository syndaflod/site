import "server-only";
import { AwsClient } from "aws4fetch";

// Cloudflare R2 holds the bytes of every upload; Supabase keeps the rows (and RLS on them).
// R2 has no idea who is signed in, so these keys never reach the browser: the server checks the
// owner (or that the row came back from an RLS-filtered query) and hands out presigned URLs.

let client: { aws: AwsClient; base: string } | null = null;

function r2() {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET (see .env.example).");
  }
  client = {
    aws: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
    base: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
  };
  return client;
}

/** Keys are "<uuid>/<name>" or "<uuid>/_v/<variant>"; each segment is encoded on its own. */
function objectUrl(key: string) {
  return new URL(`${r2().base}/${key.split("/").map(encodeURIComponent).join("/")}`);
}

/** A URL anyone holding it can use for `method` until it expires (at most 7 days). */
async function presign(key: string, method: "GET" | "PUT", seconds: number, query: Record<string, string> = {}) {
  const url = objectUrl(key);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  url.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await r2().aws.sign(url, { method, aws: { signQuery: true } });
  return signed.url;
}

/** Content-Disposition that keeps any file name: an ASCII fallback, then the exact UTF-8 name. */
function attachment(name: string) {
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // "ção" → "cao", not "c_a_o"
    .replace(/[^\x20-\x7e]|["\\]/g, "_");
  // RFC 5987 attr-chars: encodeURIComponent leaves ' ( ) * as is, and those aren't allowed.
  const exact = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${exact}`;
}

export function presignGet(key: string, seconds: number, downloadName?: string) {
  return presign(
    key,
    "GET",
    seconds,
    downloadName ? { "response-content-disposition": attachment(downloadName) } : {},
  );
}

/** The browser PUTs the file straight to R2 with this, so uploads never pass through Vercel. */
export function presignPut(key: string, seconds = 15 * 60) {
  return presign(key, "PUT", seconds);
}

async function send(key: string, init: RequestInit & { headers?: Record<string, string> }) {
  const response = await r2().aws.fetch(objectUrl(key), init);
  // 404 on delete means it's already gone, which is what was asked for.
  if (!response.ok && !(init.method === "DELETE" && response.status === 404)) {
    throw new Error(`R2 ${init.method} ${key} falhou (${response.status})`);
  }
  return response;
}

export async function deleteObjects(keys: string[]) {
  await Promise.all(keys.map((key) => send(key, { method: "DELETE" })));
}

/** R2, like S3, has no rename: copy to the new key, then delete the old one. */
export async function moveObject(from: string, to: string) {
  await send(to, {
    method: "PUT",
    headers: { "x-amz-copy-source": `/${process.env.R2_BUCKET}/${from.split("/").map(encodeURIComponent).join("/")}` },
  });
  await send(from, { method: "DELETE" });
}
