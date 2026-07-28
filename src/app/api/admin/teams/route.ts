import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/logger";

const bulkUpdateSchema = z.object({
  team_ids: z.array(z.string().uuid("Invalid team ID format")),
  status: z.enum(["forming", "registered", "submitted", "selected", "rejected", "finalist", "judging_ready", "waiting"]),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please login." }, { status: 401 });
    }

    // 2. Admin or coordinator role check
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userRecord || (userRecord.role !== "admin" && userRecord.role !== "coordinator")) {
      return NextResponse.json({ success: false, message: "Forbidden. Authorized access only." }, { status: 403 });
    }

    // 3. Validate body
    const body = await req.json();
    const parseResult = bulkUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    const { team_ids, status } = parseResult.data;
    if (team_ids.length === 0) {
      return NextResponse.json({ success: false, message: "No team IDs provided." }, { status: 400 });
    }

    // Fetch previous states for audit logging
    const { data: prevTeams } = await supabase
      .from("teams")
      .select("id, name, status")
      .in("id", team_ids);

    // 4. Update statuses
    const { error: updateErr } = await supabase
      .from("teams")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .in("id", team_ids);

    if (updateErr) throw new Error(updateErr.message);

    // 5. Log bulk action
    await logAdminAction(
      supabase,
      user.id,
      "BULK_UPDATE_TEAMS",
      "teams",
      team_ids[0] || "bulk",
      prevTeams,
      { team_ids, status }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${team_ids.length} teams to status ${status}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
