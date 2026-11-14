import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, requireOwner } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2";
import { fileKind, formatBytes, formatDate } from "@/lib/format";
import { deleteFile, randomizeName, setInGallery } from "../actions";
import { signedUrls } from "@/lib/signed-urls";
import { PreviewImage } from "./preview-image";
import { GalleryDetails } from "../gallery-details";
import { TodayOption } from "../today-option";
import { ActionButton } from "./action-button";

export const metadata: Metadata = {
  title: "view",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TEXT_PREVIEW_BYTES = 512 * 1024;

/**
 * Storage serves text without a charset, so a browser frame decodes UTF-8 as Windows-1252
 * ("relação" → "relaÃ§Ã£o"). Decode on the server instead: UTF-8 first, Windows-1252 for
 * files that aren't valid UTF-8.
 */
async function readTextPreview(url: string) {
  const response = await fetch(url, {
    headers: { range: `bytes=0-${TEXT_PREVIEW_BYTES - 1}` },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const body = new Uint8Array(await response.arrayBuffer());
  // A server that ignores Range sends the whole file; only show the preview's worth of it.
  const bytes = body.subarray(0, TEXT_PREVIEW_BYTES);
  const truncated = response.status === 206 || body.length >= TEXT_PREVIEW_BYTES;
  let text: string;
  try {
    // stream: true keeps a character cut by the byte limit from counting as invalid.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: truncated });
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return { text: text.replace(/^﻿/, ""), truncated };
}

export default async function ViewFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // The owner check and the lookup run together; RLS returns nothing to non-owners anyway.
  const supabase = await createClient();
  const [, { data: file, error }] = await Promise.all([
    requireOwner(`/view/${id}`),
    supabase
      .from("files")
      .select(
        "id, path, preview_path, width, height, name, mime, size, in_gallery, gallery_date, gallery_comment, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);
  // A failed query (say, a column the database doesn't have yet) is an error, not a missing file.
  if (error) throw new Error(`erro ao carregar o arquivo: ${error.message}`);
  if (!file) notFound();

  const kind = fileKind(file.mime);
  // Images and videos can go in /gallery (the RLS policies in supabase/schema.sql match this).
  const galleryable = kind === "image" || kind === "video";
  // Images show the resized copy when there is one; "baixar" always gets the original.
  const viewPath = (kind === "image" && file.preview_path) || file.path;
  const [views, download] = await Promise.all([
    signedUrls(viewPath === file.path ? [viewPath] : [viewPath, file.path]),
    presignGet(file.path, 3600, file.name),
  ]);
  const src = views.get(viewPath);
  // "tamanho real" opens the original, not the resized preview.
  const fullSrc = views.get(file.path);
  const textPreview = src && kind === "text" ? await readTextPreview(src) : null;

  return (
    <main className={`cli-root private-root${kind === "image" && src ? " is-fit" : ""}`}>
      <div className="cli-col">

        <h1 className="cli-acc cli-b file-title">{file.name}</h1>
        <p className="cli-dim file-meta">
          {file.mime} · {formatBytes(file.size)} · {formatDate(file.created_at)}
        </p>

        <div className="file-preview">
          {!src ? (
            <p className="cli-dim">não foi possível gerar o link do arquivo.</p>
          ) : kind === "image" ? (
            <PreviewImage src={src} alt={file.name} width={file.width} height={file.height} />
          ) : kind === "video" ? (
            <video src={src} controls playsInline preload="metadata" />
          ) : kind === "audio" ? (
            <audio src={src} controls preload="metadata" />
          ) : kind === "pdf" ? (
            <iframe src={src} title={file.name} />
          ) : kind === "text" ? (
            textPreview ? (
              <>
                <pre className="file-text">{textPreview.text}</pre>
                {textPreview.truncated && (
                  <p className="cli-dim">prévia cortada nos primeiros {formatBytes(TEXT_PREVIEW_BYTES)}.</p>
                )}
              </>
            ) : (
              <p className="cli-dim">não foi possível ler o arquivo.</p>
            )
          ) : (
            <p className="cli-dim">sem prévia para esse tipo de arquivo.</p>
          )}
        </div>

        {galleryable && file.in_gallery && (
          <GalleryDetails id={file.id} date={file.gallery_date} comment={file.gallery_comment} />
        )}

        <div className="file-actions">
          {kind === "image" && fullSrc && (
            <a href={fullSrc} target="_blank" rel="noopener noreferrer">tamanho real</a>
          )}
          <a href={download}>baixar</a>
          {galleryable && (
            <form action={setInGallery.bind(null, file.id, !file.in_gallery)} className="gallery-toggle">
              <button type="submit" className="cli-button">
                {file.in_gallery ? "tirar da gallery" : "pôr na gallery"}
              </button>
              {!file.in_gallery && <TodayOption />}
            </form>
          )}
          <ActionButton action={randomizeName.bind(null, file.id)}>nome aleatório</ActionButton>
          <form action={deleteFile.bind(null, file.id)}>
            <button type="submit" className="cli-button is-danger">apagar</button>
          </form>
        </div>
      </div>
    </main>
  );
}
