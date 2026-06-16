import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const teamActionSchema = z.object({
  team_id: z.string().uuid("Invalid team ID"),
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

    // 3. Fetch all teams
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
      .select("member_id, team_id, user_id, role, invitation_status, joined_at, full_name, email, phone, gender, university, department, semester, student_id, github, portfolio, skills, bio, tshirt_size")
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
            id_card: null,
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

// POST: Admin reviews team as a whole (approve/reject team status)
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
    const parseResult = teamActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { team_id, action } = parseResult.data;
    const newStatus = action === "approve" ? "judging_ready" : "rejected";

    // 4. Update team status
    const { error: updateErr } = await supabase
      .from("teams")
      .update({ status: newStatus })
      .eq("id", team_id);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({
      success: true,
      message: `Team status updated to ${newStatus} successfully.`,
      data: {
        team_id,
        team_status: newStatus,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
