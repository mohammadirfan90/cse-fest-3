import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/utils/logger";
import {
  EXPORT_TYPES,
  buildExport,
  isExportType,
  toCSVString,
  type ExportType,
} from "@/lib/server/adminExport";

/** Maximum rows returned in a JSON preview to keep the response small. */
const PREVIEW_ROW_LIMIT = 50;

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
        { status: 401 },
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
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type");
    const competitionId = searchParams.get("competition_id");
    const format = searchParams.get("format") ?? "csv";

    if (!exportType || !isExportType(exportType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing or invalid export type. Must be one of: ${EXPORT_TYPES.join(", ")}.`,
        },
        { status: 400 },
      );
    }
    const type = exportType as ExportType;

    const result = await buildExport(supabase, type, competitionId);

    // JSON preview: small payload for the tabbed UI live preview
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: {
          filename: result.filename,
          headers: result.headers,
          totalRows: result.rows.length,
          previewRows: result.rows.slice(0, PREVIEW_ROW_LIMIT),
        },
      });
    }

    // CSV download — audit log it (sensitive admin data egress)
    await logAdminAction(
      supabase,
      user.id,
      "csv_export",
      "export",
      null,
      null,
      { type, competition_id: competitionId, row_count: result.rows.length },
    );

    return new Response(toCSVString(result), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to export CSV.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
