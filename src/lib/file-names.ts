/** Random name that keeps a plain extension, so the file still opens with the right app. */
export function randomName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? `${id}${ext}` : id;
}

/** Storage keys reject many characters; the original name is kept in the database row. */
export function storageName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-100) || "file";
}
