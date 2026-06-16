import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

// PATCH /api/notifications/[id]
// Marks a single notification as read. User can only modify their own.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID is a valid UUID
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid identifier format. Must be a valid UUID." },
        { status: 400 }
      );
    }

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

    // Rate limit: 30 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`notifications:patch-single:${user.id}`, {
      limit: 30,
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
      .eq("id", id)
      .eq("user_id", user.id); // RLS enforced + explicit check

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
