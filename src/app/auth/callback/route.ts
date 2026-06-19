import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase auth code → session exchange.
 *
 * exchangeCodeForSession() writes the chunked auth cookies
 * (sb-<ref>-auth-token.0 + .1, plus -code-verifier on first sign-in) into
 * the `next/headers` server-side cookie store via the SSR client's setAll.
 *
 * The previous implementation returned a bare NextResponse.redirect(URL)
 * which did NOT propagate those cookies to the browser. The browser would
 * only receive them on the FOLLOWING request — which immediately flowed
 * back through the proxy, called getUser(), triggered a token refresh,
 * and re-emitted the cookies. That loop is what doubled the Set-Cookie
 * traffic on the homepage and pushed response headers past Nginx's
 * proxy_buffer_size ceiling.
 *
 * The fix: read every cookie the SSR client wrote and attach it to the
 * 302 response, so the browser receives the new session in a single
 * round-trip.
 */
export async function GET(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");

  const proto =
    request.headers.get("x-forwarded-proto") ??
    "http";

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Forward the freshly-issued Supabase cookies onto the 302 response.
      const cookieStore = await cookies();
      const redirect = NextResponse.redirect(`${proto}://${host}${next}`);

      for (const cookie of cookieStore.getAll()) {
        try {
          redirect.cookies.set({
            name: cookie.name,
            value: cookie.value,
            // next/headers strips these; the defaults below match what
            // the SSR client requested via setAll options.
            path: "/",
            sameSite: "lax",
            httpOnly: cookie.name.includes("auth-token"),
            secure: proto === "https",
          });
        } catch {
          // Some cookies (e.g. set by other route handlers earlier in the
          // same request) may not be settable on a Response object. Skip
          // them rather than failing the whole sign-in.
        }
      }

      return redirect;
    }
  }

  return NextResponse.redirect(
    `${proto}://${host}/login?error=auth_failed`
  );
}