import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/logger";

const memberActionSchema = z.object({
  member_id: z.string().uuid("Invalid member ID"),
  action: z.enum(["approve", "reject"]),
});

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Auth
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // 2. Admin role check
    const { data: adminRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (!adminRecord || adminRecord.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    // 3. Fetch all teams that have submitted (include forming/registered for completeness)
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, status, leader_id, leader_confirmed, competition_id, competitions(id, name, submission_end)")
      .order("created_at", { ascending: false });

    if (teamsError) throw new Error(teamsError.message);

    if (!teams || teams.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const teamIds = teams.map((t) => t.id);

    // 4. Fetch team members with profile data from the coalescing view
    const { data: members, error: membersError } = await supabase
      .from("v_team_members")
      .select("member_id, team_id, user_id, role, invitation_status, verification_status, joined_at, full_name, email, phone, gender, university, department, semester, student_id, github, portfolio, skills, bio, tshirt_size, id_front_url, id_back_url")
      .in("team_id", teamIds);

    if (membersError) throw new Error(membersError.message);

    // 5. Fetch submissions for all teams
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, team_id, title, pdf_path, video_path, notes, status, submitted_at")
      .in("team_id", teamIds);

    if (submissionsError) throw new Error(submissionsError.message);

    // 6. Assemble the result
    const result = teams.map((team) => {
      const teamMembers = (members || [])
        .filter((m) => m.team_id === team.id)
        .map((m) => {
          return {
            id: m.member_id,
            user_id: m.user_id,
            role: m.role,
            invitation_status: m.invitation_status,
            verification_status: m.verification_status,
            joined_at: m.joined_at,
            profile: {
              full_name: m.full_name || "",
              email: m.email || "",
              phone: m.phone || "",
              gender: m.gender || "",
              university: m.university || "",
              department: m.department || "",
              semester: m.semester || "",
              student_id: m.student_id || "",
              github: m.github || "",
              skills: m.skills || "",
              bio: m.bio || "",
              tshirt_size: m.tshirt_size || "",
              profile_complete: true,
            },
            id_card: m.id_front_url && m.id_back_url
              ? {
                  front_url: m.id_front_url,
                  back_url: m.id_back_url,
                  status: m.verification_status,
                }
              : null,
          };
        });

      const teamSubmission = (submissions || []).find((s) => s.team_id === team.id) || null;

      return {
        id: team.id,
        name: team.name,
        status: team.status,
        leader_id: team.leader_id,
        leader_confirmed: team.leader_confirmed,
        competition: team.competitions,
        members: teamMembers,
        submission: teamSubmission,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    // 2. Admin role check
    const { data: adminRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (!adminRecord || adminRecord.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    // 3. Validate body
    const body = await req.json();
    const parseResult = memberActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { member_id, action } = parseResult.data;
    const newVerifStatus = action === "approve" ? "approved" : "rejected";

    // 4. Fetch current member record to get team_id
    const { data: memberRecord, error: memberErr } = await supabase
      .from("team_members")
      .select("id, team_id, user_id, verification_status")
      .eq("id", member_id)
      .single();

    if (memberErr || !memberRecord) {
      return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 });
    }

    // 5. Update member verification_status
    const { data: updateData, error: updateErr } = await supabase
      .from("team_members")
      .update({
        verification_status: newVerifStatus,
      })
      .eq("id", member_id)
      .select("id");

    if (updateErr || !updateData || updateData.length === 0) {
      throw new Error(updateErr?.message || "Update was blocked by RLS. Check admin policies.");
    }

    // 6. Check if all accepted members of this team are now approved
    const { data: allMembers, error: allMembersErr } = await supabase
      .from("team_members")
      .select("id, verification_status, invitation_status")
      .eq("team_id", memberRecord.team_id)
      .eq("invitation_status", "accepted");

    if (allMembersErr) throw new Error(allMembersErr.message);

    const acceptedMembers = allMembers || [];
    const allApproved = acceptedMembers.length > 0 && acceptedMembers.every((m) => m.verification_status === "approved");
    const anyRejected = acceptedMembers.some((m) => m.verification_status === "rejected");

    // 7. Auto-update team status based on member verdicts
    if (allApproved) {
      const { error: teamStatusErr } = await supabase
        .from("teams")
        .update({ status: "judging_ready" })
        .eq("id", memberRecord.team_id);

      if (teamStatusErr) throw new Error(teamStatusErr.message);
    } else if (anyRejected && action === "reject") {
      const { error: teamStatusErr } = await supabase
        .from("teams")
        .update({ status: "rejected" })
        .eq("id", memberRecord.team_id);

      if (teamStatusErr) throw new Error(teamStatusErr.message);
    }

    // 8. Audit log
    await logAdminAction(
      supabase,
      adminUser.id,
      `${action.toUpperCase()}_TEAM_MEMBER`,
      "team_members",
      member_id,
      { verification_status: memberRecord.verification_status },
      { verification_status: newVerifStatus, team_id: memberRecord.team_id }
    );

    const teamStatusMessage = allApproved
      ? " Team is now marked as judging_ready."
      : anyRejected && action === "reject"
      ? " Team is now marked as rejected."
      : "";

    return NextResponse.json({
      success: true,
      message: `Member ${action === "approve" ? "approved" : "rejected"} successfully.${teamStatusMessage}`,
      data: {
        team_id: memberRecord.team_id,
        team_status: allApproved ? "judging_ready" : anyRejected && action === "reject" ? "rejected" : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/admin/team-review] Error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
