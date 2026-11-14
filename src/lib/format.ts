export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

/** Today's calendar day in São Paulo as "2026-11-13", the form gallery_date is stored in. */
export function todaySaoPaulo() {
  // en-CA formats dates as yyyy-mm-dd.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** A calendar date ("2026-11-13") with no time or zone, shown as dd/mm/aaaa. */
export function formatDay(isoDay: string) {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export type FileKind = "image" | "video" | "audio" | "pdf" | "text" | "other";

export function fileKind(mime: string): FileKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json") return "text";
  return "other";
}

/** Filters shown on /view, in order; the label is what the file grid tile shows too. */
export const FILTERS = [
  { value: "all", label: "todos" },
  { value: "image", label: "img" },
  { value: "video", label: "vid" },
  { value: "audio", label: "aud" },
  { value: "pdf", label: "pdf" },
  { value: "text", label: "txt" },
  { value: "other", label: "file" },
  { value: "music", label: "spt" }, // Spotify songs: rows in the tracks table, not uploads
] as const satisfies readonly { value: FileKind | "all" | "music"; label: string }[];

export type FileFilter = (typeof FILTERS)[number]["value"];

/** Reads ?tipo=; anything unknown means "all". */
export function parseFilter(value: string | null | undefined): FileFilter {
  return FILTERS.find((filter) => filter.value === value)?.value ?? "all";
}
