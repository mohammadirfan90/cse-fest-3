import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

// GET: Fetch all active payment methods for participants
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // Rate limit: 60 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`payment-methods:get:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // 2. Query active payment methods sorted by name
    const { data: methods, error } = await supabase
      .from("payment_methods")
      .select("id, name, display_name, number, instructions, active")
      .eq("active", true)
      .order("display_name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: methods || [],
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load payment methods.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
