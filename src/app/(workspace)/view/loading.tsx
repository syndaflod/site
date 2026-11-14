// Same grid as /view, filled with placeholder cards while the file list loads.
const NAME_WIDTHS = ["72%", "55%", "84%", "63%", "78%", "48%", "68%", "58%"];

export default function ViewLoading() {
  return (
    <main className="cli-root private-root" aria-busy="true">
      <div className="cli-col">
        <p className="sr-only" role="status">carregando arquivos…</p>
        <ul className="file-grid" aria-hidden="true">
          {NAME_WIDTHS.map((width, index) => (
            <li key={index} className="file-card">
              <span className="file-thumb skeleton" />
              <span className="skeleton skeleton-line" style={{ width }} />
              <span className="file-card-meta skeleton skeleton-line" style={{ width: "62%" }} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
