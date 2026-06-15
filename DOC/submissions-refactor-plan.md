# Submissions System Refactor Plan

This document outlines the changes to replace the `google_docs_url` text input with two file inputs (PDF + optional Video) for project submissions.

## 1. Goal

Replace the `google_docs_url` text field on the participant submissions page with two file inputs:

- **PDF** — required, max 5 MB, `application/pdf`
- **Video** — optional, max 200 MB, served from the server's local file system

The server returns a stable stored path per submission row. Supabase stores only the **path/URL string** in the `submissions` table. The UI exposes only file inputs — no link field.

## 2. Files Touched

| Layer | File | Change |
|---|---|---|
| DB | `supabase/migration_submission_files.sql` (new) | Drop `google_docs_url`, add `pdf_path`, `video_path` |
| API | `src/app/api/submissions/route.ts` | Switch from JSON to `multipart/form-data`; stream files to disk; persist paths |
| API | `src/app/api/submissions/file/[id]/route.ts` (new) | Authenticated streaming endpoint (PDF inline, video with Range support) |
| API | `src/app/api/admin/submissions/route.ts` | Select new columns |
| API | `src/app/api/admin/team-review/route.ts` | Update SELECT shape |
| Lib | `src/lib/server/submissionStorage.ts` (new) | Path resolver + safe streaming helper |
| Lib | `src/lib/server/submissionSubmissionService.ts` (new) | Submit/update use case extracted from route |
| UI | `src/app/(participant)/submissions/page.tsx` | Replace `Input` for link with two `FileDropzone` components |
| UI | `src/app/(participant)/submissions/SubmissionFormCard.tsx` (new) | Extracted form component |
| UI | `src/app/(participant)/submissions/SubmissionDetailsCard.tsx` (new) | Extracted view card |
| UI | `src/components/submissions/FileDropzone.tsx` (new) | Reusable file input with size/MIME hints |
| UI | `src/app/(admin)/admin/submissions/page.tsx` | Replace "Open Google Docs" link with "View PDF" + "Play Video" buttons |
| UI | `src/app/(admin)/admin/verifications/page.tsx` | Same for the submission viewer modal |
| Config | `next.config.ts` | Update CSP `media-src` and `frame-src` for video + PDF iframe |
| Config | `.gitignore` | Exclude `storage/` |

## 3. Database Migration

`supabase/migration_submission_files.sql`:

```sql
ALTER TABLE public.submissions
  ADD COLUMN pdf_path TEXT NOT NULL DEFAULT '',
  ADD COLUMN video_path TEXT;

ALTER TABLE public.submissions
  DROP COLUMN google_docs_url;

ALTER TABLE public.submissions
  ALTER COLUMN pdf_path DROP DEFAULT;
```

Constraints kept identical: `UNIQUE(team_id, competition_id)`, status enum unchanged. RLS policies remain — the new columns fall under the existing `submissions` policies. (Pre-launch product, so dropping the legacy column is acceptable.)

## 4. API Contract

### `POST /api/submissions` — `multipart/form-data`

Fields:
- `team_id` (uuid, text)
- `title` (text, ≥5 chars)
- `notes` (text, optional)
- `pdf` (File, required, ≤5 MB, `application/pdf`)
- `video` (File, optional, ≤200 MB, `video/*`)

Validation: `zod` parses non-file fields, then file checks:
- `pdf.size ≤ 5 * 1024 * 1024`
- `video.size ≤ 200 * 1024 * 1024` and `video === null || video.type.startsWith("video/")`
- MIME type validated server-side via reading the first bytes (`file-type` library) — not just trusting the client's `Content-Type`.

Server flow (early returns, no deep nesting):

1. `createClient()` → require user (401 if none)
2. Parse form data, validate with zod (400 on failure)
3. Look up `team` and `competitions` (404 on miss)
4. Membership check (403)
5. Window check (400 if before/after)
6. Reuse a single helper to write both files to `process.cwd() + (env.SUBMISSIONS_DIR ?? "storage/submissions") + /${team_id}/`
7. Upsert submission row with `pdf_path` and `video_path`, `status="submitted"`
8. Update team status to `submitted`
9. Return `{ success: true, message: "..." }`

