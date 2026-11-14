// The dropzone's shape, so the page doesn't jump when the real one arrives.
export default function DropLoading() {
  return (
    <main className="cli-root private-root" aria-busy="true">
      <div className="cli-col">
        <p className="sr-only" role="status">carregando…</p>
        <span className="skeleton skeleton-dropzone" aria-hidden="true" />
      </div>
    </main>
  );
}
