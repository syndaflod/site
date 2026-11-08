import type { TitleBannerArt, TitleTone } from "./title-banners";

// Cells use the 1:2 proportion of the terminal fonts this art was drawn for.
const CELL_WIDTH = 6;
const CELL_HEIGHT = 12;

// Geist Mono has no block glyphs, and the fallback font's advance differs from the
// space's, which skews text rows. Drawing each cell as a shape keeps the grid exact.
const GLYPHS: Record<string, { x: number; y: number; w: number; h: number; opacity: number }> = {
  "█": { x: 0, y: 0, w: CELL_WIDTH, h: CELL_HEIGHT, opacity: 1 },
  "▀": { x: 0, y: 0, w: CELL_WIDTH, h: CELL_HEIGHT / 2, opacity: 1 },
  "▄": { x: 0, y: CELL_HEIGHT / 2, w: CELL_WIDTH, h: CELL_HEIGHT / 2, opacity: 1 },
  "▌": { x: 0, y: 0, w: CELL_WIDTH / 2, h: CELL_HEIGHT, opacity: 1 },
  "▐": { x: CELL_WIDTH / 2, y: 0, w: CELL_WIDTH / 2, h: CELL_HEIGHT, opacity: 1 },
  "░": { x: 0, y: 0, w: CELL_WIDTH, h: CELL_HEIGHT, opacity: 0.25 },
  "▒": { x: 0, y: 0, w: CELL_WIDTH, h: CELL_HEIGHT, opacity: 0.5 },
  "▓": { x: 0, y: 0, w: CELL_WIDTH, h: CELL_HEIGHT, opacity: 0.75 },
};

type Layer = { tone: TitleTone; opacity: number; path: string };

function rect(x: number, y: number, w: number, h: number) {
  return `M${x} ${y}h${w}v${h}h${-w}z`;
}

// Groups the cells into one path per color: backgrounds first, glyphs on top.
function buildLayers({ rows }: TitleBannerArt): Layer[] {
  const backgrounds = new Map<string, Layer>();
  const foregrounds = new Map<string, Layer>();
  const add = (layers: Map<string, Layer>, tone: TitleTone, opacity: number, path: string) => {
    const key = `${tone}/${opacity}`;
    const layer = layers.get(key);
    if (layer) layer.path += path;
    else layers.set(key, { tone, opacity, path });
  };

  rows.forEach((row, rowIndex) => {
    const y = rowIndex * CELL_HEIGHT;
    let column = 0;
    for (const [text, foreground, background] of row) {
      for (const char of text) {
        const x = column * CELL_WIDTH;
        if (background) add(backgrounds, background, 1, rect(x, y, CELL_WIDTH, CELL_HEIGHT));
        const glyph = GLYPHS[char];
        if (glyph && foreground) {
          add(foregrounds, foreground, glyph.opacity, rect(x + glyph.x, y + glyph.y, glyph.w, glyph.h));
        }
        column += 1;
      }
    }
  });

  return [...backgrounds.values(), ...foregrounds.values()];
}

export function TitleBanner({
  art,
  className,
  label,
}: {
  art: TitleBannerArt;
  className?: string;
  label: string;
}) {
  return (
    <header
      className={className ? `title-banner ${className}` : "title-banner"}
      role="img"
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${art.columns * CELL_WIDTH} ${art.rows.length * CELL_HEIGHT}`}
      >
        {buildLayers(art).map((layer, layerIndex) => (
          <path
            d={layer.path}
            fill={`var(--amber-${layer.tone})`}
            fillOpacity={layer.opacity}
            key={layerIndex}
          />
        ))}
      </svg>
    </header>
  );
}
