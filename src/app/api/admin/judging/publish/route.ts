import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/logger";

const publishSchema = z.object({
  competition_id: z.string().uuid("Invalid competition ID format"),
  publish_type: z.enum(["preliminary", "final"]),
  finalist_team_ids: z.array(z.string().uuid()).optional().default([]),
});

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

    // 2. Authorize admin role
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

    // 3. Validate body payload
    const body = await req.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Validation failed.",
        },
        { status: 400 }
      );
    }
    const { competition_id, publish_type, finalist_team_ids } = parsed.data;

    // 4. Load competition details
    const { data: compRecord } = await supabase
      .from("competitions")
      .select("id, name, preliminary_published, final_published")
      .eq("id", competition_id)
      .single();
    if (!compRecord) {
      return NextResponse.json(
        { success: false, message: "Competition not found." },
        { status: 404 }
      );
    }

    // 6. Snapshot current states for audit logging
    const { data: prevRankings } = await supabase
      .from("rankings")
      .select("*")
      .eq("competition_id", competition_id);
    const prevCompetition = {
      preliminary_published: compRecord.preliminary_published,
      final_published: compRecord.final_published,
    };

    if (publish_type === "preliminary") {
      // PRELIMINARY PUBLISH:
      // A. Update competition publishing flags
      const { error: compErr } = await supabase
        .from("competitions")
        .update({
          preliminary_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", competition_id);
      if (compErr) {
        throw new Error(`Failed to update preliminary_published: ${compErr.message}`);
      }

      // B. Process selected teams
      for (const teamId of finalist_team_ids) {
        // Upsert rankings entry
        const { error: rankErr } = await supabase
          .from("rankings")
          .upsert(
            {
              team_id: teamId,
              competition_id: competition_id,
              is_public: true,
              is_finalist: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "team_id" }
          );
        if (rankErr) {
          throw new Error(`Failed to upsert rankings for team ${teamId}: ${rankErr.message}`);
        }

        // Update team status to selected
        const { error: teamErr } = await supabase
          .from("teams")
          .update({
            status: "selected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", teamId);
        if (teamErr) {
          throw new Error(`Failed to update team ${teamId} status: ${teamErr.message}`);
        }
      }

      // C. Revert teams that were NOT selected but had status "selected"
      const { data: deselectedTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("competition_id", competition_id)
        .eq("status", "selected")
        .not("id", "in", `(${finalist_team_ids.join(",") || "00000000-0000-0000-0000-000000000000"})`);

      if (deselectedTeams && deselectedTeams.length > 0) {
        const deselectedIds = deselectedTeams.map((t) => t.id);
        await supabase
          .from("teams")
          .update({
            status: "judging_ready",
            updated_at: new Date().toISOString(),
          })
          .in("id", deselectedIds);

        await supabase
          .from("rankings")
          .update({
            is_public: false,
            updated_at: new Date().toISOString(),
          })
          .in("team_id", deselectedIds);
      }

      // D. Send notification to all accepted members of selected teams
      if (finalist_team_ids.length > 0) {
        const { data: members } = await supabase
          .from("team_members")
          .select("user_id")
          .in("team_id", finalist_team_ids)
          .eq("invitation_status", "accepted");

        if (members && members.length > 0) {
          const userIds = Array.from(new Set(members.map((m) => m.user_id)));
          const notifications = userIds.map((uid) => ({
            user_id: uid,
            title: "Preliminary Selection Announced",
            message: `Your team has been selected for ${compRecord.name}! Please complete payment to confirm your spot.`,
            type: "success",
            action_url: "/payments",
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }

      // E. Audit log
      await logAdminAction(
        supabase,
        user.id,
        "PUBLISH_PRELIMINARY",
        "competitions",
        competition_id,
        { rankings: prevRankings ?? [], competition: prevCompetition },
        { finalist_team_ids }
      );

      return NextResponse.json({
        success: true,
        message: `Preliminary results published. ${finalist_team_ids.length} teams selected.`,
      });
    } else {
      // FINAL PUBLISH:
      // A. Verify preliminary has already been published
      if (!compRecord.preliminary_published) {
        return NextResponse.json(
          {
            success: false,
            message: "Preliminary results must be published before publishing final results.",
          },
          { status: 400 }
        );
      }

      // B. Count unverified payments for final selections
      let unverifiedCount = 0;
      if (finalist_team_ids.length > 0) {
        const { data: approvedPayments } = await supabase
          .from("payments")
          .select("team_id")
          .eq("status", "approved")
          .in("team_id", finalist_team_ids);
        unverifiedCount = finalist_team_ids.length - (approvedPayments?.length ?? 0);
      }

      // C. Update competition publish flags
      const { error: compErr } = await supabase
        .from("competitions")
        .update({
          final_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", competition_id);
      if (compErr) {
        throw new Error(`Failed to update final_published: ${compErr.message}`);
      }

      // D. Promote selected teams to finalists
      for (const teamId of finalist_team_ids) {
        // Update rankings
        const { error: rankErr } = await supabase
          .from("rankings")
          .update({
            is_finalist: true,
            is_public: true,
            updated_at: new Date().toISOString(),
          })
          .eq("team_id", teamId);
        if (rankErr) {
          throw new Error(`Failed to update ranking for finalist team ${teamId}: ${rankErr.message}`);
        }

        // Update team status
        const { error: teamErr } = await supabase
          .from("teams")
          .update({
            status: "finalist",
            updated_at: new Date().toISOString(),
          })
          .eq("id", teamId);
        if (teamErr) {
          throw new Error(`Failed to update team ${teamId} status: ${teamErr.message}`);
        }
      }

      // E. Send notifications to finalist members
      if (finalist_team_ids.length > 0) {
        const { data: members } = await supabase
          .from("team_members")
          .select("user_id")
          .in("team_id", finalist_team_ids)
          .eq("invitation_status", "accepted");

        if (members && members.length > 0) {
          const userIds = Array.from(new Set(members.map((m) => m.user_id)));
          const notifications = userIds.map((uid) => ({
            user_id: uid,
            title: "Finalist Confirmed!",
            message: `Congratulations! Your team has been confirmed as a finalist for ${compRecord.name}.`,
            type: "success",
            action_url: "/dashboard",
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }

      // F. Audit log
      await logAdminAction(
        supabase,
        user.id,
        "PUBLISH_FINAL",
        "competitions",
        competition_id,
        { rankings: prevRankings ?? [], competition: prevCompetition },
        { finalist_team_ids }
      );

      const warningText = unverifiedCount > 0 ? ` Note: ${unverifiedCount} team payments are unverified.` : "";
      return NextResponse.json({
        success: true,
        message: `Final results published. ${finalist_team_ids.length} finalists confirmed.${warningText}`,
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to publish rankings.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
