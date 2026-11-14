import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "background · heitor tureck de oliveira",
};

// The ocean canvas lives in the root layout; this page only renders it alone.
export default function BackgroundPage() {
  return <main className="background-only" aria-label="background" />;
}
