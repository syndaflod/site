import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getOwner, safeNext } from "@/lib/supabase/server";
import { GithubButton } from "./github-button";
import { signOut } from "./actions";
import { Mark } from "../mark";

export const metadata: Metadata = {
  title: "login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  if (await getOwner()) redirect(next);

  // getClaims() verifies the session locally; getUser() would add an Auth round trip.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub;

  return (
    <main className="cli-root private-root">
      <div className="cli-col private-center">
        <h1 className="cli-rule">
          <Mark />
          <span>entrar</span>
        </h1>
        {user ? (
          <>
            <p className="cli-dim">essa conta não tem acesso.</p>
            <form action={signOut}>
              <button type="submit" className="cli-button">sair</button>
            </form>
          </>
        ) : (
          <>
            {params.error && <p className="cli-dim">não deu para entrar, tente de novo.</p>}
            <GithubButton next={next} />
          </>
        )}
      </div>
    </main>
  );
}
