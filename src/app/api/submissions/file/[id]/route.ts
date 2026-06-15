import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamSubmissionFile } from "@/lib/server/submissionStorage";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const fileType = searchParams.get("type");

    if (!fileType || (fileType !== "pdf" && fileType !== "video")) {
      return NextResponse.json(
        { success: false, message: "Invalid type parameter. Must be 'pdf' or 'video'." },
        { status: 400 }
      );
    }

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

    // 2. Fetch submission metadata
    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .select("*, teams(id)")
      .eq("id", id)
      .single();

    if (subErr || !submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found." },
        { status: 404 }
      );
    }

    // 3. Authorize: Check if caller is Admin or member of the team
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userRecord?.role === "admin";

    if (!isAdmin) {
      const { data: memberRecord } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", submission.team_id)
        .eq("user_id", user.id)
        .eq("invitation_status", "accepted")
        .single();

      if (!memberRecord) {
        return NextResponse.json(
          { success: false, message: "Forbidden. You are not authorized to view this file." },
          { status: 403 }
        );
      }
    }

    // 4. Resolve the requested file path and content type
    let relativePath = "";
    let contentType = "";

    if (fileType === "pdf") {
      relativePath = submission.pdf_path;
      contentType = "application/pdf";
    } else {
      relativePath = submission.video_path || "";
      contentType = "video/mp4"; // Default content type for stream
    }

    if (!relativePath) {
      return NextResponse.json(
        { success: false, message: "Requested file does not exist on this submission." },
        { status: 404 }
      );
    }

    // 5. Stream the file content
    return await streamSubmissionFile(relativePath, req, contentType);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to retrieve submission file.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
