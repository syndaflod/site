// Same layout as a file view: title, details, the preview area and the action row.
export default function ViewFileLoading() {
  return (
    <main className="cli-root private-root is-fit" aria-busy="true">
      <div className="cli-col">
        <p className="sr-only" role="status">carregando arquivo…</p>
        <span className="file-title skeleton skeleton-line is-centered" style={{ width: "14rem" }} aria-hidden="true" />
        <span className="file-meta skeleton skeleton-line is-centered" style={{ width: "18rem" }} aria-hidden="true" />
        <div className="file-preview" aria-hidden="true">
          <div className="preview-frame">
            <span className="preview-skeleton is-fill" />
          </div>
        </div>
        <div className="file-actions" aria-hidden="true">
          {["6.5rem", "9rem", "9rem"].map((width, index) => (
            <span key={index} className="skeleton skeleton-line" style={{ width }} />
          ))}
        </div>
      </div>
    </main>
  );
}
