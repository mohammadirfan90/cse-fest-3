import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { ensureUserAndProfileExists } from "@/lib/server/userSelfHeal";
import { promises as fs } from "node:fs";
import path from "node:path";
import { slugify, SUBMISSIONS_ROOT } from "@/lib/server/submissionStorage";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const createTeamSchema = z.object({
  name: z.string().min(3, "Team Name must be at least 3 characters"),
  competition_id: z.string().uuid("Please select a valid competition"),
});

const addMemberSchema = z.object({
  team_id: z.string().uuid(),
  full_name: z.string().min(2, "Full Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be valid"),
  gender: z.string().min(1, "Gender is required"),
  university: z.string().min(2, "University is required"),
  department: z.string().min(2, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
  student_id: z.string().min(2, "Student ID is required"),
  tshirt_size: z.string().min(1, "T-shirt size is required"),
});

const respondInviteSchema = z.object({
  member_id: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
});

const updateTeamSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(3, "Team Name must be at least 3 characters"),
});

const teamIdOnlySchema = z.object({
  team_id: z.string().uuid(),
});

const removeMemberSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  member_id: z.string().uuid().optional().nullable(),
});

const transferLeadershipSchema = z.object({
  team_id: z.string().uuid(),
  new_leader_id: z.string().uuid(),
});

const setLeaderSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.string().uuid(), // the member being designated as leader (can be self)
});

// Helper: Verify leader status and that registration deadline has not passed
async function verifyLeaderAndDeadline(supabase: SupabaseClient, teamId: string, userId: string) {
  const { data: team, error } = await supabase
    .from("teams")
    .select("*, competitions(registration_end)")
    .eq("id", teamId)
    .single();

  if (error || !team) {
    return { error: true, status: 404, message: "Team not found." };
  }

  if (team.leader_id !== userId) {
    return { error: true, status: 403, message: "Only the team leader can perform this action." };
  }

  const registrationEnd = new Date(team.competitions.registration_end);
  if (new Date() > registrationEnd) {
    return {
      error: true,
      status: 400,
      message: "The registration deadline for this competition has passed. No modifications are allowed.",
    };
  }

  return { error: false, team };
}

