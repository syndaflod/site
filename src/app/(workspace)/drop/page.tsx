import type { Metadata } from "next";
import { requireOwner } from "@/lib/supabase/server";
import { Dropzone } from "./dropzone";

export const metadata: Metadata = {
  title: "drop",
  robots: { index: false, follow: false },
};

export default async function DropPage() {
  await requireOwner("/drop");

  return (
    <main className="cli-root private-root">
      <div className="cli-col">
        <Dropzone />
      </div>
    </main>
  );
}
