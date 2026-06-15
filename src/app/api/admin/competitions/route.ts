import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/logger";

const competitionValidationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Competition name is required"),
  type: z.enum(["Showcase", "Programming", "Security", "Robotics", "Esports", "Custom"]),
  description: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  eligibility: z.enum(["internal", "external", "both"]),
  solo_allowed: z.boolean().default(true),
  team_allowed: z.boolean().default(true),
  min_members: z.number().int().min(1).default(1),
  max_members: z.number().int().min(1).default(4),
  registration_start: z.string().min(1, "Registration start is required"),
  registration_end: z.string().min(1, "Registration end is required"),
  submission_start: z.string().min(1, "Submission start is required"),
  submission_end: z.string().min(1, "Submission end is required"),
  entry_fee: z.number().min(0, "Entry fee cannot be negative").default(0),
  payment_instructions: z.string().optional().nullable(),
  rulebook_url: z.string().optional().nullable(),
  prize_pool: z.string().optional().nullable(),
  champion_prize: z.string().optional().nullable(),
  runner_up_prize: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "registration_open", "registration_closed", "archived"]).default("draft"),
  show_in_hero: z.boolean().default(false),
  short_name: z.string().max(10).optional().nullable(),
  hero_capacity: z.number().int().min(0).max(100).default(80),
  rounds_count: z.number().int().min(1).max(2).default(1),
  slug: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  banner_image_url: z.string().optional().nullable(),
});

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "comp-" + Math.random().toString(36).substring(2, 8);
}


// GET list of all competitions for admin view (including draft ones)
export async function GET() {
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

    // 2. Authorize role (admin only)
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

    const { data: competitions, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: competitions || [],
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch competitions.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Create or Update a competition
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
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
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    // 3. Validate request payload
    const body = await req.json();
    const parseResult = competitionValidationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed.",
        },
        { status: 400 }
      );
    }

    const compData = parseResult.data;
    const isUpdate = !!compData.id;

    let previousVal: any = null;
    let existingSlug: string | null = null;

    if (isUpdate) {
      // Get previous state for audit logging
      const { data } = await supabase
        .from("competitions")
        .select("*")
        .eq("id", compData.id)
        .single();
      previousVal = data;
      existingSlug = data?.slug || null;
    }

    // Determine target slug
    let slug = compData.slug || existingSlug;
    if (!slug) {
      const baseSlug = slugify(compData.name);
      slug = baseSlug;
      let count = 0;
      let unique = false;
      while (!unique) {
        const checkSlug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
        const { data: collision } = await supabase
          .from("competitions")
          .select("id")
          .eq("slug", checkSlug)
          .maybeSingle();

        if (!collision) {
          slug = checkSlug;
          unique = true;
        } else {
          count++;
        }
      }
    }

    // 4. Save (Upsert) to database
    const dbPayload = {
      ...compData,
      slug,
      updated_at: new Date().toISOString(),
    };

    const { data: savedComp, error: saveError } = await supabase
      .from("competitions")
      .upsert(dbPayload)
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save competition: ${saveError.message}`);
    }

    // 5. Write to Audit Logs
    await logAdminAction(
      supabase,
      user.id,
      isUpdate ? "UPDATE_COMPETITION" : "CREATE_COMPETITION",
      "competitions",
      savedComp.id,
      previousVal,
      savedComp
    );

    return NextResponse.json({
      success: true,
      message: `Competition successfully ${isUpdate ? "updated" : "created"}.`,
      data: savedComp,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE: Remove a competition and all its dependent data (teams, submissions, scores, rankings, payments)
const deleteSchema = z.object({
  competition_id: z.string().uuid("Invalid competition ID format"),
});

export async function DELETE(req: Request) {
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

    // 3. Validate body
    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Validation failed.",
        },
        { status: 400 }
      );
    }

    const { competition_id } = parsed.data;

    // 4. Load the competition to verify it exists and snapshot for audit
    const { data: competition, error: fetchErr } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competition_id)
      .single();

    if (fetchErr || !competition) {
      return NextResponse.json(
        { success: false, message: "Competition not found." },
        { status: 404 }
      );
    }

    // 5. Count dependent records for audit context
    const { count: teamCount } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("competition_id", competition_id);

    const { count: submissionCount } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("competition_id", competition_id);

    // 6. Delete the competition (CASCADE handles teams, submissions, scores, rankings, payments)
    const { error: deleteErr } = await supabase
      .from("competitions")
      .delete()
      .eq("id", competition_id);

    if (deleteErr) {
      throw new Error(`Failed to delete competition: ${deleteErr.message}`);
    }

    // 7. Audit log
    await logAdminAction(
      supabase,
      user.id,
      "DELETE_COMPETITION",
      "competitions",
      competition_id,
      {
        competition,
        cascaded_teams: teamCount ?? 0,
        cascaded_submissions: submissionCount ?? 0,
      },
      null
    );

    return NextResponse.json({
      success: true,
      message: `Competition "${competition.name}" and all associated data (${teamCount ?? 0} teams, ${submissionCount ?? 0} submissions) deleted permanently.`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to delete competition.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

