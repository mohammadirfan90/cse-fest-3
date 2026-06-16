import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

// Public endpoint — cache at edge, revalidate every 60 seconds
export const revalidate = 60;

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "emergency";
  type: "general" | "competition" | "results" | "deadline" | "emergency";
  status: "draft" | "published" | "archived";
  publish_date: string | null;
  expiry_date: string | null;
  pinned: boolean;
}

export async function GET(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("x-real-ip") || 
               "anonymous";

    // Rate limit: 60 requests per minute per IP
    const { success: withinLimit } = checkRateLimit(`public:announcements:get:${ip}`, {
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

    // Query active and published announcements
    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, title, content, priority, type, status, publish_date, expiry_date, pinned"
      )
      .eq("status", "published")
      .order("pinned", { ascending: false })
      .order("publish_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: (data as Announcement[]) || [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to load announcements.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
