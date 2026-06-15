/**
 * CSV utilities for admin exports.
 *
 * Pure functions — no I/O, no Supabase, no Next.js imports.
 * Imported by `src/app/api/admin/export/route.ts` and unit tests.
 */

/** RFC 4180 compliant escape. Wraps in double quotes if the value contains
 *  a comma, double quote, or any newline; escapes internal quotes by doubling. */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Join an array of values into a single CSV row string (no trailing newline). */
export function toCSVRow(values: ReadonlyArray<unknown>): string {
  return values.map(escapeCSVValue).join(",");
}

/** Build a multi-line CSV body (header + rows) with `\r\n` line endings
 *  per RFC 4180. Excel and Google Sheets prefer CRLF. */
export function buildCSV(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const headerLine = toCSVRow(headers);
  const bodyLines = rows.map(toCSVRow).join("\r\n");
  return bodyLines ? `${headerLine}\r\n${bodyLines}\r\n` : `${headerLine}\r\n`;
}

/** UTF-8 BOM prefix so Excel correctly interprets non-ASCII characters
 *  (Bengali names, special characters, etc.) without garbled output. */
export const UTF8_BOM = "\uFEFF";

/** Convert a timestamp / ISO string to ISO 8601 (e.g. "2026-07-18T10:00:00.000Z").
 *  Returns "" for null/undefined/invalid input — never throws. */
export function toISO8601(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

/** "Yes" / "No" formatter for boolean CSV cells. */
export function formatBool(value: unknown): string {
  return value ? "Yes" : "No";
}

/** Pad an array of members to a fixed length with a placeholder (default "NA"). */
export function padMembers<T>(
  members: ReadonlyArray<T>,
  targetLength: number,
  placeholder: T,
): T[] {
  const padded = members.slice(0, targetLength);
  while (padded.length < targetLength) padded.push(placeholder);
  return padded;
}
