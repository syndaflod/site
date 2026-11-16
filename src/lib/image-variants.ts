// Browser-only: makes the smaller copies of an image that the workspace and gallery show,
// so pages never pull a multi-megabyte original just to draw a thumbnail. For a video the
// copies are stills of one frame, used as its cover.

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

function draw(source: CanvasImageSource, width: number, height: number, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The thumb and preview of a picture already decoded (an image, or a frame of a video). */
async function variants(source: CanvasImageSource, width: number, height: number, maxBytes: number) {
  const variant = async (scale: number, quality: number) => {
    const canvas = draw(source, width, height, Math.min(1, scale));
    const encoded = canvas ? await encode(canvas, quality) : null;
    // Not worth storing a "smaller" copy that came out bigger than the original.
    return encoded && encoded.blob.size < maxBytes ? encoded : null;
  };

  const thumb = await variant(THUMB_SHORT_EDGE / Math.min(width, height), 0.75);
  const preview = await variant(PREVIEW_LONG_EDGE / Math.max(width, height), 0.82);
  return { width, height, thumb, preview };
}

async function imageVariants(file: File): Promise<ImageVariants | null> {
  if (SKIP.has(file.type)) return null;

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so phone photos aren't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    return await variants(bitmap, bitmap.width, bitmap.height, file.size);
  } finally {
    bitmap.close();
  }
}

// How long a video gets to load and seek before it's uploaded without a cover.
const VIDEO_TIMEOUT_MS = 15_000;

/** Waits for one of the element's events; rejects on "error" or after the timeout. */
function once(element: HTMLMediaElement, event: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const done = (error?: Error) => {
      element.removeEventListener(event, onEvent);
      element.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onEvent = () => done();
    const onError = () => done(new Error("video failed to load"));
    const onAbort = () => done(new Error("video timed out"));
    element.addEventListener(event, onEvent);
    element.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * A still from early in the video (1 second in, or a tenth of the way through a shorter one:
 * the very first frame is often black). Null when this browser can't play the file, like
 * HEVC in some browsers.
 */
async function videoVariants(file: File): Promise<ImageVariants | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  const signal = AbortSignal.timeout(VIDEO_TIMEOUT_MS);
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const loaded = once(video, "loadeddata", signal);
    video.src = url;
    // iOS Safari loads nothing for a video that hasn't played; a muted inline play is allowed
    // and starts the load. It's paused before the seek, so nothing runs past the still.
    void video.play().catch(() => {});
    await loaded;
    video.pause();
    const { videoWidth: width, videoHeight: height } = video;
    if (!width || !height) return null;

    const seeked = once(video, "seeked", signal);
    video.currentTime = Number.isFinite(video.duration) ? Math.min(1, video.duration / 10) : 0;
    await seeked;
    return await variants(video, width, height, file.size);
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/**
 * Smaller copies for an image, or cover stills for a video. Returns null for other files and
 * for ones this browser can't decode (e.g. HEIC in Chrome).
 */
export async function makeVariants(file: File): Promise<ImageVariants | null> {
  if (file.type.startsWith("image/")) return imageVariants(file);
  if (file.type.startsWith("video/")) return videoVariants(file);
  return null;
}
