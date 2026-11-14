// Browser-only: makes the smaller copies of an image that the workspace and gallery show,
// so pages never pull a multi-megabyte original just to draw a thumbnail.

export type ImageVariant = { blob: Blob; ext: "webp" | "jpg" };

export type ImageVariants = {
  width: number;
  height: number;
  /** For grid tiles: the shorter side is at most THUMB_SHORT_EDGE. */
  thumb: ImageVariant | null;
  /** For the full view and the gallery: the longer side is at most PREVIEW_LONG_EDGE. */
  preview: ImageVariant | null;
};

const THUMB_SHORT_EDGE = 480;
const PREVIEW_LONG_EDGE = 2048;

// GIFs would lose their animation and SVGs are already small and sharp at any size.
const SKIP = new Set(["image/gif", "image/svg+xml"]);

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<ImageVariant | null> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  // Browsers that can't encode WebP (older Safari) silently return PNG, so check the type.
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await toBlob("image/jpeg");
  return jpeg ? { blob: jpeg, ext: "jpg" } : null;
}

function draw(bitmap: ImageBitmap, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Returns null when the file isn't an image this browser can decode (e.g. HEIC in Chrome). */
export async function makeImageVariants(file: File): Promise<ImageVariants | null> {
  if (!file.type.startsWith("image/") || SKIP.has(file.type)) return null;

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so phone photos aren't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    const { width, height } = bitmap;
    const variant = async (scale: number, quality: number) => {
      const canvas = draw(bitmap, Math.min(1, scale));
      const encoded = canvas ? await encode(canvas, quality) : null;
      // Not worth storing a "smaller" copy that came out bigger than the original.
      return encoded && encoded.blob.size < file.size ? encoded : null;
    };

    const thumb = await variant(THUMB_SHORT_EDGE / Math.min(width, height), 0.75);
    const preview = await variant(PREVIEW_LONG_EDGE / Math.max(width, height), 0.82);
    return { width, height, thumb, preview };
  } finally {
    bitmap.close();
  }
}
