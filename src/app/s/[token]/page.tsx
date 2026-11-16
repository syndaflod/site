import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { fileKind, formatBytes, formatDate, type FileKind } from "@/lib/format";
import { coverPath, isLinkPreviewBot, sharedFile, signShared } from "@/lib/shares";

type Props = { params: Promise<{ token: string }> };

const KIND_LABEL: Record<FileKind, string> = {
  image: "imagem",
  video: "vídeo",
  audio: "áudio",
  pdf: "pdf",
  text: "texto",
  other: "arquivo",
};

// The accent stripe on Discord's card (--amber-primary in globals.css).
export const viewport: Viewport = { themeColor: "#ffad24" };

/** This site's origin as the request reached it, since crawlers need absolute URLs. */
async function origin() {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost";
  const local = /^(localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  const proto = head.get("x-forwarded-proto")?.split(",")[0] ?? (local ? "http" : "https");
  return new URL(`${proto}://${host}`);
}

// Formats Discord and most other apps can play inline; anything else shows the cover alone.
const EMBEDDABLE_VIDEO = new Set(["video/mp4", "video/webm"]);

/**
 * The embed card: Discord, WhatsApp and the like read these tags. Media points at
 * /s/[token]/file and /s/[token]/cover, which keep working for as long as the share does.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  // People are redirected to the file and never see these tags; skip building them.
  if (!isLinkPreviewBot((await headers()).get("user-agent"))) return { robots: { index: false, follow: false } };

  const file = await sharedFile(token);
  if (!file) notFound();

  const kind = fileKind(file.mime);
  const description = [
    KIND_LABEL[kind],
    file.size != null ? formatBytes(file.size) : null,
    file.expires_at ? `link até ${formatDate(file.expires_at)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // width and height are the original's; the resized preview and the cover frame have their own,
  // so the cover only declares a size when it is the original file.
  const size = file.width && file.height ? { width: file.width, height: file.height } : {};
  const coverFile = coverPath(file);
  const cover = coverFile
    ? [{ url: `/s/${token}/cover`, alt: file.name, ...(coverFile === file.path ? size : {}) }]
    : undefined;
  const video = EMBEDDABLE_VIDEO.has(file.mime)
    ? [{ url: `/s/${token}/file`, type: file.mime, ...size }]
    : undefined;

  return {
    metadataBase: await origin(),
    title: { absolute: file.name },
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: video ? "video.other" : "website",
      siteName: "heitor tureck de oliveira",
      title: file.name,
      description,
      url: `/s/${token}`,
      images: cover,
      videos: video,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: file.name,
      description,
      images: cover,
    },
  };
}

/**
 * A shared file (see "compartilhar" on /view/[id]). People go straight to the file, which the
 * browser shows or plays; link-preview crawlers get this page and its tags instead, so the link
 * unfurls into a card. An unknown, expired or revoked token is a 404.
 */
export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const file = await sharedFile(token);
  if (!file) notFound();

  if (!isLinkPreviewBot((await headers()).get("user-agent"))) redirect(await signShared(file, file.path));

  return (
    <main className="cli-root">
      <div className="cli-col">
        <h1 className="cli-acc cli-b">{file.name}</h1>
        <p>
          <a href={`/s/${token}/file`}>abrir</a>
        </p>
      </div>
    </main>
  );
}
