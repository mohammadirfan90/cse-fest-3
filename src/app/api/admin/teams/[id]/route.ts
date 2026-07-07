import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteSubmissionFile } from "@/lib/server/submissionStorage";
import { logAdminAction } from "@/lib/utils/logger";

const updateTeamSchema = z.object({
  name: z.string().min(3, "Team Name must be at least 3 characters").optional(),
  status: z.enum(["forming", "registered", "submitted", "selected", "rejected", "finalist", "judging_ready", "waiting"]).optional(),
});

const adminAddMemberSchema = z.object({
  full_name: z.string().min(2, "Full Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be valid"),
  gender: z.string().optional().nullable(),
  university: z.string().min(2, "University is required"),
  department: z.string().min(2, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
  student_id: z.string().min(2, "Student ID is required"),
  tshirt_size: z.string().min(1, "T-shirt size is required"),
});

const adminRemoveMemberSchema = z.object({
  member_id: z.string().uuid("Invalid member ID format"),
});

const adminEditMemberSchema = z.object({
  member_id: z.string().uuid("Invalid member ID format"),
  full_name: z.string().min(2, "Full Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be valid"),
  gender: z.string().optional().nullable(),
  university: z.string().min(2, "University is required"),
  department: z.string().min(2, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
  student_id: z.string().min(2, "Student ID is required"),
  tshirt_size: z.string().min(1, "T-shirt size is required"),
});

// Helper for Auth & Role verification
async function verifyAdminOrCoordinator() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: true, response: NextResponse.json({ success: false, message: "Unauthorized. Please login." }, { status: 401 }), user: null, supabase };
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userRecord || (userRecord.role !== "admin" && userRecord.role !== "coordinator")) {
    return {
      error: true,
      response: NextResponse.json({ success: false, message: "Forbidden. Authorized access only." }, { status: 403 }),
      user: null,
      supabase,
    };
  }

  return { error: false, response: null, user, supabase };
}

