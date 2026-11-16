// A small play mark centered over a video's or song's cover, so those tiles read as playable.
export function PlayBadge() {
  return (
    <span className="gallery-play" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="24" height="24">
        <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />
      </svg>
    </span>
  );
}
