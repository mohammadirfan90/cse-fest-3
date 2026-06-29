import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/logger";

const paymentReviewSchema = z.object({
  payment_id: z.string().uuid("Invalid payment ID format"),
  status: z.enum(["approved", "rejected", "resubmission_required"]),
  notes: z.string().optional().nullable(),
  confirm_final: z.boolean().optional().default(false),
});

interface EnrichedPayment {
  id: string;
  team_id: string;
  competition_id: string;
  amount: number;
  transaction_id: string;
  screenshot_url: string;
  method: string;
  status: "pending" | "approved" | "rejected" | "resubmission_required";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  teams: { id: string; name: string } | null;
  competitions: { id: string; name: string; type: string; entry_fee: number; is_fee_per_person: boolean } | null;
  team_score: number | null;
  team_rank: number | null;
  member_count: number;
}

// GET: Fetch all payments for admin review
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
    const statusFilter = searchParams.get("status");
    const competitionIdFilter = searchParams.get("competition_id");

    // 3. Query payments with team and competition details
    let query = supabase
      .from("payments")
      .select("*, teams(id, name), competitions(id, name, type, entry_fee, is_fee_per_person)")
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }
    if (competitionIdFilter) {
      query = query.eq("competition_id", competitionIdFilter);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    // Join scores and ranks
    const teamIds = (payments || []).map((p) => p.team_id);
    let scores: { team_id: string; competition_id: string; score: number }[] = [];
    let rankings: { team_id: string; rank_position: number }[] = [];
    const memberCounts: Record<string, number> = {};

    if (teamIds.length > 0) {
      const { data: scoresData } = await supabase
        .from("scores")
        .select("team_id, competition_id, score")
        .in("team_id", teamIds);
      scores = (scoresData || []) as { team_id: string; competition_id: string; score: number }[];

      const { data: rankingsData } = await supabase
        .from("rankings")
        .select("team_id, rank_position")
        .in("team_id", teamIds);
      rankings = (rankingsData || []) as { team_id: string; rank_position: number }[];

      // Count accepted team members
      const { data: membersData } = await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds)
        .eq("invitation_status", "accepted");

      if (membersData) {
        membersData.forEach((m) => {
          memberCounts[m.team_id] = (memberCounts[m.team_id] || 0) + 1;
        });
      }
    }

    const enriched: EnrichedPayment[] = (payments || []).map((p) => {
      const matchedScore = scores.find(
        (s) => s.team_id === p.team_id && s.competition_id === p.competition_id
      );
      const matchedRank = rankings.find((r) => r.team_id === p.team_id);

      return {
        id: p.id,
        team_id: p.team_id,
        competition_id: p.competition_id,
        amount: p.amount,
        transaction_id: p.transaction_id,
        screenshot_url: p.screenshot_url,
        sender_number: p.sender_number,
        method: p.method,
        status: p.status,
        created_at: p.created_at,
        reviewed_at: p.reviewed_at,
        reviewed_by: p.reviewed_by,
        teams: p.teams as { id: string; name: string } | null,
        competitions: p.competitions as { id: string; name: string; type: string; entry_fee: number; is_fee_per_person: boolean } | null,
        team_score: matchedScore ? matchedScore.score : null,
        team_rank: matchedRank ? matchedRank.rank_position : null,
        member_count: memberCounts[p.team_id] || 1,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load payments queue.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Review and update payment status
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
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
    const parseResult = paymentReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed.",
        },
        { status: 400 }
      );
    }

    const { payment_id, status, notes, confirm_final } = parseResult.data;

    // 4. Fetch previous payment state
    const { data: prevPayment, error: fetchErr } = await supabase
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (fetchErr || !prevPayment) {
      return NextResponse.json(
        { success: false, message: "Payment record not found." },
        { status: 404 }
      );
    }

    // 5. Update payment status
    const { error: updateErr } = await supabase
      .from("payments")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", payment_id);

    if (updateErr) {
      throw new Error(`Failed to update payment status: ${updateErr.message}`);
    }

    // 6. Update Team Status if approved
    // Payment approved -> Team status becomes 'registered'
    // Payment resubmission_required or rejected -> Team status remains unchanged (either selected or forming)
    let teamStatus = null;
    if (status === "approved") {
      teamStatus = "finalist";

      const { error: teamUpdateErr } = await supabase
        .from("teams")
        .update({
          status: teamStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prevPayment.team_id);

      if (teamUpdateErr) {
        throw new Error(`Failed to update team registration state: ${teamUpdateErr.message}`);
      }
    }

    // 7. Log admin audit mutation
    await logAdminAction(
      supabase,
      user.id,
      confirm_final ? "CONFIRM_FINAL_SELECTION" : "REVIEW_PAYMENT",
      "payments",
      payment_id,
      prevPayment,
      { status, notes, team_status: teamStatus, confirm_final }
    );

    return NextResponse.json({
      success: true,
      message: confirm_final 
        ? "Payment confirmed and final selection marked." 
        : `Payment status successfully updated to ${status}.`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to review payment.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
