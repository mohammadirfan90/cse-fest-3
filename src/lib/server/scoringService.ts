// src/lib/server/scoringService.ts

import { logAdminAction } from "@/lib/utils/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upsert a single score for a team in a competition.
 * Uses the Supabase client with an "onConflict" upsert on (team_id, competition_id).
 */
export async function upsertTeamScore(
  supabase: SupabaseClient,
  adminId: string,
  teamId: string,
  competitionId: string,
  score: number
): Promise<void> {
  const { data: prevScore } = await supabase
    .from("scores")
    .select("*")
    .eq("team_id", teamId)
    .eq("competition_id", competitionId)
    .maybeSingle();

  const { error: upsertErr } = await supabase
    .from("scores")
    .upsert(
      {
        team_id: teamId,
        competition_id: competitionId,
        score,
        entered_by: adminId,
      },
      { onConflict: "team_id,competition_id" }
    );

  if (upsertErr) {
    throw new Error(`Failed to upsert score: ${upsertErr.message}`);
  }

  // Audit log the score change
  await logAdminAction(
    supabase,
    adminId,
    "ADMIN_SUBMISSION_SCORE",
    "scores",
    null,
    null,
    {
      team_id: teamId,
      competition_id: competitionId,
      previous_score: prevScore?.score ?? null,
      new_score: score,
    }
  );
}

/**
 * Recalculate ranking positions for all teams within a competition.
 * Ranking rules:
 *   1. Higher total_score wins
 *   2. Earlier submission time wins (if scores tie)
 *   3. Earlier team creation time wins (fallback)
 */
export async function recalculateRankings(
  supabase: SupabaseClient,
  competitionId: string
): Promise<void> {
  // 1. Fetch all scores for the competition
  const { data: allScores, error: scoresErr } = await supabase
    .from("scores")
    .select("team_id, competition_id, score")
    .eq("competition_id", competitionId);

  if (scoresErr) throw scoresErr;

  // 2. Fetch current rankings (if any) – we will replace positions
  const { error: rankingsErr } = await supabase
    .from("rankings")
    .select("id")
    .eq("competition_id", competitionId);

  if (rankingsErr) throw rankingsErr;

  // 3. Fetch submission times for tie‑breaker
  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("team_id, submitted_at")
    .eq("competition_id", competitionId);

  if (subErr) throw subErr;

  // 4. Fetch team creation times for final tie‑breaker
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .select("id, created_at")
    .eq("competition_id", competitionId);

  if (teamErr) throw teamErr;

  // 5. Build a map of latest scores per team (there is only one row per team due to upsert)
  const scoreMap = new Map<string, number>();
  (allScores || []).forEach((s) => {
    scoreMap.set(s.team_id, s.score);
  });

  // 6. Assemble ranking items
  const rankingItems = (teams || []).map((t) => ({
    team_id: t.id,
    total_score: scoreMap.get(t.id) ?? 0,
    created_at: t.created_at,
  }));

  // 7. Sort according to rules
  const sorted = rankingItems.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    // tie‑breaker 2: submission time
    const subA = (submissions || []).find((s) => s.team_id === a.team_id);
    const subB = (submissions || []).find((s) => s.team_id === b.team_id);
    const timeA = subA ? new Date(subA.submitted_at).getTime() : Infinity;
    const timeB = subB ? new Date(subB.submitted_at).getTime() : Infinity;
    if (timeA !== timeB) return timeA - timeB;
    // tie‑breaker 3: team creation
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // 8. Upsert ranking positions (replace existing rows)
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const { error: upsertErr } = await supabase.from("rankings").upsert(
      {
        team_id: item.team_id,
        competition_id: competitionId,
        total_score: item.total_score,
        rank_position: i + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id" }
    );
    if (upsertErr) {
      throw new Error(`Failed to upsert ranking for team ${item.team_id}: ${upsertErr.message}`);
    }
  }
}