// 1. DELETE: Delete team (and cascade delete members, submissions, payments, and delete proposal files)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const authCheck = await verifyAdminOrCoordinator();
    if (authCheck.error || !authCheck.user) return authCheck.response || NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { user, supabase } = authCheck;

    // Fetch the team and related submissions to find files to delete
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*, submissions(*)")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ success: false, message: "Team not found." }, { status: 404 });
    }

    // Delete submission files from storage/disk
    const submissions = team.submissions || [];
    for (const sub of submissions) {
      if (sub.pdf_path) {
        await deleteSubmissionFile(sub.pdf_path);
      }
    }

    // Delete the team (cascade delete handles dependent rows in team_members, submissions, payments, scores, rankings)
    const { error: deleteErr } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (deleteErr) {
      throw new Error(`Failed to delete team: ${deleteErr.message}`);
    }

    // Log admin action
    await logAdminAction(
      supabase,
      user.id,
      "DELETE_TEAM",
      "teams",
      teamId,
      team,
      null
    );

    return NextResponse.json({
      success: true,
      message: "Team and all associated data deleted successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// 2. PATCH: Update team metadata (name, status)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const authCheck = await verifyAdminOrCoordinator();
    if (authCheck.error || !authCheck.user) return authCheck.response || NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { user, supabase } = authCheck;

    const body = await req.json();
    const parseResult = updateTeamSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { name, status } = parseResult.data;
    if (!name && !status) {
      return NextResponse.json(
        { success: false, message: "No fields to update provided." },
        { status: 400 }
      );
    }

    // Fetch previous state
    const { data: prevTeam, error: prevErr } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (prevErr || !prevTeam) {
      return NextResponse.json({ success: false, message: "Team not found." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;

    const { data: updatedTeam, error: updateErr } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", teamId)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.code === "23505") {
        return NextResponse.json(
          { success: false, message: "A team with this name already exists in this competition." },
          { status: 409 }
        );
      }
      throw new Error(updateErr.message);
    }

    // Log admin action
    await logAdminAction(
      supabase,
      user.id,
      "UPDATE_TEAM",
      "teams",
      teamId,
      prevTeam,
      updatedTeam
    );

    return NextResponse.json({
      success: true,
      message: "Team updated successfully.",
      data: updatedTeam,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// 3. POST: Handle roster actions (add_member / remove_member / edit_member)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const authCheck = await verifyAdminOrCoordinator();
    if (authCheck.error || !authCheck.user) return authCheck.response || NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const { user, supabase } = authCheck;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action !== "add_member" && action !== "remove_member" && action !== "edit_member") {
      return NextResponse.json({ success: false, message: "Invalid action. Supported actions: add_member, remove_member, edit_member." }, { status: 400 });
    }

    // Fetch team details and competition details
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*, competitions(*)")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ success: false, message: "Team not found." }, { status: 404 });
    }

    // ==========================================
    // ACTION: ADD MEMBER
    // ==========================================
    if (action === "add_member") {
      const body = await req.json();
      const parseResult = adminAddMemberSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const {
        full_name,
        email,
        phone,
        gender,
        university,
        department,
        semester,
        student_id,
        tshirt_size,
      } = parseResult.data;

      // 1. Check max team size limit
      const { count: memberCount } = await supabase
        .from("team_members")
        .select("id", { count: "exact" })
        .eq("team_id", teamId)
        .eq("invitation_status", "accepted");

      if (memberCount && memberCount >= team.competitions.max_members) {
        return NextResponse.json(
          { success: false, message: `This team already has the maximum of ${team.competitions.max_members} members.` },
          { status: 400 }
        );
      }

      // 2. Check if email is already registered in this competition
      const { data: competitionTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("competition_id", team.competition_id);

      const compTeamIds = competitionTeams?.map((t) => t.id) || [];
      if (compTeamIds.length > 0) {
        const { data: duplicateMember } = await supabase
          .from("v_team_members")
          .select("member_id, team_id")
          .in("team_id", compTeamIds)
          .eq("email", email.trim().toLowerCase());

        if (duplicateMember && duplicateMember.length > 0) {
          return NextResponse.json(
            { success: false, message: "This email is already registered in a team for this competition." },
            { status: 409 }
          );
        }
      }

      // 3. Resolve user_id by email if they exist in users table
      const emailLower = email.trim().toLowerCase();
      const { data: existingUserId } = await supabase.rpc("get_user_id_by_email", { target_email: emailLower });

      // 4. Insert accepted member record directly
      const { data: newMember, error: insertError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamId,
          user_id: existingUserId || null,
          role: "member",
          invitation_status: "accepted",
          joined_at: new Date().toISOString(),
          full_name,
          email: emailLower,
          phone,
          gender,
          university,
          department,
          semester,
          student_id,
          tshirt_size,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json(
            { success: false, message: "This user is already a member of the team." },
            { status: 409 }
          );
        }
        throw new Error(insertError.message);
      }

      // Log admin action
      await logAdminAction(
        supabase,
        user.id,
        "ADD_MEMBER",
        "team_members",
        newMember.id,
        null,
        newMember
      );

      return NextResponse.json({
        success: true,
        message: "Teammate added to roster successfully.",
        data: newMember,
      });
    }

    // ==========================================
    // ACTION: REMOVE MEMBER
    // ==========================================
    if (action === "remove_member") {
      const body = await req.json();
      const parseResult = adminRemoveMemberSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const { member_id } = parseResult.data;

      // 1. Fetch member to check constraints
      const { data: member, error: memberErr } = await supabase
        .from("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("team_id", teamId)
        .single();

      if (memberErr || !member) {
        return NextResponse.json({ success: false, message: "Member not found on this team." }, { status: 404 });
      }

      // 2. Prevent removing the leader
      if (member.role === "leader") {
        return NextResponse.json(
          { success: false, message: "The team leader cannot be removed. You must designate a new leader or delete the team." },
          { status: 400 }
        );
      }

      // 3. Delete member
      const { error: deleteErr } = await supabase
        .from("team_members")
        .delete()
        .eq("id", member_id);

      if (deleteErr) throw new Error(deleteErr.message);

      // Log admin action
      await logAdminAction(
        supabase,
        user.id,
        "REMOVE_MEMBER",
        "team_members",
        member_id,
        member,
        null
      );

      return NextResponse.json({
        success: true,
        message: "Member removed from roster successfully.",
      });
    }

    // ==========================================
    // ACTION: EDIT MEMBER
    // ==========================================
    if (action === "edit_member") {
      const body = await req.json();
      const parseResult = adminEditMemberSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const {
        member_id,
        full_name,
        email,
        phone,
        gender,
        university,
        department,
        semester,
        student_id,
        tshirt_size,
      } = parseResult.data;

      // 1. Fetch existing member
      const { data: member, error: memberErr } = await supabase
        .from("team_members")
        .select("*")
        .eq("id", member_id)
        .eq("team_id", teamId)
        .single();

      if (memberErr || !member) {
        return NextResponse.json({ success: false, message: "Member not found on this team." }, { status: 404 });
      }

      // Check if email changed and is already taken in the same competition
      const emailLower = email.trim().toLowerCase();
      if (emailLower !== member.email.toLowerCase()) {
        const { data: competitionTeams } = await supabase
          .from("teams")
          .select("id")
          .eq("competition_id", team.competition_id);

        const compTeamIds = competitionTeams?.map((t) => t.id) || [];
        if (compTeamIds.length > 0) {
          const { data: duplicateMember } = await supabase
            .from("v_team_members")
            .select("member_id")
            .in("team_id", compTeamIds)
            .eq("email", emailLower)
            .neq("member_id", member_id);

          if (duplicateMember && duplicateMember.length > 0) {
            return NextResponse.json(
              { success: false, message: "This email is already registered in a team for this competition." },
              { status: 409 }
            );
          }
        }
      }

      // 2. Perform updates based on user registration status
      if (member.user_id) {
        // Registered User: Update profile and user tables
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name,
            phone,
            gender,
            university,
            department,
            semester,
            student_id,
            tshirt_size,
            updated_at: new Date().toISOString(),
          })
          .eq("id", member.user_id);

        if (profileError) {
          throw new Error(`Failed to update member profile: ${profileError.message}`);
        }

        const { error: userError } = await supabase
          .from("users")
          .update({
            email: emailLower,
            updated_at: new Date().toISOString(),
          })
          .eq("id", member.user_id);

        if (userError) {
          throw new Error(`Failed to update user email: ${userError.message}`);
        }
      }

      // Always update team_members record to keep it in sync or for unregistered users
      const { data: updatedMember, error: updateError } = await supabase
        .from("team_members")
        .update({
          full_name,
          email: emailLower,
          phone,
          gender,
          university,
          department,
          semester,
          student_id,
          tshirt_size,
        })
        .eq("id", member_id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update roster member: ${updateError.message}`);
      }

      // Log admin action
      await logAdminAction(
        supabase,
        user.id,
        "EDIT_MEMBER",
        "team_members",
        member_id,
        member,
        updatedMember
      );

      return NextResponse.json({
        success: true,
        message: "Team member updated successfully.",
        data: updatedMember,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
