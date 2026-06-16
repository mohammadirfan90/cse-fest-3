import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.redirect(
        `${proto}://${host}${next}`
      );
    }
  }

  return NextResponse.redirect(
    `${proto}://${host}/login?error=auth_failed`
  );
}