import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

// GET /api/notifications
// Returns all notifications for the authenticated user, newest first.
// Query param: ?unread=true — returns only unread + includes total unread_count
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // Rate limit: 60 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`notifications:get:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment before loading notifications." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get total unread count (regardless of filter)
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    return NextResponse.json({
      success: true,
      data: notifications ?? [],
      unread_count: unreadCount ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications
// Marks ALL notifications as read for the authenticated user.
export async function PATCH() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // Rate limit: 20 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`notifications:patch-all:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
