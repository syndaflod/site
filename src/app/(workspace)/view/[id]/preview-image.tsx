"use client";

import { useState } from "react";

type Props = { src: string; alt: string; width?: number | null; height?: number | null };

// The frame fills the space the page leaves for the preview, so nothing shifts when the image
// arrives. A skeleton shows until it has loaded, then the image fades in. When the dimensions
// were saved at upload the skeleton is an empty SVG of the image's size: as a replaced element
// it shrinks to fit the same way the image will, so it has the image's exact shape.
export function PreviewImage({ src, alt, width, height }: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className="preview-frame" data-state={state} aria-busy={state === "loading"}>
      {state === "loading" &&
        (width && height ? (
          <svg className="preview-skeleton" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />
        ) : (
          <span className="preview-skeleton is-fill" aria-hidden="true" />
        ))}
      {state === "error" ? (
        <p className="cli-dim">não foi possível carregar a imagem.</p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img
          // A cached image can finish before hydration, so check `complete` once it mounts.
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0) setState("loaded");
          }}
          src={src}
          alt={alt}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
        />
      )}
    </div>
  );
}
