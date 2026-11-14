import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on private routes and bounces signed-out
// visitors to /login. Pages still check ownership themselves; this is only a fast path.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // getClaims() still refreshes an expired session, but verifies the JWT without an Auth round trip.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub;

  const { pathname, search } = request.nextUrl;
  const isPrivate = pathname.startsWith("/drop") || pathname.startsWith("/view");

  if (!user && isPrivate) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // /gallery is public, but the workspace layout reads the session there too, so refresh it.
  matcher: ["/drop/:path*", "/view/:path*", "/gallery", "/login"],
};
