import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseEnv } from "./env";

export async function createClient() {
  // cookies() first: it marks the route dynamic, so nothing here is prerendered at build time.
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Signed-in owner, or null. The real enforcement is RLS; this keeps non-owners off the pages.
 * getClaims() verifies the JWT locally (no Auth round trip with asymmetric signing keys), and
 * cache() makes the layout and the page share one check per request.
 */
export const getOwner = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: isOwner } = await supabase.rpc("is_owner");
  return isOwner === true ? { supabase, userId } : null;
});

export async function requireOwner(next: string) {
  const owner = await getOwner();
  if (!owner) redirect(`/login?next=${encodeURIComponent(next)}`);
  return owner;
}

/**
 * Only same-site relative paths, so ?next= can't send anyone to another site. Control
 * characters are rejected because browsers strip them ("/	/evil.com" becomes "//evil.com").
 */
export function safeNext(value: string | null | undefined, fallback = "/view") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    /[\x00-\x1f\x7f]/.test(value)
  ) {
    return fallback;
  }
  return value;
}
