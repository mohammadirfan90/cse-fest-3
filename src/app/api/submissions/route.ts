import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitOrUpdateProposal } from "@/lib/server/submissionSubmissionService";
import { checkRateLimit } from "@/lib/utils/rate-limit";

// GET: Fetch team submission
export async function GET(req: Request) {
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

    // 1b. Rate limit: 60 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`submissions:get:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment before loading submissions." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("team_id");

    if (!teamId) {
      return NextResponse.json(
        { success: false, message: "Missing team_id parameter." },
        { status: 400 }
      );
    }

    // 2. Authorize (Must be member of the team)
    const { data: memberRecord } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("invitation_status", "accepted")
      .single();

    if (!memberRecord) {
      return NextResponse.json(
        { success: false, message: "Forbidden. You are not a member of this team." },
        { status: 403 }
      );
    }

    // 3. Fetch submission
    const { data: submission, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("team_id", teamId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: submission || null,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load submission.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Submit project proposal via multipart/form-data
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 1b. Rate limit: 10 submissions per minute per user
    const { success: withinLimit } = checkRateLimit(`submissions:post:${user.id}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment before submitting." },
        { status: 429 }
      );
    }

    // 1c. Retrieve user role
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userRecord?.role === "admin";

    // 2. Parse Multipart form data
    const formData = await req.formData();
    const { searchParams } = new URL(req.url);
    const skipTimeWindowCheck = isAdmin && searchParams.get("skipTimeWindowCheck") === "true";

    // 3. Delegate to submission service
    const result = await submitOrUpdateProposal(supabase, user.id, formData, {
      skipTimeWindowCheck,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to post submission.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
