import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function GET(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || 
               "anonymous";

    // Rate limit: 60 requests per minute per IP
    const { success: withinLimit } = checkRateLimit(`public:contact:get:${ip}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Query contact info coordinates
    const { data, error } = await supabase
      .from("contact_info")
      .select("*");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data && data.length > 0 ? data[0] : null,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load contact info.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
