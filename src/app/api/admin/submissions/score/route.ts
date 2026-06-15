import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { upsertTeamScore, recalculateRankings } from "@/lib/server/scoringService";

// Zod schema for scoring payload
const scoreSubmissionSchema = z.object({
  team_id: z.string().uuid("Invalid team ID format"),
  competition_id: z.string().uuid("Invalid competition ID format"),
  score: z.number().min(0, "Score cannot be negative").max(100, "Score cannot exceed 100"),
});

/**
 * POST: Record a score for a team's submission (admin only).
 * Delegates to the shared scoringService for upsert, audit logging, and ranking recalculation.
 * Request body: { team_id, competition_id, score }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please login." }, { status: 401 });
    }
    // 2. Authorize admin
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!userRecord || userRecord.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden. Admin only." }, { status: 403 });
    }
    // 3. Validate request payload
    const body = await req.json();
    const parseResult = scoreSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, message: parseResult.error.issues[0]?.message || "Validation failed." }, { status: 400 });
    }
    const { team_id, competition_id, score } = parseResult.data;
    // 4. Upsert score + audit log (handled by service)
    await upsertTeamScore(supabase, user.id, team_id, competition_id, score);
    // 5. Recalculate rankings for the competition
    await recalculateRankings(supabase, competition_id);
    // 6. Respond
    return NextResponse.json({ success: true, message: "Score recorded and rankings recalculated." }, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to record score.";
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
