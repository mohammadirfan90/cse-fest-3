import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTE_PREFIXES = [
  "/competitions",
  "/schedule",
  "/finalists",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
];

function isPublicRoute(path: string): boolean {
  if (path === "/") return true;
  // Locale prefixes like /en, /bn — public marketing locale switchers
  if (/^\/[a-z]{2}(\/|$)/.test(path)) return true;
  return PUBLIC_ROUTE_PREFIXES.some((p) => path.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;

  // CSRF Check for API mutations
  if (path.startsWith("/api/") && ["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && !origin.includes(host || "")) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "CSRF verification failed: invalid origin source" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // API routes handle their own auth — skip middleware entirely for them
  // to avoid a redundant Supabase round-trip on every API call
  if (path.startsWith("/api/")) {
    return response;
  }

  // Public marketing / auth surfaces — skip the Supabase round-trip entirely.
  // This eliminates the JWT validation + cookie re-emit on GET /, which was
  // the trigger for the 502 header-overflow on default-buffered Nginx.
  if (isPublicRoute(path)) {
    return response;
  }

  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "") || "http";
  const isSecure = proto === "https";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              secure: isSecure,
            })
          );
        },
      },
      cookieOptions: {
        secure: isSecure,
      },
    }
  );

  // Protected route scopes
  const isParticipantRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/teams") ||
    path.startsWith("/submissions") ||
    path.startsWith("/payments") ||
    path.startsWith("/profile-setup");

  const isAdminRoute = path.startsWith("/admin");

  // Use getSession() (cookie-only, no network call) first to decide whether
  // a user is present at all. This avoids the JWT-refresh side effect of
  // getUser() on requests where no authorization decision is required.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Guard: unauthenticated user trying to access protected routes — no
  // Supabase round-trip needed; the cookie store is the source of truth
  // for "is this user signed in?".
  if (!session && (isParticipantRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // No session and not on a protected route — let the request through.
  // The server component for the route, if any, will perform the full
  // getUser() check itself.
  if (!session) {
    return response;
  }

  // We have a session; only NOW validate with getUser() (which can refresh
  // the token and emit Set-Cookie). This is only reached for routes where
  // an authorization decision is required.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Session cookie present but user no longer valid — clear it by
    // sending them to login. The setAll callback above has already wired
    // the cleared cookies onto `response`.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only fetch role from DB when it's actually needed:
  // - Authenticated user on an admin route (role check)
  // - Authenticated user on a participant route (admin conflict check)
  const needsRoleCheck = isAdminRoute || isParticipantRoute;
  let userRole: string | null = null;

  if (needsRoleCheck) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = userData?.role || null;
  }

  // Secure admin routes server-side
  if (isAdminRoute) {
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Prevent admin from accessing participant routes
  if (isParticipantRoute) {
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes — they self-authenticate)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (OAuth callback — handled by route.ts; running the
     *   proxy on it caused a re-entry loop with getUser() that doubled
     *   the cookie re-emit rate on the immediately-following request)
     * - public files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
