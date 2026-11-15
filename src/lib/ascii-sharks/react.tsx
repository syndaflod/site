/**
 * The background canvas. The engine is not imported here: public/ocean/boot.js
 * (built from boot.ts) attaches to this canvas before React hydrates.
 * Glyphs come from the canvas's font-family, so give it (or a parent) a monospace font.
 */
export function AsciiOcean({ className }: { className?: string }) {
  return <canvas aria-hidden="true" className={`ascii-ocean ${className ?? ""}`} suppressHydrationWarning />;
}
