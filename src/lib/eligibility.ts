/**
 * Competition eligibility helper.
 *
 * `eligibility` is sourced from the database as a string column with two
 * documented values: `"internal"` (only SMUCT students) or `"both"` (any
 * university, with SMUCT students treated as a sub-case). This module narrows
 * the value to a strict union and exposes small predicates used by the
 * registration page, the public competition detail page, and any future
 * catalog surfaces.
 *
 * Defensive defaults: unknown values are treated as `"both"` (the more
 * permissive option) so an admin typo doesn't lock participants out.
 */

export const SMUCT_INSTITUTION =
  "Shanto-Mariam University of Creative Technology";

export type Eligibility = "internal" | "both";

export const ELIGIBILITY_INTERNAL: Eligibility = "internal";
export const ELIGIBILITY_BOTH: Eligibility = "both";

const KNOWN_VALUES: ReadonlySet<Eligibility> = new Set([
  ELIGIBILITY_INTERNAL,
  ELIGIBILITY_BOTH,
]);

/**
 * Narrow a raw `eligibility` value (string from API/DB) into the strict union.
 * Returns `"both"` as a safe default for unknown / missing / null values.
 */
export function normalizeEligibility(value: unknown): Eligibility {
  if (typeof value === "string" && KNOWN_VALUES.has(value as Eligibility)) {
    return value as Eligibility;
  }
  return ELIGIBILITY_BOTH;
}

export function isInternal(eligibility: unknown): boolean {
  return normalizeEligibility(eligibility) === ELIGIBILITY_INTERNAL;
}

export function isOpen(eligibility: unknown): boolean {
  return normalizeEligibility(eligibility) === ELIGIBILITY_BOTH;
}

/**
 * A user-supplied institution string is considered SMUCT if it matches
 * either the canonical name or the common abbreviation, case-insensitive.
 */
export function isSmuctInstitution(value: string | null | undefined): boolean {
  if (!value) return false;
  const lower = value.trim().toLowerCase();
  return lower.includes("smuct") || lower.includes("shanto-mariam");
}

/**
 * The semester field is required only for SMUCT students. For other
 * universities we send `"N/A"` so existing backend rows that require a
 * non-null semester remain valid without forcing a UI change.
 */
export const SEMESTER_PLACEHOLDER = "N/A";

/**
 * The department field is required only for SMUCT members. For non-SMUCT
 * members the field is locked + empty in the UI, so we send `"N/A"` so the
 * backend schema (which still requires a non-null department) stays valid.
 */
export const DEPARTMENT_PLACEHOLDER = "N/A";

/**
 * Valid semester values surfaced as quick-pick chips. The backend column
 * is a free-text string, but constraining the UI to these buckets keeps
 * data consistent for downstream analytics.
 */
export const SEMESTER_OPTIONS: ReadonlyArray<string> = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

/**
 * True when the semester input should be rendered for a given member.
 * A non-empty SMUCT institution is the trigger. We accept the same
 * matching rules as {@link isSmuctInstitution}.
 */
export function isSemesterRequiredFor(university: string | null | undefined): boolean {
  return isSmuctInstitution(university);
}
