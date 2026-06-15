/**
 * Shared types and constants for admin CSV exports.
 *
 * The 4 export types mirror the spec in
 * DOC/admin-scoring-export-publish-plan.md > Phase B.
 */

/** All supported admin export identifiers. */
export const EXPORT_TYPES = [
  "participants",
  "all_participants",
  "all_teams",
  "submissions",
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export function isExportType(value: string): value is ExportType {
  return (EXPORT_TYPES as ReadonlyArray<string>).includes(value);
}

/** Result of a build* function, before CSV encoding. */
export interface ExportResult {
  filename: string;
  headers: string[];
  rows: unknown[][];
}

/** Default max team members for the all-teams export (per-competition overrides). */
export const DEFAULT_MAX_TEAM_MEMBERS = 4;

/** Placeholder for empty member columns. */
export const PLACEHOLDER_NAME = "NA";

/** Preview row shape returned by the route handler when ?format=json. */
export interface PreviewPayload {
  filename: string;
  headers: string[];
  totalRows: number;
  previewRows: unknown[][];
}
