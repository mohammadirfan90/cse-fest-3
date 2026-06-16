import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected route scopes
  const isParticipantRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/teams") ||
    path.startsWith("/submissions") ||
    path.startsWith("/payments") ||
    path.startsWith("/profile-setup");

  const isAdminRoute = path.startsWith("/admin");
  const isAuthRoute =
    path.startsWith("/login") || path.startsWith("/register");

  // Guard: unauthenticated user trying to access protected routes
  if (!user && (isParticipantRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only fetch role from DB when it's actually needed:
  // - Authenticated user on an auth page (redirect to dashboard)
  // - Authenticated user on an admin route (role check)
  // - Authenticated user on a participant route (admin conflict check)
  const needsRoleCheck = user && (isAuthRoute || isAdminRoute || isParticipantRoute);
  let userRole: string | null = null;

  if (needsRoleCheck) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user!.id)
      .single();
    userRole = userData?.role || null;
  }

  // Redirect authenticated users away from login/register
  if (user && isAuthRoute) {
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Secure admin routes server-side
  if (user && isAdminRoute) {
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Prevent admin from accessing participant routes
  if (user && isParticipantRoute) {
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
     * - public files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

