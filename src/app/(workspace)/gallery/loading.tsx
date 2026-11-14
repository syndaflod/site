// The real heading plus columns of photo-shaped blocks, in mixed aspect ratios like real photos.
const RATIOS = ["4 / 5", "3 / 2", "1", "3 / 4", "16 / 9", "4 / 3", "2 / 3", "3 / 2", "5 / 4"];

export default function GalleryLoading() {
  return (
    <main className="cli-root" aria-busy="true">
      <div className="cli-col">
        <h1 className="cli-rule">
          <span className="cli-acc" aria-hidden="true">&gt;</span>
          <span>gallery</span>
        </h1>
        <p className="sr-only" role="status">carregando fotos…</p>
        <ul className="gallery-grid" aria-hidden="true">
          {RATIOS.map((ratio, index) => (
            <li key={index}>
              <span className="skeleton" style={{ aspectRatio: ratio }} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
