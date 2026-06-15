import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { upsertTeamScore, recalculateRankings } from "@/lib/server/scoringService";

const singleScoreSchema = z.object({
  team_id: z.string().uuid("Invalid team ID format"),
  competition_id: z.string().uuid("Invalid competition ID format"),
  score: z.number().min(0, "Score cannot be negative").max(100, "Score cannot exceed 100"),
});

// GET: Fetch judging data (teams, existing scores, rankings) for a competition
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

    // 2. Authorize admin
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userRecord || userRecord.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Admin only." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const competitionId = searchParams.get("competition_id");

    if (!competitionId) {
      return NextResponse.json(
        { success: false, message: "Missing competition_id parameter." },
        { status: 400 }
      );
    }

    // 3. Fetch competition details (for criteria configuration)
    const { data: competition, error: compErr } = await supabase
      .from("competitions")
      .select("id, name, type, judging_criteria, finalist_limit")
      .eq("id", competitionId)
      .single();

    if (compErr || !competition) {
      return NextResponse.json(
        { success: false, message: "Competition not found." },
        { status: 404 }
      );
    }

    // 4. Fetch teams in submitted, judging_ready, finalist, or selected status (and their optional project submissions)
    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name, status, created_at, submissions(title, submitted_at)")
      .eq("competition_id", competitionId)
      .in("status", ["submitted", "judging_ready", "finalist", "selected"]);

    if (teamsErr) throw teamsErr;

    // 5. Fetch all scores for this competition
    const { data: allScores, error: scoresErr } = await supabase
      .from("scores")
      .select("*")
      .eq("competition_id", competitionId);

    if (scoresErr) throw scoresErr;

    // 6. Fetch existing rankings
    const { data: rankings, error: rankingsErr } = await supabase
      .from("rankings")
      .select("*")
      .eq("competition_id", competitionId)
      .order("rank_position", { ascending: true });

    if (rankingsErr) throw rankingsErr;

    // Combine data for frontend view
    const formattedTeams = (teams || []).map((team) => {
      const teamScores = (allScores || []).filter((s) => s.team_id === team.id);
      const teamRanking = (rankings || []).find((r) => r.team_id === team.id);
      const submission = team.submissions && Array.isArray(team.submissions) && team.submissions.length > 0
        ? team.submissions[0]
        : null;

      return {
        id: team.id,
        name: team.name,
        status: team.status,
        created_at: team.created_at,
        submission: submission ? {
          title: submission.title,
          submitted_at: submission.submitted_at,
        } : null,
        scores: teamScores,
        total_score: teamScores && teamScores.length > 0 ? teamScores[0].score : (teamRanking ? teamRanking.total_score : 0),
        rank_position: teamRanking ? teamRanking.rank_position : null,
        is_finalist: teamRanking ? teamRanking.is_finalist : false,
        is_public: teamRanking ? teamRanking.is_public : false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        competition,
        teams: formattedTeams,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load judging parameters.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST: Enter/Save scores for a team and update leaderboard rankings.
 * Delegates to the shared scoringService for upsert, audit logging, and ranking recalculation.
 */
export async function POST(req: Request) {
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

    // 2. Authorize admin
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userRecord || userRecord.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Admin only." },
        { status: 403 }
      );
    }

    // 3. Validate payload
    const body = await req.json();
    const parseResult = singleScoreSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed.",
        },
        { status: 400 }
      );
    }

    const { team_id, competition_id, score } = parseResult.data;

    // 4. Upsert score + audit log (handled by shared service)
    await upsertTeamScore(supabase, user.id, team_id, competition_id, score);

    // 5. Recalculate all ranking positions for this competition
    await recalculateRankings(supabase, competition_id);

    return NextResponse.json({
      success: true,
      message: "Scores updated and leaderboards recalculated successfully.",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to record team score.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}


