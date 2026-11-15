import type { Metadata } from "next";
import { AsciiOcean } from "../lib/ascii-sharks/react";
import "./globals.css";

// Every file boot.js imports, so the browser fetches them in parallel.
const OCEAN_MODULES = ["engine.js", "renderer.js", "world.js", "math.js", "species.js"];

export const metadata: Metadata = {
  title: "heitor tureck de oliveira",
  description:
    "estudante de ciência da computação e desenvolvedor de software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* @font-face files are only found once the CSS parses; preload them alongside it. */}
        <link rel="preload" href="/fonts/GeistMono-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/GeistMono-SemiBold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* The background engine runs on its own, ahead of React (see src/lib/ascii-sharks/boot.ts). */}
        {OCEAN_MODULES.map((file) => (
          <link key={file} rel="modulepreload" href={`/ocean/${file}`} />
        ))}
        {/* Module scripts are deferred by default, so this doesn't block parsing. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script type="module" src="/ocean/boot.js" />
      </head>
      <body>
        <AsciiOcean className="site-ascii-ocean" />
        {children}
      </body>
    </html>
  );
}
