import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase auth code → session exchange.
 *
 * IMPORTANT: We build our own SSR client here rather than using the shared
 * createClient() helper. The shared helper reads x-forwarded-proto via
 * next/headers, but that header is not reliably populated inside Route
 * Handlers — only the raw `request` object carries it. Building the client
 * here lets us pass the correct `secure` flag (derived from x-forwarded-proto
 * on the request), which ensures the PKCE code-verifier cookie — stored by
 * the browser with the __Host- prefix under HTTPS — is found and read
 * correctly by the server during exchangeCodeForSession(). Without this,
 * the exchange fails and returns auth_failed.
 */
export async function GET(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");

  const proto =
    request.headers.get("x-forwarded-proto") ??
    "http";

  const isSecure = proto === "https";

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  secure: isSecure,
                })
              );
            } catch {
              // Ignored in Server Components
            }
          },
        },
        cookieOptions: {
          secure: isSecure,
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Forward the freshly-issued Supabase cookies onto the 302 response.
      const redirect = NextResponse.redirect(`${proto}://${host}${next}`);

      for (const cookie of cookieStore.getAll()) {
        try {
          redirect.cookies.set({
            name: cookie.name,
            value: cookie.value,
            path: "/",
            sameSite: "lax",
            httpOnly: cookie.name.includes("auth-token"),
            secure: isSecure,
          });
        } catch {
          // Skip cookies that can't be set on a Response object.
        }
      }

      return redirect;
    }

    // DEBUG: expose exact Supabase error so we can diagnose — REMOVE AFTER FIX
    console.error("[auth/callback] exchangeCodeForSession failed:", {
      error_code: error?.code,
      error_status: error?.status,
      error_message: error?.message,
      code_present: !!code,
      cookies: cookieStore.getAll().map((c) => c.name),
      proto,
      host,
      isSecure,
    });

    return NextResponse.redirect(
      `${proto}://${host}/login?error=auth_failed&reason=${encodeURIComponent(error?.message ?? "unknown")}&code=${encodeURIComponent(error?.code ?? "none")}`
    );
  }

  return NextResponse.redirect(
    `${proto}://${host}/login?error=auth_failed&reason=no_code`
  );
}