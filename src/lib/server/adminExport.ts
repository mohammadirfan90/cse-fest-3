import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UTF8_BOM,
  buildCSV,
  formatBool,
  padMembers,
  toISO8601,
} from "@/lib/csv";

/** Helper to robustly extract fields from Supabase joined relations (handles both JSON object and array shapes) */
function getRelationField(rel: unknown, field: string, fallback: string = "N/A"): string {
  if (!rel) return fallback;
  if (Array.isArray(rel)) {
    const first = rel[0] as Record<string, unknown> | undefined;
    return (first?.[field] as string | undefined) ?? fallback;
  }
  const obj = rel as Record<string, unknown>;
  return (obj[field] as string | undefined) ?? fallback;
}

/** Helper to robustly extract object structures from Supabase joined relations */
function getRelationObject(rel: unknown, fallback: Record<string, unknown> | null = null): Record<string, unknown> | null {
  if (!rel) return fallback;
  if (Array.isArray(rel)) {
    return (rel[0] as Record<string, unknown>) ?? fallback;
  }
  return rel as Record<string, unknown>;
}

/** All supported admin export identifiers. */
export const EXPORT_TYPES = [
  "teams",
  "payments",
  "rankings",
  "participants",
  "all_teams",
  "submissions",
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export function isExportType(value: string): value is ExportType {
  return (EXPORT_TYPES as ReadonlyArray<string>).includes(value);
}

const MAX_TEAM_MEMBERS = 4;
const PLACEHOLDER_NAME = "NA";

export interface ExportResult {
  filename: string;
  headers: string[];
  rows: unknown[][];
}

/* ─────────────────────────── Teams ─────────────────────────── */
interface TeamWithJoins {
  id: string;
  name: string;
  status: string;
  created_at: string;
  competitions: unknown;
  users: unknown;
  team_members?: unknown;
}

async function buildTeamsExport(
  supabase: SupabaseClient,
  competitionId: string | null,
): Promise<ExportResult> {
  let query = supabase
    .from("teams")
    .select("id, name, status, created_at, competitions(name), users:leader_id(email), team_members(id, invitation_status)");
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query;
  if (error) throw error;
  const teams = (data ?? []) as unknown as TeamWithJoins[];

  return {
    filename: `teams_${competitionId ?? "all"}_${Date.now()}.csv`,
    headers: [
      "Team ID",
      "Team Name",
      "Competition",
      "Leader Email",
      "Status",
      "Member Count",
      "Created At (ISO)",
    ],
    rows: teams.map((t) => {
      const membersList = (t.team_members as { id: string; invitation_status: string }[] | null) || [];
      const memberCount = membersList.filter((m) => m.invitation_status === "accepted").length;
      return [
        t.id,
        t.name,
        getRelationField(t.competitions, "name"),
        getRelationField(t.users, "email"),
        t.status,
        memberCount,
        toISO8601(t.created_at),
      ];
    }),
  };
}

/* ─────────────────────────── Payments ─────────────────────────── */
interface PaymentWithJoins {
  id: string;
  amount: number;
  transaction_id: string;
  method: string;
  status: string;
  created_at: string;
  teams: unknown;
  competitions: unknown;
}

async function buildPaymentsExport(
  supabase: SupabaseClient,
  competitionId: string | null,
): Promise<ExportResult> {
  let query = supabase
    .from("payments")
    .select(
      "id, amount, transaction_id, method, status, created_at, teams(name), competitions(name)",
    );
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query;
  if (error) throw error;
  const payments = (data ?? []) as unknown as PaymentWithJoins[];

  return {
    filename: `payments_${competitionId ?? "all"}_${Date.now()}.csv`,
    headers: [
      "Payment ID",
      "Team Name",
      "Competition",
      "Amount",
      "Transaction ID",
      "Method",
      "Status",
      "Created At (ISO)",
    ],
    rows: payments.map((p) => [
      p.id,
      getRelationField(p.teams, "name"),
      getRelationField(p.competitions, "name"),
      p.amount,
      p.transaction_id,
      p.method,
      p.status,
      toISO8601(p.created_at),
    ]),
  };
}

/* ─────────────────────────── Rankings ─────────────────────────── */
interface RankingWithJoins {
  id: string;
  total_score: number;
  rank_position: number | null;
  is_finalist: boolean;
  is_public: boolean;
  teams: unknown;
  competitions: unknown;
}

async function buildRankingsExport(
  supabase: SupabaseClient,
  competitionId: string | null,
): Promise<ExportResult> {
  let query = supabase
    .from("rankings")
    .select(
      "id, total_score, rank_position, is_finalist, is_public, teams(name), competitions(name)",
    )
    .order("rank_position", { ascending: true });
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query;
  if (error) throw error;
  const rankings = (data ?? []) as unknown as RankingWithJoins[];

  return {
    filename: `rankings_${competitionId ?? "all"}_${Date.now()}.csv`,
    headers: [
      "Rank",
      "Team Name",
      "Competition",
      "Total Score",
      "Is Finalist",
      "Is Public",
    ],
    rows: rankings.map((r) => [
      r.rank_position ?? "—",
      getRelationField(r.teams, "name"),
      getRelationField(r.competitions, "name"),
      r.total_score,
      formatBool(r.is_finalist),
      formatBool(r.is_public),
    ]),
  };
}

/* ─────────────────────────── Participants ───────────────────────────
 * Joins team_members -> teams and team_members -> users -> profiles so
 * we get full profile details for both registered leaders and offline members. */
interface ParticipantRowJoined {
  role: string;
  invitation_status: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  university: string | null;
  department: string | null;
  semester: string | null;
  student_id: string | null;
  tshirt_size: string | null;
  teams: { 
    name: string; 
    competition_id: string;
    competitions: { name: string } | null;
  } | null;
  users: unknown;
}

async function buildParticipantsExport(
  supabase: SupabaseClient,
  competitionId: string | null,
): Promise<ExportResult> {
  let query = supabase
    .from("team_members")
    .select(`
      role,
      invitation_status,
      user_id,
      full_name,
      email,
      phone,
      gender,
      university,
      department,
      semester,
      student_id,
      tshirt_size,
      teams (
        name,
        competition_id,
        competitions (
          name
        )
      ),
      users!team_members_user_id_fkey (
        email,
        profiles (
          full_name,
          phone,
          gender,
          university,
          department,
          semester,
          student_id,
          tshirt_size
        )
      )
    `)
    .eq("invitation_status", "accepted");

  if (competitionId) {
    query = query.eq("teams.competition_id", competitionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as ParticipantRowJoined[];

  if (competitionId) {
    rows = rows.filter((m) => m.teams?.competition_id === competitionId);
  }

  const flat = rows.map((m) => {
    const userObj = getRelationObject(m.users);
    const profileObj = getRelationObject(userObj?.profiles);

    const name = m.full_name || (profileObj?.full_name as string | undefined) || "";
    const email = m.email || (userObj?.email as string | undefined) || "";
    const phone = m.phone || (profileObj?.phone as string | undefined) || "";
    const studentId = m.student_id || (profileObj?.student_id as string | undefined) || "";
    const university = m.university || (profileObj?.university as string | undefined) || "";
    const role = m.role || "member";
    const department = m.department || (profileObj?.department as string | undefined) || "";
    const semester = m.semester || (profileObj?.semester as string | undefined) || "";
    const team = m.teams?.name ?? "N/A";
    
    const teamsObj = getRelationObject(m.teams);
    const compsObj = getRelationObject(teamsObj?.competitions);
    const segment = (compsObj?.name as string | undefined) || "N/A";

    return {
      name,
      email,
      phone,
      studentId,
      university,
      role,
      department,
      semester,
      team,
      segment,
    };
  });

  return {
    filename: `participants_${competitionId ?? "all"}_${Date.now()}.csv`,
    headers: [
      "Name",
      "Email",
      "Phone",
      "Student ID",
      "University",
      "Role",
      "Department",
      "Semester",
      "Team",
      "Segment",
    ],
    rows: flat.map((p) => [
      p.name,
      p.email,
      p.phone,
      p.studentId,
      p.university,
      p.role,
      p.department,
      p.semester,
      p.team,
      p.segment,
    ]),
  };
}

/* ─────────────────────────── All Teams (with members) ─────────────────────────── */
interface TeamMemberJoined {
  user_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  university?: string | null;
  tshirt_size?: string | null;
  invitation_status: string;
  users: unknown;
}

interface DetailedTeamRow {
  id: string;
  name: string;
  leader_id: string;
  competitions: unknown;
  team_members: TeamMemberJoined[] | null;
}

async function buildAllTeamsExport(
  supabase: SupabaseClient,
  competitionId: string | null,
): Promise<ExportResult> {
  let query = supabase
    .from("teams")
    .select(`
      id,
      name,
      leader_id,
      competitions (
        name,
        max_members
      ),
      team_members (
        user_id,
        role,
        full_name,
        phone,
        email,
        university,
        tshirt_size,
        invitation_status,
        users!team_members_user_id_fkey (
          email,
          profiles (
            full_name,
            phone,
            university,
            tshirt_size
          )
        )
      )
    `);
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query;
  if (error) throw error;
  const teams = (data ?? []) as unknown as DetailedTeamRow[];

  const rows = teams.map((t) => {
    const membersList = (t.team_members ?? []).filter((m) => m.invitation_status === "accepted");
    
    // Find leader info
    const leaderMembership = membersList.find((m) => m.role === "leader" || m.user_id === t.leader_id);
    const leaderUserObj = getRelationObject(leaderMembership?.users);
    const leaderProfileObj = getRelationObject(leaderUserObj?.profiles);
    
    const leaderName = leaderMembership?.full_name || (leaderProfileObj?.full_name as string | undefined) || "N/A";
    const leaderPhone = leaderMembership?.phone || (leaderProfileObj?.phone as string | undefined) || "N/A";
    const leaderEmail = leaderMembership?.email || (leaderUserObj?.email as string | undefined) || "N/A";
    const leaderTshirt = leaderMembership?.tshirt_size || (leaderProfileObj?.tshirt_size as string | undefined) || "N/A";
    const leaderInstitution = leaderMembership?.university || (leaderProfileObj?.university as string | undefined) || "N/A";
    
    const competitionsObj = getRelationObject(t.competitions);
    const compName = (competitionsObj?.name as string | undefined) || "N/A";
    
    // Filter out leader to get other members
    const otherMembers = membersList.filter(
      (m) => m.role !== "leader" && m.user_id !== t.leader_id,
    );
    
    const memberDetails = otherMembers.flatMap((m) => {
      const mUserObj = getRelationObject(m.users);
      const mProfileObj = getRelationObject(mUserObj?.profiles);
      return [
        m.full_name || (mProfileObj?.full_name as string | undefined) || "NA",
        m.phone || (mProfileObj?.phone as string | undefined) || "NA",
        m.email || (mUserObj?.email as string | undefined) || "NA",
        m.tshirt_size || (mProfileObj?.tshirt_size as string | undefined) || "NA",
        m.university || (mProfileObj?.university as string | undefined) || "NA",
      ];
    });
    
    const totalMemberFieldsCount = (MAX_TEAM_MEMBERS - 1) * 5;
    const padded = padMembers<string>(memberDetails, totalMemberFieldsCount, PLACEHOLDER_NAME);

    return [
      t.name,
      compName,
      leaderName,
      leaderPhone,
      leaderEmail,
      leaderTshirt,
      leaderInstitution,
      ...padded
    ];
  });

  const headers = [
    "Team Name",
    "Competition",
    "Leader Name",
    "Leader Phone",
    "Leader Email",
    "Leader T-Shirt Size",
    "Leader Institution",
  ];
  for (let i = 1; i <= MAX_TEAM_MEMBERS - 1; i++) {
    headers.push(
      `Member ${i} Name`,
      `Member ${i} Phone`,
      `Member ${i} Email`,
      `Member ${i} T-Shirt Size`,
      `Member ${i} Institution`
    );
  }

  return {
    filename: `all_teams_${competitionId ?? "all"}_${Date.now()}.csv`,
    headers,
    rows,
  };
}

/* ─────────────────────────── Submissions ─────────────────────────── */
interface SubmissionRowJoined {
  id: string;
  title: string;
  google_docs_url: string;
  notes: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  teams: unknown;
  competitions: unknown;
  pdf_path: string | null;
  youtube_demo_url: string | null;
  team_id: string;
  competition_id: string;
}

interface ScoreRecord {
  team_id: string;
  competition_id: string;
  score: number;
}

async function buildSubmissionsExport(
  supabase: SupabaseClient,
  competitionId: string | null,
): Promise<ExportResult> {
  let query = supabase
    .from("submissions")
    .select(
      "id, title, google_docs_url, notes, status, submitted_at, reviewed_at, teams(name), competitions(name), pdf_path, youtube_demo_url, team_id, competition_id",
    );
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query;
  if (error) throw error;
  const submissions = (data ?? []) as unknown as SubmissionRowJoined[];

  const teamIds = submissions.map((s) => s.team_id);
  const compIds = [...new Set(submissions.map((s) => s.competition_id))];

  let scores: ScoreRecord[] = [];
  if (submissions.length > 0) {
    const { data: scoresData } = await supabase
      .from("scores")
      .select("team_id, competition_id, score")
      .in("team_id", teamIds)
      .in("competition_id", compIds);
    scores = (scoresData ?? []) as unknown as ScoreRecord[];
  }

  const scoreMap = new Map<string, number>();
  scores.forEach((sc) =>
    scoreMap.set(`${sc.team_id}:${sc.competition_id}`, sc.score),
  );

  return {
    filename: `submissions_${competitionId ?? "all"}_${Date.now()}.csv`,
    headers: [
      "Submission ID",
      "Title",
      "Team Name",
      "Competition",
      "Status",
      "Score",
      "PDF Link",
      "YouTube Demo URL",
      "Google Docs URL",
      "Notes",
      "Submitted At (ISO)",
      "Reviewed At (ISO)",
    ],
    rows: submissions.map((s) => [
      s.id,
      s.title,
      getRelationField(s.teams, "name"),
      getRelationField(s.competitions, "name"),
      s.status,
      scoreMap.get(`${s.team_id}:${s.competition_id}`) ?? "",
      s.pdf_path ?? "",
      s.youtube_demo_url ?? "",
      s.google_docs_url,
      s.notes ?? "",
      toISO8601(s.submitted_at),
      toISO8601(s.reviewed_at),
    ]),
  };
}

/* ─────────────────────────── Public entry ─────────────────────────── */

export async function buildExport(
  supabase: SupabaseClient,
  type: ExportType,
  competitionId: string | null,
): Promise<ExportResult> {
  switch (type) {
    case "teams":
      return buildTeamsExport(supabase, competitionId);
    case "payments":
      return buildPaymentsExport(supabase, competitionId);
    case "rankings":
      return buildRankingsExport(supabase, competitionId);
    case "participants":
      return buildParticipantsExport(supabase, competitionId);
    case "all_teams":
      return buildAllTeamsExport(supabase, competitionId);
    case "submissions":
      return buildSubmissionsExport(supabase, competitionId);
  }
}

/** Convert a built export to a UTF-8 BOM-prefixed CSV string ready for download. */
export function toCSVString(result: ExportResult): string {
  return UTF8_BOM + buildCSV(result.headers, result.rows);
}
