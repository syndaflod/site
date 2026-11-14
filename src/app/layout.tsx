import type { Metadata } from "next";
import { AsciiOcean } from "../lib/ascii-sharks/react";
import "./globals.css";

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
      <body>
        <AsciiOcean className="site-ascii-ocean" />
        {children}
      </body>
    </html>
  );
}
