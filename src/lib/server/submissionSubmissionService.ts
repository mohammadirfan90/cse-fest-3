import { SupabaseClient } from "@supabase/supabase-js";
import {
  getCompetitionSlug,
  isValidPDFSignature,
  isValidVideoSignature,
  writeSubmissionFile,
  deleteSubmissionFile,
  MAX_PDF_BYTES,
  MAX_VIDEO_BYTES,
} from "./submissionStorage";

export type SubmitResult =
  | { success: true; message: string }
  | { success: false; status: number; message: string };

export async function submitOrUpdateProposal(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData,
  options?: { skipTimeWindowCheck?: boolean }
): Promise<SubmitResult> {
  try {
    // 1. Retrieve & validate basic text fields
    const teamId = formData.get("team_id") as string;
    const title = formData.get("title") as string;
    const notes = (formData.get("notes") as string) || null;

    if (!teamId || !title || title.length < 5) {
      return {
        success: false,
        status: 400,
        message: "Title must be at least 5 characters.",
      };
    }

    // 2. Fetch team and competition info
    const { data: teamRecord, error: teamQueryErr } = await supabase
      .from("teams")
      .select("*, competitions(*)")
      .eq("id", teamId)
      .single();

    if (teamQueryErr || !teamRecord) {
      return { success: false, status: 404, message: "Team not found." };
    }

    // 3. Authorize (Must be accepted member of this team)
    const { data: memberRecord } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .eq("invitation_status", "accepted")
      .single();

    if (!memberRecord) {
      return {
        success: false,
        status: 403,
        message: "Forbidden. You are not a member of this team.",
      };
    }

    // 4. Validate Submission Timeline Window
    const comp = teamRecord.competitions;
    if (!options?.skipTimeWindowCheck) {
      const now = new Date();
      const subStart = new Date(comp.submission_start);
      const subEnd = new Date(comp.submission_end);

      if (now < subStart) {
        return {
          success: false,
          status: 400,
          message: `Submission phase has not started yet. Opens: ${subStart.toLocaleString()}`,
        };
      }

      if (now > subEnd) {
        return {
          success: false,
          status: 400,
          message: `Submission period is locked. Closed on: ${subEnd.toLocaleString()}`,
        };
      }
    }

    // 5. Fetch existing submission (if any)
    const { data: existingSubmission } = await supabase
      .from("submissions")
      .select("id, pdf_path, video_path")
      .eq("team_id", teamId)
      .single();

    // 6. Handle PDF and Video file uploads
    const pdfFile = formData.get("pdf") as File | null;
    const videoFile = formData.get("video") as File | null;

    let newPdfPath = existingSubmission?.pdf_path || "";
    let newVideoPath = existingSubmission?.video_path || null;

    const filesToDeleteOnFailure: string[] = [];
    const filesToDeleteOnSuccess: string[] = [];

    // Process PDF
    if (pdfFile && pdfFile.size > 0) {
      if (pdfFile.size > MAX_PDF_BYTES) {
        return {
          success: false,
          status: 400,
          message: "PDF file size must be less than 5 MB.",
        };
      }

      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      if (!isValidPDFSignature(pdfBuffer)) {
        return {
          success: false,
          status: 400,
          message: "Invalid PDF file. The file is not a valid PDF document.",
        };
      }

      const competitionSlug = await getCompetitionSlug(comp.id);
      const relativePath = await writeSubmissionFile(
        competitionSlug,
        teamId,
        pdfFile.name,
        pdfBuffer
      );

      if (existingSubmission?.pdf_path) {
        filesToDeleteOnSuccess.push(existingSubmission.pdf_path);
      }
      filesToDeleteOnFailure.push(relativePath);
      newPdfPath = relativePath;
    } else if (!existingSubmission) {
      // PDF is optional; if not uploaded, use a placeholder path
      newPdfPath = "mock-vercel-uploads/placeholder.pdf";
    }

    // Process Video
    if (videoFile && videoFile.size > 0) {
      if (videoFile.size > MAX_VIDEO_BYTES) {
        return {
          success: false,
          status: 400,
          message: "Video file size must be less than 200 MB.",
        };
      }

      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      if (!isValidVideoSignature(videoBuffer)) {
        return {
          success: false,
          status: 400,
          message: "Invalid video file. Must be a valid MP4 or WebM video.",
        };
      }

      const competitionSlug = await getCompetitionSlug(comp.id);
      const relativePath = await writeSubmissionFile(
        competitionSlug,
        teamId,
        videoFile.name,
        videoBuffer
      );

      if (existingSubmission?.video_path) {
        filesToDeleteOnSuccess.push(existingSubmission.video_path);
      }
      filesToDeleteOnFailure.push(relativePath);
      newVideoPath = relativePath;
    }

    // 7. Upsert Submission record
    const { error: upsertErr } = await supabase.from("submissions").upsert({
      team_id: teamId,
      competition_id: comp.id,
      title,
      pdf_path: newPdfPath,
      video_path: newVideoPath,
      notes,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });

    if (upsertErr) {
      // Clean up newly uploaded files on DB failure
      for (const relPath of filesToDeleteOnFailure) {
        await deleteSubmissionFile(relPath);
      }
      return {
        success: false,
        status: 500,
        message: `Failed to save submission: ${upsertErr.message}`,
      };
    }

    // 8. Update Team Status to 'submitted'
    const { error: teamUpdateErr } = await supabase
      .from("teams")
      .update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamId);

    if (teamUpdateErr) {
      return {
        success: false,
        status: 500,
        message: `Failed to update team state: ${teamUpdateErr.message}`,
      };
    }

    // Clean up old files on successful database transaction
    for (const oldPath of filesToDeleteOnSuccess) {
      await deleteSubmissionFile(oldPath);
    }

    return {
      success: true,
      message: "Proposal successfully submitted.",
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to execute submission service.";
    return { success: false, status: 500, message: errorMessage };
  }
}
