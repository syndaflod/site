"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/browser";
import { MAX_FILE_BYTES } from "@/lib/storage-limits";
import { formatBytes, todaySaoPaulo } from "@/lib/format";
import { makeVariants, type ImageVariant } from "@/lib/image-variants";
import { stripMetadata } from "@/lib/strip-metadata";
import { randomName, storageName } from "@/lib/file-names";
import { AddTrack } from "./add-track";
import { discardUploads, signUploads } from "./actions";

type Item = {
  key: string;
  name: string;
  size: number;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
  fileId?: string;
  note?: string;
};

// todayDate: every upload and song gets today's date (São Paulo) as its gallery date.
type Options = { stripMetadata: boolean; randomName: boolean; todayDate: boolean };

const OPTIONS_KEY = "drop-options";
const DEFAULT_OPTIONS: Options = { stripMetadata: true, randomName: false, todayDate: true };

/* Upload options live outside React so addFiles (registered once on window) reads the
   current choice, and are remembered per browser. */
let currentOptions: Options | null = null;
const optionListeners = new Set<() => void>();

function getOptions(): Options {
  if (!currentOptions) {
    currentOptions = DEFAULT_OPTIONS;
    try {
      const saved = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "null") as Partial<Options> | null;
      if (saved) currentOptions = { ...DEFAULT_OPTIONS, ...saved };
    } catch {
      // No storage (private window): keep the defaults.
    }
  }
  return currentOptions;
}

function setOption(name: keyof Options, value: boolean) {
  currentOptions = { ...getOptions(), [name]: value };
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(currentOptions));
  } catch {
    // Not saved; the choice still applies until the page reloads.
  }
  optionListeners.forEach((listener) => listener());
}

function subscribeOptions(listener: () => void) {
  optionListeners.add(listener);
  return () => {
    optionListeners.delete(listener);
  };
}

// Stored objects never change (new uuid folder per upload), so browsers may keep them a year.
const CACHE_SECONDS = 31536000;

/**
 * PUT to a presigned R2 URL with XHR, because fetch can't report upload progress. R2 stores the
 * content-type and cache-control sent here and serves them back on every GET.
 */