If the upsert fails after the files are written, the helper deletes them (best-effort cleanup) so we don't leak orphan files.

### `GET /api/submissions/file/[id]?type=pdf|video` (new)

- Auth required. Loads the submission, checks the caller is either an admin or an accepted member of the team.
- Resolves the path on disk, streams with the appropriate `Content-Type` and `Content-Disposition`.
- For `video`, supports HTTP `Range` requests so `<video>` seeking works.

## 5. New Library: `src/lib/server/submissionStorage.ts`

Single-purpose module (avoids a generic `utils/fileHelper.ts`):

```ts
export const SUBMISSIONS_ROOT = path.join(
  process.cwd(),
  process.env.SUBMISSIONS_DIR ?? "storage/submissions"
);

export function submissionFilePath(teamId: string, fileName: string): string
export function writeSubmissionFile(teamId: string, originalName: string, bytes: Buffer): Promise<{ storedName: string; absPath: string }>
export function deleteSubmissionFile(absPath: string): Promise<void>
export function streamSubmissionFile(absPath: string, req: Request): Promise<Response>  // supports Range
export const MAX_PDF_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
```

Uses `node:fs/promises` for writes. Multipart parsing buffers in memory in Next.js route handlers; for 200 MB we read `arrayBuffer()` once and write atomically to a temp file then rename.

## 6. New Service: `src/lib/server/submissionSubmissionService.ts`

Extracted to keep the route file under 200 lines. Single exported function:

```ts
type SubmitResult = { ok: true; submissionId: string } | { ok: false; code: number; message: string }
export async function submitOrUpdateProposal(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData
): Promise<SubmitResult>
```

Encapsulates auth, team lookup, window check, file write, and the upsert. The route handler maps the result to a `NextResponse`.

## 7. UI Changes

### Participant — `src/app/(participant)/submissions/page.tsx`

- Remove `googleDocsUrl` state and the two `<Input label="Google Docs Link" />` fields.
- Add a new `SubmissionFormCard` (extracted) that renders:
  - Title input
  - Notes textarea
  - `<FileDropzone label="Project PDF" accept="application/pdf" maxSizeMB={5} required />`
  - `<FileDropzone label="Demo Video (optional)" accept="video/*" maxSizeMB={200} />`
- The "Update" path reuses the same card, pre-filling the existing filenames and letting the user pick a replacement. If no new file is chosen for a slot, the server keeps the previous path.
- The "view existing submission" branch shows a `SubmissionDetailsCard` with two buttons:
  - "View PDF" → `<a href="/api/submissions/file/${id}?type=pdf" target="_blank">`
  - "Play Video" → `<a href="/api/submissions/file/${id}?type=video" target="_blank">` (only when `video_path` is non-null)
- Submission state shape updated to `{ id, title, pdf_path, video_path, notes, status, submitted_at }` (no `google_docs_url`).

### `FileDropzone`

`src/components/submissions/FileDropzone.tsx` (≤80 lines). Uses `lucide-react` `FileText` / `Video` icons, shadcn-style border states, and shows file name + size once selected. No external dropzone library — keep the surface small.

### Admin — `src/app/(admin)/admin/submissions/page.tsx`

- Update `SubmissionItem` type: replace `google_docs_url` with `pdf_path: string`, `video_path: string | null`.
- Replace the "Open Proposal Document" `<a>` block with a small button row:
  - "View PDF" → `/api/submissions/file/${s.id}?type=pdf` (admin passes the auth check)
  - "Play Video" → only if `s.video_path` is non-null

### Admin — `src/app/(admin)/admin/verifications/page.tsx`

- Same change in the submission viewer modal: replace the "Open Submission Document" link with the two buttons.

## 8. Validation Order (per SKILL.md — "early return, no deep nesting")

Each handler follows this exact order and uses early returns. No nested ifs beyond depth 2. The multi-step logic for the POST handler is fully extracted into `submissionSubmissionService.ts` so the route file is a thin shell.

