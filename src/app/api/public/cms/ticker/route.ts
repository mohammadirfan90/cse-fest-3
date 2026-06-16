import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function GET(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || 
               "anonymous";

    // Rate limit: 60 requests per minute per IP
    const { success: withinLimit } = checkRateLimit(`public:ticker:get:${ip}`, {
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

    // Query active news ticker messages
    const { data, error } = await supabase
      .from("ticker_items")
      .select("*")
      .eq("active", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load news ticker.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
