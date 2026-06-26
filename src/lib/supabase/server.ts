import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const proto = headersList.get("x-forwarded-proto") || "http";
  const isSecure = proto === "https";

  return createServerClient(
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
            // This is ignored when called from Server Components
            // as cookies cannot be set during component rendering.
          }
        },
      },
      cookieOptions: {
        secure: isSecure,
      },
    }
  );
}
