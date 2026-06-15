import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitOrUpdateProposal } from "@/lib/server/submissionSubmissionService";

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

    // 2. Parse Multipart form data
    const formData = await req.formData();

    // 3. Delegate to submission service
    const result = await submitOrUpdateProposal(supabase, user.id, formData);

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
