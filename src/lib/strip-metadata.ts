/**
 * Removes metadata (EXIF, GPS, XMP, IPTC, comments, text chunks) from JPEG, PNG and WebP
 * images by editing the file bytes directly, so the image itself is never re-encoded.
 * Other file types come back unchanged with `stripped: false`.
 */
export type StripResult = { file: File; stripped: boolean };

type Stripper = (bytes: Uint8Array) => Uint8Array[];

export async function stripMetadata(file: File): Promise<StripResult> {
  // Sniff the header first so videos and archives are never read whole into memory.
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const strip: Stripper | null = isJpeg(head)
    ? stripJpeg
    : isPng(head)
      ? stripPng
      : isWebp(head)
        ? stripWebp
        : null;
  if (!strip) return { file, stripped: false };

  try {
    // The File takes the kept slices as-is, so the image is never copied a second time.
    const parts = strip(new Uint8Array(await file.arrayBuffer()));
    return { file: new File(parts as BlobPart[], file.name, { type: file.type }), stripped: true };
  } catch {
    return { file, stripped: false };
  }
}

function byteLength(parts: Uint8Array[]) {
  return parts.reduce((sum, part) => sum + part.length, 0);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/* ---------- JPEG ---------- */

function isJpeg(b: Uint8Array) {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

/**
 * Keeps only what decoding needs: APP0 (JFIF), APP2 ICC profile, APP14 (Adobe colour
 * transform) and the image segments. Drops every other APPn and COM, and anything after
 * EOI (phones append extra images and maker data there). Rotation lives in EXIF, so it
 * is written back as a one-tag EXIF block, or the photo would show up sideways.
 */
function stripJpeg(b: Uint8Array): Uint8Array[] {
  const kept: Uint8Array[] = [b.subarray(0, 2)];
  let orientation = 1;
  let i = 2;

  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error("bad jpeg marker");
    while (b[i] === 0xff) i += 1; // fill bytes
    const marker = b[i];
    const start = i - 1;
    i += 1;

    if (marker === 0xd9) {
      kept.push(new Uint8Array([0xff, 0xd9]));
      return insertOrientation(kept, orientation);
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      kept.push(new Uint8Array([0xff, marker]));
      continue;
    }

    if (i + 2 > b.length) throw new Error("truncated jpeg");
    const length = (b[i] << 8) | b[i + 1];
    const end = i + length;
    if (length < 2 || end > b.length) throw new Error("truncated jpeg");
    const payload = b.subarray(i + 2, end);

    if (marker === 0xda) {
      // Start of scan: copy the compressed data up to the next real marker.
      let j = end;
      while (j < b.length - 1) {
        if (b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7)) break;
        j += 1;
      }
      kept.push(b.subarray(start, j));
      i = j;
      continue;
    }

    const isApp = marker >= 0xe0 && marker <= 0xef;
    let keep = !isApp && marker !== 0xfe;
    if (marker === 0xe0) keep = true;
    if (marker === 0xe2 && ascii(payload, 0, 12) === "ICC_PROFILE\0") keep = true;
    if (marker === 0xee) keep = true;
    if (marker === 0xe1 && ascii(payload, 0, 6) === "Exif\0\0") {
      orientation = readOrientation(payload.subarray(6)) ?? orientation;
    }

    if (keep) kept.push(b.subarray(start, end));
    i = end;
  }

  throw new Error("jpeg without EOI");
}

function readOrientation(tiff: Uint8Array): number | null {
  if (tiff.length < 8) return null;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const order = ascii(tiff, 0, 2);
  if (order !== "II" && order !== "MM") return null;
  const little = order === "II";
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return null;
  const count = view.getUint16(ifd, little);
  for (let n = 0; n < count; n += 1) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > tiff.length) return null;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

function insertOrientation(kept: Uint8Array[], orientation: number) {
  if (orientation === 1) return kept;
  // APP1 "Exif\0\0" + big-endian TIFF with a single IFD entry: Orientation (0x0112), SHORT.
  const app1 = new Uint8Array([
    0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01,
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  // After SOI, and after JFIF APP0 when there is one.
  const at = kept[1]?.[1] === 0xe0 ? 2 : 1;
  return [...kept.slice(0, at), app1, ...kept.slice(at)];
}

/* ---------- PNG ---------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// Allowlist: chunks needed to draw the image (incl. colour and animation). Everything else,
// such as text, EXIF, timestamps, C2PA (caBX) and vendor chunks, is dropped.
const PNG_KEEP = new Set([
  "IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT",
  "cICP", "mDCV", "cLLI", "pHYs", "bKGD", "acTL", "fcTL", "fdAT",
]);

function isPng(b: Uint8Array) {
  return b.length > 8 && PNG_SIGNATURE.every((value, index) => b[index] === value);
}

function stripPng(b: Uint8Array): Uint8Array[] {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const kept: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;

  while (i + 12 <= b.length) {
    const length = view.getUint32(i);
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + length;
    if (end > b.length) throw new Error("truncated png");
    if (PNG_KEEP.has(type)) kept.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return kept;
  }

  throw new Error("png without IEND");
}

/* ---------- WebP ---------- */

function isWebp(b: Uint8Array) {
  return b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP";
}

// Allowlist: image, alpha, animation and colour profile. EXIF, XMP and unknown chunks are dropped.
const WEBP_KEEP = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"]);

function stripWebp(b: Uint8Array): Uint8Array[] {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const kept: Uint8Array[] = [];
  let i = 12;

  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const size = view.getUint32(i + 4, true);
    const end = i + 8 + size + (size % 2);
    if (i + 8 + size > b.length) throw new Error("truncated webp");

    if (type === "VP8X") {
      const chunk = b.slice(i, Math.min(end, b.length));
      chunk[8] &= ~(0x08 | 0x04); // clear the EXIF and XMP flags
      kept.push(chunk);
    } else if (WEBP_KEEP.has(type)) {
      kept.push(b.subarray(i, Math.min(end, b.length)));
    }
    i = end;
  }

  const header = b.slice(0, 12);
  new DataView(header.buffer).setUint32(4, byteLength(kept) + 4, true);
  return [header, ...kept];
}
