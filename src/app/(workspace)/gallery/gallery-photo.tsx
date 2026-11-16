"use client";

import { useRef, useState } from "react";
import { PlayBadge } from "./play-badge";

type Props = {
  src: string; // resized copy shown in the grid (the original itself for videos)
  full: string; // original, shown when expanded
  alt: string;
  width: number | null;
  height: number | null;
  video?: boolean;
  poster?: string; // a video's cover frame, when one was made at upload
  children?: React.ReactNode; // caption, shown under the tile and in the expanded view
};

/**
 * A gallery tile that expands in place: clicking opens the original in a modal over the page,
 * at its own size or as large as the screen allows. For a photo the resized copy shows until
 * the original has loaded; a video plays there with its controls, and in the grid shows its
 * first frame, playing muted while the pointer is over it. Esc, the close button or a click
 * outside the media closes it. The link still points at the original, so a middle-click or
 * ctrl-click opens it in a new tab as before.
 */
export function GalleryPhoto({ src, full, alt, width, height, video = false, poster, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const show = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setOpen(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <a
        href={full}
        target="_blank"
        rel="noreferrer"
        onClick={show}
        aria-label={video ? `vídeo: ${alt}` : undefined}
        className={video ? "gallery-video" : undefined}
      >
        {video ? (
          <>
            <video
              // Without a cover, "#t=0.1" makes browsers draw the first frame instead of a blank
              // box; with one, nothing loads until the pointer is over it.
              src={poster ? src : `${src}#t=0.1`}
              poster={poster}
              width={width ?? undefined}
              height={height ?? undefined}
              muted
              loop
              playsInline
              preload={poster ? "none" : "metadata"}
              onPointerEnter={(event) => void event.currentTarget.play().catch(() => {})}
              onPointerLeave={(event) => event.currentTarget.pause()}
            />
            <PlayBadge />
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img
            src={src}
            alt={alt}
            // Known dimensions reserve each tile's height, so the columns don't jump.
            width={width ?? undefined}
            height={height ?? undefined}
            loading="lazy"
            decoding="async"
          />
        )}
      </a>
      {children}

      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={alt}
        onClose={() => setOpen(false)}
        // The dialog box is the whole screen; a click that lands on it, not on the
        // media or the caption, is a click outside it.
        onClick={(event) => {
          if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("lightbox-stage")) {
            close();
          }
        }}
      >
        <button type="button" className="lightbox-close" onClick={close}>
          × fechar
        </button>
        {open && (
          <div className="lightbox-stage">
            <div className="lightbox-frame">
              {video ? (
                // Unmounts when the dialog closes, which also stops playback.
                <video
                  className="lightbox-image"
                  data-loaded
                  src={full}
                  poster={poster}
                  width={width ?? undefined}
                  height={height ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  aria-label={alt}
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                  <img
                    className="lightbox-placeholder"
                    src={src}
                    alt=""
                    width={width ?? undefined}
                    height={height ?? undefined}
                    data-hidden={loaded || undefined}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                  <img
                    className="lightbox-image"
                    ref={(img) => {
                      if (img?.complete && img.naturalWidth > 0) setLoaded(true);
                    }}
                    src={full}
                    alt={alt}
                    width={width ?? undefined}
                    height={height ?? undefined}
                    decoding="async"
                    data-loaded={loaded || undefined}
                    onLoad={() => setLoaded(true)}
                  />
                </>
              )}
            </div>
            {children && <div className="lightbox-caption">{children}</div>}
          </div>
        )}
      </dialog>
    </>
  );
}
