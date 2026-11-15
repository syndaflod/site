"use client";

/*
 * storage: the R2 bucket, type by type, drawn like a CI run. While the usage query answers the
 * status spins; then each file type scans in turn, spinning while it runs and filling its
 * bar at an uneven pace to its share of what's stored, and the total bar fills against the
 * plan's quota as they finish. It plays once per visit to /view and then holds.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FILTERS, formatBytes, type FileKind } from "@/lib/format";
import { getStorageUsage, type StorageUsage } from "./view/actions";

const COLS = 34;
const ROWS = 11;
const FPS = 12;
const BAR = 12;
const TOTAL_BAR = 24;
const SPIN = "|/-\\";
const QUEUED = 0.35; // a beat after the answer before the first type starts
// Uploaded file types only: songs are links, they take no storage.
const KINDS = FILTERS.filter(
  (filter): filter is Extract<(typeof FILTERS)[number], { value: FileKind }> =>
    filter.value !== "all" && filter.value !== "music",
);

// A bar moves in steps, as real work does: quick, a stall, quick again.
function pace(f: number, seed: number) {
  const a = 0.3 + 0.25 * ((seed * 0.618) % 1);
  return f < a ? (f / a) * 0.55 : f < a + 0.2 ? 0.55 + ((f - a) / 0.2) * 0.05 : 0.6 + ((f - a - 0.2) / (0.8 - a)) * 0.4;
}

// When each type scans, in seconds after the answer: bigger types take longer, empty ones blink by.
function layout(usage: StorageUsage) {
  let at = QUEUED;
  const spans = KINDS.map(({ value }) => {
    const { bytes, count } = usage.kinds[value];
    const take = count ? 0.3 + 0.7 * (usage.bytes ? bytes / usage.bytes : 0) : 0.12;
    const span = [at, at + take] as const;
    at += take;
    return span;
  });
  return { spans, end: at };
}

type State = { usage: StorageUsage } | { error: string } | null;

/** The panel's text, `t` seconds after mount; `arrived` is when the answer came. */
function frame(state: State, t: number, arrived: number) {
  const grid = Array.from({ length: ROWS }, () => new Array<string>(COLS).fill(" "));
  const text = (r: number, c: number, s: string) => {
    for (let i = 0; i < s.length && c + i < COLS - 1; i++) grid[r][c + i] = s[i];
  };
  for (let c = 1; c < COLS - 1; c++) grid[0][c] = grid[ROWS - 1][c] = "─";
  for (let r = 1; r < ROWS - 1; r++) grid[r][0] = grid[r][COLS - 1] = "│";
  grid[0][0] = "╭";
  grid[0][COLS - 1] = "╮";
  grid[ROWS - 1][0] = "╰";
  grid[ROWS - 1][COLS - 1] = "╯";
  text(0, 2, " storage · drop ");

  const spin = SPIN[Math.floor(t * 8) % 4];
  const usage = state && "usage" in state ? state.usage : null;
  const p = t - arrived;
  const plan = usage ? layout(usage) : null;
  let live = -1;
  let shownBytes = 0;

  KINDS.forEach(({ value, label }, i) => {
    const r = 1 + i;
    text(r, 4, label);
    const kind = usage?.kinds[value];
    const span = plan?.spans[i];
    if (!kind || !span || p < span[0]) {
      text(r, 2, "·");
      text(r, 9, "·".repeat(BAR));
      text(r, 22, (state && "error" in state ? "-" : "queued").padStart(10));
      return;
    }
    const f = Math.max(0, Math.min(1, (p - span[0]) / (span[1] - span[0])));
    const share = usage.bytes ? kind.bytes / usage.bytes : 0;
    const shown = f < 1 ? pace(f, i + 1) : 1;
    shownBytes += kind.bytes * shown;
    if (!kind.count) {
      text(r, 2, f < 1 ? spin : "-");
      text(r, 9, "·".repeat(BAR));
      text(r, 22, (f < 1 ? "scanning" : "empty").padStart(10));
      if (f < 1) live = i;
      return;
    }
    const k = Math.max(f > 0 ? 1 : 0, Math.round(shown * share * BAR));
    text(r, 9, "█".repeat(k) + "░".repeat(BAR - k));
    text(r, 22, formatBytes(Math.round(kind.bytes * shown)).padStart(10));
    if (f < 1) {
      live = i;
      text(r, 2, spin);
    } else {
      text(r, 2, "+");
    }
  });

  const quota = usage?.quota ?? 1;
  const k = Math.min(TOTAL_BAR, Math.round((shownBytes / quota) * TOTAL_BAR));
  text(8, 2, (usage && shownBytes > 0 ? "█".repeat(Math.max(1, k)) : "").padEnd(TOTAL_BAR, "░"));
  text(8, 27, `${Math.round((shownBytes / quota) * 100)}%`.padStart(4));

  let status: string;
  if (state && "error" in state) status = `x failed · ${state.error}`;
  else if (!usage || p < QUEUED) status = `${spin} waiting for r2`;
  else if (live >= 0) status = `scanning · ${live + 1} of ${KINDS.length}`;
  else status = `${formatBytes(usage.bytes)} of ${formatBytes(usage.quota)} · ${usage.count} files`;
  text(9, 2, status);

  return grid.map((row) => row.join(""));
}

// One cell per character on a fixed 1ch grid, so a glyph the font lacks (box drawing, blocks)
// can't fall back to a wider font and push the right border out of line. Bar cells are drawn
// as blocks of color rather than █/░ for the same reason.
function Cell({ char }: { char: string }) {
  if (char === "█") return <span className="storage-cell is-fill" />;
  if (char === "░") return <span className="storage-cell is-empty" />;
  return <span className="storage-cell">{char}</span>;
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function StoragePanel() {
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const [state, setState] = useState<State>(null);
  const [arrived, setArrived] = useState(0);
  const [t, setT] = useState(0);
  const mounted = useRef(0);

  // Ask once per mount; the panel mounts each time /view opens, so uploads and deletes show up.
  useEffect(() => {
    mounted.current = performance.now();
    let cancelled = false;
    const settle = (next: State) => {
      if (cancelled) return;
      setArrived((performance.now() - mounted.current) / 1000);
      setState(next);
    };
    getStorageUsage().then(
      (usage) => settle({ usage }),
      (error: unknown) => settle({ error: error instanceof Error ? error.message : "erro" }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Ticks at the animation's frame rate until the last type has finished, then stops.
  useEffect(() => {
    if (reduced) return;
    const end = state && "usage" in state ? arrived + layout(state.usage).end + 0.1 : state ? arrived : Infinity;
    let id = 0;
    let last = 0;
    const step = (now: number) => {
      const seconds = (now - mounted.current) / 1000;
      if (now - last >= 1000 / FPS || seconds > end) {
        last = now;
        setT(seconds);
      }
      if (seconds <= end) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [reduced, state, arrived]);

  const rows = frame(state, reduced && state ? Infinity : t, arrived);
  const usage = state && "usage" in state ? state.usage : null;

  return (
    <aside className="storage-panel" aria-label="armazenamento">
      <p className="sr-only" role="status">
        {usage
          ? `${formatBytes(usage.bytes)} de ${formatBytes(usage.quota)} usados, ${usage.count} arquivos`
          : state
            ? "não foi possível carregar o armazenamento"
            : "carregando armazenamento"}
      </p>
      <div className="storage-grid" aria-hidden="true" style={{ "--cols": COLS } as React.CSSProperties}>
        {rows.flatMap((row, r) => [...row].map((char, c) => <Cell key={r * COLS + c} char={char} />))}
      </div>
    </aside>
  );
}
