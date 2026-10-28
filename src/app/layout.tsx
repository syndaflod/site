import type { Metadata } from "next";
import { AsciiOcean } from "../lib/ascii-sharks/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "heitor tureck de oliveira · portfólio",
  description:
    "portfólio de heitor tureck de oliveira: desenvolvimento de software, automação e integração de sistemas.",
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