## 9. Security Considerations

- **Auth-gated reads** — `/api/submissions/file/[id]` checks the session, then checks `is_admin(uid())` or accepted team membership. Prevents guessing URLs.
- **Path traversal** — file names are stored as `crypto.randomUUID() + .ext` and never derived from user input. `submissionFilePath` joins with `path.join` and resolves to confirm it still lives under `SUBMISSIONS_ROOT` before serving.
- **MIME validation** — uses the first 16 bytes (`file-type` package) to confirm `application/pdf` / `video/*`. Trusts neither client header nor extension alone.
- **Size limits** — enforced before `arrayBuffer()` so we never allocate 200 MB+ for a malicious upload.
- **CSP** — `next.config.ts` needs `media-src 'self'` and `frame-src 'self'` for the `<video>` element and the PDF iframe.
- **No PII in audit logs** — `logAdminAction` receives only `{ pdf_path, video_path }` strings, not file contents.

## 10. Open Decisions (need your pick)

1. **Storage root path** — recommended: `process.cwd() + "/storage/submissions"`, configurable via `SUBMISSIONS_DIR` env. Add `/storage` to `.gitignore` and create a `storage/.gitkeep` placeholder.
2. **File replacement on update** — recommended: **overwrite**. Re-uploads replace the file at the same path; we use the existing `pdf_path` / `video_path` slots. The previous file is removed (best-effort) before the new one is written.
3. **Disk cap / cleanup** — recommended: out of scope for this refactor; add a follow-up `submissionStorage.gc()` invoked by a cron if needed. For the festival, total storage is bounded (≤200 MB × expected submissions), and event ends July 18.
4. **Admin preview UX** — recommended: **inline card with iframe for PDF and `<video controls>` for video** in the admin review page, using the same `/api/submissions/file/[id]` endpoint.
5. **Backward compatibility of `google_docs_url`** — recommended: **drop the column**. The platform has not been launched for participants yet (per `AGENTS.md` PHASES context; event is 2026-07-18). This keeps the schema clean.

## 11. Implementation Steps

1. Add `file-type` to `package.json` (`pnpm add file-type`).
2. Write and apply `supabase/migration_submission_files.sql`.
3. Create `src/lib/server/submissionStorage.ts` (path resolver + write + delete + stream with Range).
4. Create `src/app/api/submissions/file/[id]/route.ts`.
5. Create `src/lib/server/submissionSubmissionService.ts` (use case).
6. Refactor `src/app/api/submissions/route.ts` to multipart + service module; drop `google_docs_url` references.
7. Update `src/app/api/admin/submissions/route.ts` and `src/app/api/admin/team-review/route.ts` selects.
8. Create `src/components/submissions/FileDropzone.tsx`.
9. Split `src/app/(participant)/submissions/page.tsx` into `page.tsx` + `SubmissionFormCard.tsx` + `SubmissionDetailsCard.tsx`.
10. Update `src/app/(admin)/admin/submissions/page.tsx` and `src/app/(admin)/admin/verifications/page.tsx`.
11. Update `next.config.ts` CSP `media-src` and `frame-src` for the video player + PDF iframe.
12. Update `.gitignore` to exclude `storage/`.
13. Run `pnpm lint` and `pnpm build` to validate.

## 12. Test Plan (manual, since no test suite is present)

- Participant uploads a 4 MB PDF only → success, submission row has `pdf_path` set, `video_path` null.
- Participant uploads a 4 MB PDF + 150 MB video → success, both paths set.
- Participant uploads a 6 MB PDF → 400 with size error.
- Participant uploads a 250 MB video → 400 with size error.
- Non-member hits `/api/submissions/file/{id}?type=pdf` → 403.
- Admin hits the same URL → 200, PDF inline.
- Video URL with a `Range: bytes=0-1023` header → 206 Partial Content, body length 1024.
- Update flow: change title only, do not re-pick a file → server keeps old paths.
- Update flow: re-pick PDF only → server overwrites pdf file, `video_path` unchanged.
- Replace attempt: malicious `..` in filename → sanitized to uuid, no traversal.
