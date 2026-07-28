import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase PKCE auth code → session exchange.
 *
 * Uses the shared createClient() which follows the exact official
 * @supabase/ssr pattern — no cookieOptions overrides that can break
 * the internal PKCE code verifier lookup.
 *
 * Next.js 15 Route Handlers: cookies().set() calls made inside
 * exchangeCodeForSession are automatically included in the response,
 * so we do NOT need to manually copy them onto the NextResponse object.
 */
export async function GET(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  // Build a stable base URL for redirects using the forwarded headers from Nginx.
  // Falls back to the request origin if headers are missing.
  const { origin, searchParams } = new URL(request.url);
  const redirectBase = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`);
    }

    // Log the real error so we can diagnose — remove after fix is confirmed
    console.error("[auth/callback] exchangeCodeForSession failed:", {
      error_code: (error as any)?.code,
      error_status: (error as any)?.status,
      error_message: error?.message,
      forwardedHost,
      forwardedProto,
    });

    return NextResponse.redirect(
      `${redirectBase}/login?error=auth_failed&reason=${encodeURIComponent(
        error?.message ?? "unknown"
      )}`
    );
  }

  return NextResponse.redirect(
    `${redirectBase}/login?error=auth_failed&reason=no_code`
  );
}