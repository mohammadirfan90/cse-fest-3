import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { streamSubmissionFile } from "@/lib/server/submissionStorage";
import { checkRateLimit } from "@/lib/utils/rate-limit";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Validate ID is a valid UUID
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid identifier format. Must be a valid UUID." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fileType = searchParams.get("type");

    if (!fileType || fileType !== "pdf") {
      return NextResponse.json(
        { success: false, message: "Invalid type parameter. Must be 'pdf'." },
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

    // 1b. Rate limit: 30 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`submissions:file:get:${user.id}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many file requests. Please wait a moment before downloading files." },
        { status: 429 }
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

    const relativePath = submission.pdf_path;
    const contentType = "application/pdf";

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
