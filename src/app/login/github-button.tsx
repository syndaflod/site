"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function GithubButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (error) setPending(false);
  }

  return (
    <button type="button" className="cli-button" onClick={signIn} disabled={pending}>
      {pending ? "abrindo github…" : "entrar com github"}
    </button>
  );
}