function putWithProgress(url: string, file: Blob, onProgress: (ratio: number) => void = () => {}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("cache-control", `private, max-age=${CACHE_SECONDS}, immutable`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload falhou (${xhr.status})`));
    xhr.onerror = () => reject(new Error("sem conexão"));
    xhr.send(file);
  });
}

export function Dropzone() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const queue = useRef(Promise.resolve());
  const inputRef = useRef<HTMLInputElement>(null);
  const options = useSyncExternalStore(subscribeOptions, getOptions, () => DEFAULT_OPTIONS);

  const update = useCallback((key: string, patch: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const uploadOne = useCallback(
    async (original: File, key: string, opts: Options) => {
      if (original.size > MAX_FILE_BYTES) {
        update(key, { status: "error", error: `maior que ${formatBytes(MAX_FILE_BYTES)}` });
        return;
      }

      let file = original;
      if (opts.stripMetadata) {
        const result = await stripMetadata(original).catch(() => ({ file: original, stripped: false }));
        file = result.file;
        // Only warn for kinds that usually carry location or device data (HEIC, video, PDF…).
        const mayHaveMetadata = /^(image|video|audio)\/|^application\/pdf$/.test(original.type);
        update(key, {
          size: file.size,
          note: result.stripped ? "sem metadados" : mayHaveMetadata ? "metadados mantidos" : undefined,
        });
      }
      if (opts.randomName) {
        file = new File([file], randomName(original.name), { type: file.type });
        update(key, { name: file.name });
      }

      const supabase = createClient();
      const folder = crypto.randomUUID();
      const mainName = storageName(file.name);
      const path = `${folder}/${mainName}`;
      // Names inside the folder, for discardUploads if the row can't be saved.
      const uploaded: string[] = [];
      update(key, { status: "uploading" });

      // Resizing (or grabbing a video's cover frame) runs while the original uploads; a failure
      // here only means no smaller copies.
      const variantsPromise = makeVariants(file).catch(() => null);

      /**
       * Variants are a speed-up, not the file itself: a failed one is just left out. Both are
       * signed in one server action, so an image costs two round trips to sign, not three.
       */
      const uploadVariants = async (list: { name: string; variant: ImageVariant | null }[]) => {
        const wanted = list.flatMap(({ name, variant }) =>
          variant ? [{ name: `_v/${name}.${variant.ext}`, blob: variant.blob }] : [],
        );
        if (wanted.length === 0) return list.map(() => null);
        let signed: { key: string; url: string }[];
        try {
          signed = await signUploads(folder, wanted.map((entry) => entry.name));
        } catch {
          return list.map(() => null);
        }
        const done = new Set<string>();
        await Promise.all(
          wanted.map(async (entry, index) => {
            try {
              await putWithProgress(signed[index].url, entry.blob);
              uploaded.push(entry.name);
              done.add(entry.name);
            } catch {
              // Left out; the original still uploads.
            }
          }),
        );
        return list.map(({ name, variant }) => {
          const variantName = variant ? `_v/${name}.${variant.ext}` : null;
          return variantName && done.has(variantName) ? `${folder}/${variantName}` : null;
        });
      };

      try {
        const [signed] = await signUploads(folder, [mainName]);
        await putWithProgress(signed.url, file, (progress) => update(key, { progress }));
        uploaded.push(mainName);

        const variants = await variantsPromise;
        const [thumbPath, previewPath] = await uploadVariants([
          { name: "thumb", variant: variants?.thumb ?? null },
          { name: "preview", variant: variants?.preview ?? null },
        ]);

        const { data: row, error: insertError } = await supabase
          .from("files")
          .insert({
            path,
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: file.size,
            thumb_path: thumbPath,
            preview_path: previewPath,
            width: variants?.width ?? null,
            height: variants?.height ?? null,
            gallery_date: opts.todayDate ? todaySaoPaulo() : null,
          })
          .select("id")
          .single();

        if (insertError || !row) {
          await discardUploads(folder, uploaded).catch(() => {});
          throw insertError ?? new Error("não salvou");
        }

        update(key, { status: "done", progress: 1, fileId: row.id });
      } catch (error) {
        update(key, {
          status: "error",
          error: error instanceof Error ? error.message : "erro desconhecido",
        });
      }
    },
    [update],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const added = list.map((file) => ({
        file,
        item: {
          key: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          progress: 0,
          status: "waiting" as const,
        },
      }));

      setItems((current) => [...added.map(({ item }) => item), ...current]);
      // The options in place when the files arrive apply to them, even if toggled mid-queue.
      const opts = getOptions();
      // One upload at a time keeps phones on weak connections from stalling every file.
      for (const { file, item } of added) {
        queue.current = queue.current
          .then(() => uploadOne(file, item.key, opts))
          // A failure outside uploadOne's own handling must not stall the files behind it.
          .catch((error: unknown) => {
            update(item.key, {
              status: "error",
              error: error instanceof Error ? error.message : "erro desconhecido",
            });
          });
      }
    },
    [update, uploadOne],
  );

  // Accept drops and pastes anywhere on the page, not only on the box.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;

    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      if (event.dataTransfer) addFiles(event.dataTransfer.files);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (event.clipboardData?.files.length) addFiles(event.clipboardData.files);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [addFiles]);

  return (
    <section aria-label="enviar arquivos">
      <div className="drop-options">
        <label className="drop-option">
          <input
            type="checkbox"
            checked={options.stripMetadata}
            onChange={(event) => setOption("stripMetadata", event.target.checked)}
          />
          <span>remover metadados</span>
          <span className="cli-dim">jpg · png · webp</span>
        </label>
        <label className="drop-option">
          <input
            type="checkbox"
            checked={options.randomName}
            onChange={(event) => setOption("randomName", event.target.checked)}
          />
          <span>nome aleatório</span>
        </label>
        <label className="drop-option">
          <input
            type="checkbox"
            checked={options.todayDate}
            onChange={(event) => setOption("todayDate", event.target.checked)}
          />
          <span>data de hoje</span>
        </label>
      </div>

      <button
        type="button"
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <span className="cli-acc cli-b">{dragging ? "solta aqui" : "arraste arquivos para cá"}</span>
        <span className="cli-dim">ou toque para escolher · ctrl+v cola · até {formatBytes(MAX_FILE_BYTES)}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <AddTrack autoDate={options.todayDate} />

      {items.length > 0 && (
        <ul className="drop-list">
          {items.map((item) => (
            <li key={item.key} className={`drop-item is-${item.status}`}>
              <div className="drop-item-row">
                <span className="drop-item-name">{item.name}</span>
                <span className="cli-dim">
                  {item.status === "done" && item.fileId ? (
                    <Link href={`/view/${item.fileId}`}>abrir</Link>
                  ) : item.status === "error" ? (
                    item.error
                  ) : item.status === "waiting" ? (
                    "na fila"
                  ) : (
                    `${Math.round(item.progress * 100)}%`
                  )}
                </span>
              </div>
              <div className="drop-progress" aria-hidden="true">
                <span style={{ transform: `scaleX(${item.progress})` }} />
              </div>
              <span className="cli-dim drop-item-size">
                {formatBytes(item.size)}
                {item.note && ` · ${item.note}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
