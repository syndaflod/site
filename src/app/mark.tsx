// The ◆ marker in front of headings, the 404 link and the active workspace menu item. Geist Mono
// has no ◆, so a fallback font would draw it at a size and width that change from one OS to the
// next; an SVG diamond in a one-character box looks the same everywhere.
export function Mark({ className = "cli-acc" }: { className?: string }) {
  return (
    <span className={`${className} mark`} aria-hidden="true">
      <svg viewBox="0 0 10 10">
        <path d="M5 0 10 5 5 10 0 5z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="cli-rule">
      <Mark />
      <span>{children}</span>
    </h2>
  );
}