// Helper: Verify team membership (excluding leader) and deadline
async function verifyMembershipAndDeadline(supabase: SupabaseClient, teamId: string, userId: string) {
  const { data: team, error } = await supabase
    .from("teams")
    .select("*, competitions(registration_end)")
    .eq("id", teamId)
    .single();

  if (error || !team) {
    return { error: true, status: 404, message: "Team not found." };
  }

  const { data: membership, error: memError } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("invitation_status", "accepted")
    .single();

  if (memError || !membership) {
    return { error: true, status: 403, message: "You are not a member of this team." };
  }

  if (membership.role === "leader") {
    return {
      error: true,
      status: 400,
      message: "Team leader cannot leave the team. You must disband the team or transfer leadership first.",
    };
  }

  const registrationEnd = new Date(team.competitions.registration_end);
  if (new Date() > registrationEnd) {
    return {
      error: true,
      status: 400,
      message: "The registration deadline for this competition has passed. No modifications are allowed.",
    };
  }

  return { error: false, team, membership };
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 60 requests per minute per user
    const { success: withinLimit } = checkRateLimit(`teams:get:${user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment before loading teams." },
        { status: 429 }
      );
    }

    // Self-healing: Ensure user exists in public tables before querying teams
    await ensureUserAndProfileExists(supabase, user);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    // Mode: "invitations" lists all pending invitations for this user
    if (mode === "invitations") {
      const { data: invites, error } = await supabase
        .from("team_members")
        .select("id, role, team_id, teams(name, competition_id, competitions(name))")
        .eq("user_id", user.id)
        .eq("invitation_status", "pending");

      if (error) throw new Error(error.message);

      return NextResponse.json({ success: true, data: invites });
    }

    // Default: List user's active teams
    const { data: memberRecords } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("invitation_status", "accepted");

    if (!memberRecords || memberRecords.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const teamIds = memberRecords.map((m) => m.team_id);
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*, competitions(name, type, min_members, max_members, eligibility, registration_end, submission_end, rulebook_url, template_link, description)")
      .in("id", teamIds);

    if (error) throw new Error(error.message);

    // Fetch rosters for each team
    const teamsWithRosters = await Promise.all(
      teams.map(async (team) => {
        const { data: members } = await supabase
          .from("v_team_members")
          .select("member_id, role, invitation_status, user_id, full_name, email, phone, gender, university, department, semester, student_id, github, portfolio, skills, bio, tshirt_size")
          .eq("team_id", team.id);

        const rawMembers = members || [];
        const mappedMembers = rawMembers.map((m) => {
          return {
            id: m.member_id,
            role: m.role,
            invitation_status: m.invitation_status,
            user_id: m.user_id,
            profiles: {
              full_name: m.full_name,
              university: m.university || "",
              email: m.email || "",
              phone: m.phone || "",
              gender: m.gender || "",
              department: m.department || "",
              semester: m.semester || "",
              student_id: m.student_id || "",
              github: m.github || "",
              portfolio: m.portfolio || "",
              skills: m.skills || "",
              bio: m.bio || "",
              tshirt_size: m.tshirt_size || "",
            },
          };
        });

        return { ...team, members: mappedMembers };
      })
    );

    return NextResponse.json({ success: true, data: teamsWithRosters });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 actions per minute per user
    const { success: withinLimit } = checkRateLimit(`teams:post:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many actions. Please wait a moment." },
        { status: 429 }
      );
    }

    // Self-healing: Ensure user exists in public tables before mutating teams/members
    await ensureUserAndProfileExists(supabase, user);

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Action: create a new team
    if (action === "create") {
      const body = await req.json();
      const parseResult = createTeamSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      // Profile complete check skipped for registration-first flow

      // Check if user is already on a team in this competition
      const { data: existingTeamMember } = await supabase
        .from("team_members")
        .select("id, team_id, teams(competition_id)")
        .eq("user_id", user.id)
        .eq("invitation_status", "accepted");

      const inSameCompetition = existingTeamMember?.some(
        (m) => {
          const teamInfo = m.teams as unknown as { competition_id: string } | null;
          return teamInfo?.competition_id === parseResult.data.competition_id;
        }
      );

      if (inSameCompetition) {
        return NextResponse.json(
          { success: false, message: "You are already a registered team member in this competition." },
          { status: 409 }
        );
      }

      // Create the team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: parseResult.data.name,
          competition_id: parseResult.data.competition_id,
          leader_id: user.id,
          status: "forming",
        })
        .select()
        .single();

      if (teamError) {
        if (teamError.code === "23505") {
          return NextResponse.json(
            { success: false, message: "A team with this name already exists in this competition." },
            { status: 409 }
          );
        }
        throw new Error(teamError.message);
      }

      // Add leader to team_members
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: user.id,
        role: "leader",
        invitation_status: "accepted",
        joined_at: new Date().toISOString(),
      });

      if (memberError) throw new Error(memberError.message);

      return NextResponse.json({ success: true, data: team });
    }

    // Action: add a team member directly (replacing old invite flow)
    if (action === "add_member") {
      const body = await req.json();
      const parseResult = addMemberSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const {
        team_id,
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

      // Check if user has permission to add (must be team leader)
      const { data: team } = await supabase
        .from("teams")
        .select("*, competitions(max_members, registration_end, competition_id:id)")
        .eq("id", team_id)
        .single();

      if (!team) {
        return NextResponse.json({ success: false, message: "Team not found." }, { status: 404 });
      }

      if (team.leader_id !== user.id) {
        return NextResponse.json(
          { success: false, message: "Only the team leader can add members." },
          { status: 403 }
        );
      }

      // Verify deadline
      const registrationEnd = new Date(team.competitions.registration_end);
      if (new Date() > registrationEnd) {
        return NextResponse.json(
          { success: false, message: "The registration deadline for this competition has passed. Roster editing is locked." },
          { status: 400 }
        );
      }

      // Check current accepted roster size limit
      const { count: memberCount } = await supabase
        .from("team_members")
        .select("id", { count: "exact" })
        .eq("team_id", team.id)
        .eq("invitation_status", "accepted");

      if (memberCount && memberCount >= team.competitions.max_members) {
        return NextResponse.json(
          { success: false, message: `This team already has the maximum of ${team.competitions.max_members} members.` },
          { status: 400 }
        );
      }

      // Verify that this email is not already registered in another team for the same competition
      // 1. Get all team IDs for this competition
      const { data: competitionTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("competition_id", team.competitions.competition_id);
      
      const compTeamIds = competitionTeams?.map((t) => t.id) || [];

      if (compTeamIds.length > 0) {
        // 2. Check if any member in these teams matches this email
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

      // Create accepted member record directly
      const { error: insertError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: null,
        role: "member",
        invitation_status: "accepted",
        joined_at: new Date().toISOString(),
        full_name,
        email: email.trim().toLowerCase(),
        phone,
        gender,
        university,
        department,
        semester,
        student_id,
        tshirt_size,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          return NextResponse.json(
            { success: false, message: "This user is already a member of the team." },
            { status: 409 }
          );
        }
        throw new Error(insertError.message);
      }

      return NextResponse.json({ success: true, message: "Teammate registered successfully." });
    }

    // Action: respond to invitation (accept / reject)
    if (action === "respond") {
      const body = await req.json();
      const parseResult = respondInviteSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      // Validate invitation belongs to the authenticated user
      const { data: memberRecord } = await supabase
        .from("team_members")
        .select("*, teams(name, leader_id, competition_id, competitions(registration_end))")
        .eq("id", parseResult.data.member_id)
        .eq("user_id", user.id)
        .single();

      if (!memberRecord) {
        return NextResponse.json({ success: false, message: "Invitation not found." }, { status: 404 });
      }

      // Check deadline
      const teamInfo = memberRecord.teams as unknown as { competitions: { registration_end: string } | null } | null;
      if (teamInfo?.competitions) {
        const registrationEnd = new Date(teamInfo.competitions.registration_end);
        if (new Date() > registrationEnd) {
          return NextResponse.json(
            { success: false, message: "The registration deadline for this competition has passed. Roster editing is locked." },
            { status: 400 }
          );
        }
      }

      if (parseResult.data.status === "accepted") {
        // Update status to accepted
        const { error } = await supabase
          .from("team_members")
          .update({
            invitation_status: "accepted",
            joined_at: new Date().toISOString(),
          })
          .eq("id", parseResult.data.member_id);

        if (error) throw new Error(error.message);

        // In-app notification is handled automatically via database trigger (tr_invitation_accepted_notification)
      } else {
        // Delete or update to rejected
        const { error } = await supabase
          .from("team_members")
          .delete()
          .eq("id", parseResult.data.member_id);

        if (error) throw new Error(error.message);
      }

      return NextResponse.json({ success: true, message: `Invitation ${parseResult.data.status}.` });
    }

    // Action: update team name
    if (action === "update") {
      const body = await req.json();
      const parseResult = updateTeamSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const check = await verifyLeaderAndDeadline(supabase, parseResult.data.team_id, user.id);
      if (check.error) {
        return NextResponse.json({ success: false, message: check.message }, { status: check.status });
      }

      // Fetch the old team details for the slug rename
      const { data: oldTeam } = await supabase
        .from("teams")
        .select("name, competitions(slug)")
        .eq("id", parseResult.data.team_id)
        .single();

      const oldName = oldTeam?.name;
      const compSlug = (oldTeam?.competitions as any)?.slug;

      const { error: updateError } = await supabase
        .from("teams")
        .update({ name: parseResult.data.name })
        .eq("id", parseResult.data.team_id);

      if (updateError) {
        if (updateError.code === "23505") {
          return NextResponse.json(
            { success: false, message: "A team with this name already exists in this competition." },
            { status: 409 }
          );
        }
        throw new Error(updateError.message);
      }

      // If the update succeeded and name changed, trigger directory rename and database update
      const oldSlug = slugify(oldName || "");
      const newSlug = slugify(parseResult.data.name);

      if (oldSlug !== newSlug && compSlug) {
        const oldDir = path.join(SUBMISSIONS_ROOT, "csefest", "competitions", compSlug, "teams", oldSlug);
        const newDir = path.join(SUBMISSIONS_ROOT, "csefest", "competitions", compSlug, "teams", newSlug);

        // Rename folder on disk if it exists
        try {
          const stats = await fs.stat(oldDir);
          if (stats.isDirectory()) {
            await fs.mkdir(path.dirname(newDir), { recursive: true });
            await fs.rename(oldDir, newDir);
          }
        } catch {
          // Ignore error if old directory does not exist yet (i.e. no files submitted)
        }

        // Fetch the existing submission for this team to update the DB paths
        const { data: submission } = await supabase
          .from("submissions")
          .select("id, pdf_path, video_path")
          .eq("team_id", parseResult.data.team_id)
          .maybeSingle();

        if (submission) {
          let updatedPdf = submission.pdf_path;
          let updatedVideo = submission.video_path;

          if (updatedPdf && updatedPdf.startsWith(`csefest/competitions/${compSlug}/teams/${oldSlug}/`)) {
            updatedPdf = updatedPdf.replace(
              `csefest/competitions/${compSlug}/teams/${oldSlug}/`,
              `csefest/competitions/${compSlug}/teams/${newSlug}/`
            );
          }

          if (updatedVideo && updatedVideo.startsWith(`csefest/competitions/${compSlug}/teams/${oldSlug}/`)) {
            updatedVideo = updatedVideo.replace(
              `csefest/competitions/${compSlug}/teams/${oldSlug}/`,
              `csefest/competitions/${compSlug}/teams/${newSlug}/`
            );
          }

          await supabase
            .from("submissions")
            .update({
              pdf_path: updatedPdf,
              video_path: updatedVideo,
            })
            .eq("id", submission.id);
        }
      }

      return NextResponse.json({ success: true, message: "Team name updated successfully." });
    }

    // Action: disband team
    if (action === "disband") {
      const body = await req.json();
      const parseResult = teamIdOnlySchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const check = await verifyLeaderAndDeadline(supabase, parseResult.data.team_id, user.id);
      if (check.error) {
        return NextResponse.json({ success: false, message: check.message }, { status: check.status });
      }

      // Delete the team (cascades automatically delete membership/submissions/payments)
      const { error: deleteError } = await supabase
        .from("teams")
        .delete()
        .eq("id", parseResult.data.team_id);

      if (deleteError) throw new Error(deleteError.message);

      return NextResponse.json({ success: true, message: "Team disbanded successfully." });
    }

    // Action: remove/kick member
    if (action === "remove_member") {
      const body = await req.json();
      const parseResult = removeMemberSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const check = await verifyLeaderAndDeadline(supabase, parseResult.data.team_id, user.id);
      if (check.error) {
        return NextResponse.json({ success: false, message: check.message }, { status: check.status });
      }

      // Check if trying to remove self
      const memberQuery = parseResult.data.member_id 
        ? supabase.from("team_members").select("user_id").eq("id", parseResult.data.member_id).single()
        : supabase.from("team_members").select("user_id").eq("team_id", parseResult.data.team_id).eq("user_id", parseResult.data.user_id).single();
      
      const { data: memberToQuery } = await memberQuery;
      if (memberToQuery && memberToQuery.user_id === user.id) {
        return NextResponse.json(
          { success: false, message: "You cannot kick yourself from the team. Disband the team or transfer leadership instead." },
          { status: 400 }
        );
      }

      const deleteQuery = parseResult.data.member_id
        ? supabase.from("team_members").delete().eq("id", parseResult.data.member_id)
        : supabase.from("team_members").delete().eq("team_id", parseResult.data.team_id).eq("user_id", parseResult.data.user_id);

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw new Error(deleteError.message);

      return NextResponse.json({ success: true, message: "Member removed from roster successfully." });
    }

    // Action: leave team
    if (action === "leave") {
      const body = await req.json();
      const parseResult = teamIdOnlySchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const check = await verifyMembershipAndDeadline(supabase, parseResult.data.team_id, user.id);
      if (check.error) {
        return NextResponse.json({ success: false, message: check.message }, { status: check.status });
      }

      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", parseResult.data.team_id)
        .eq("user_id", user.id);

      if (deleteError) throw new Error(deleteError.message);

      return NextResponse.json({ success: true, message: "You have left the team successfully." });
    }

    // Action: transfer leadership
    if (action === "transfer_leadership") {
      const body = await req.json();
      const parseResult = transferLeadershipSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      const check = await verifyLeaderAndDeadline(supabase, parseResult.data.team_id, user.id);
      if (check.error) {
        return NextResponse.json({ success: false, message: check.message }, { status: check.status });
      }

      if (parseResult.data.new_leader_id === user.id) {
        return NextResponse.json(
          { success: false, message: "You are already the team leader." },
          { status: 400 }
        );
      }

      // Check if new leader is an accepted member of this team
      const { data: newLeaderMembership, error: membershipError } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", parseResult.data.team_id)
        .eq("user_id", parseResult.data.new_leader_id)
        .eq("invitation_status", "accepted")
        .single();

      if (membershipError || !newLeaderMembership) {
        return NextResponse.json(
          { success: false, message: "New leader must be an active, accepted member of the team." },
          { status: 400 }
        );
      }

      // Perform transfer
      // Update team table leader_id
      const { error: teamUpdateError } = await supabase
        .from("teams")
        .update({ leader_id: parseResult.data.new_leader_id })
        .eq("id", parseResult.data.team_id);

      if (teamUpdateError) throw new Error(teamUpdateError.message);

      // Update role of current leader to member
      const { error: oldLeaderUpdateError } = await supabase
        .from("team_members")
        .update({ role: "member" })
        .eq("team_id", parseResult.data.team_id)
        .eq("user_id", user.id);

      if (oldLeaderUpdateError) throw new Error(oldLeaderUpdateError.message);

      // Update role of new leader to leader
      const { error: newLeaderUpdateError } = await supabase
        .from("team_members")
        .update({ role: "leader" })
        .eq("team_id", parseResult.data.team_id)
        .eq("user_id", parseResult.data.new_leader_id);

      if (newLeaderUpdateError) throw new Error(newLeaderUpdateError.message);

      return NextResponse.json({ success: true, message: "Leadership transferred successfully." });
    }

    // Action: set / confirm leader for team (sets leader_confirmed = true)
    if (action === "set_leader") {
      const body = await req.json();
      const parseResult = setLeaderSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: parseResult.error.issues[0]?.message },
          { status: 400 }
        );
      }

      // Must be current team leader to designate a leader
      const check = await verifyLeaderAndDeadline(supabase, parseResult.data.team_id, user.id);
      if (check.error) {
        return NextResponse.json({ success: false, message: check.message }, { status: check.status });
      }

      // Target user must be an accepted member of the team
      const { data: targetMembership, error: memberErr } = await supabase
        .from("team_members")
        .select("id, role")
        .eq("team_id", parseResult.data.team_id)
        .eq("user_id", parseResult.data.user_id)
        .eq("invitation_status", "accepted")
        .single();

      if (memberErr || !targetMembership) {
        return NextResponse.json(
          { success: false, message: "Target user must be an active team member." },
          { status: 404 }
        );
      }

      // If designating a different person as leader, transfer leadership first
      if (parseResult.data.user_id !== user.id) {
        // Update team leader_id
        const { error: teamUpdateError } = await supabase
          .from("teams")
          .update({ leader_id: parseResult.data.user_id, leader_confirmed: true })
          .eq("id", parseResult.data.team_id);
        if (teamUpdateError) throw new Error(teamUpdateError.message);

        // Demote current leader to member
        await supabase
          .from("team_members")
          .update({ role: "member" })
          .eq("team_id", parseResult.data.team_id)
          .eq("user_id", user.id);

        // Promote target to leader
        await supabase
          .from("team_members")
          .update({ role: "leader" })
          .eq("team_id", parseResult.data.team_id)
          .eq("user_id", parseResult.data.user_id);

        return NextResponse.json({ success: true, message: "Team leader designated and confirmed successfully." });
      }

      // Self-confirming as leader
      const { error: confirmError } = await supabase
        .from("teams")
        .update({ leader_confirmed: true })
        .eq("id", parseResult.data.team_id);

      if (confirmError) throw new Error(confirmError.message);

      return NextResponse.json({ success: true, message: "You are confirmed as the team leader." });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
