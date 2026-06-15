# Audit: admin-scoring-export-publish-plan.md vs Codebase

> Audited: 2026-06-15

---

## Summary

| Phase | Status |
|-------|--------|
| **A** – Scoring Simplification + Admin Submissions + Video Player | ⚠️ **Partially Done** |
| **B** – CSV Export System | ✅ **Done** |
| **C** – Two-Stage Publish + Payment Gating | ❌ **Not Done** |
| **D** – File Storage Restructuring + UX Polish | ⚠️ **Partially Done** |

---

## Phase A — Scoring Simplification + Admin Submissions + Video Player

### ✅ Done

| Item | Evidence |
|------|----------|
| `migration_simplify_scoring.sql` — drops `criteria_name`, `weight`, `max_score`, adds range constraint + unique constraint | `supabase/migration_simplify_scoring.sql` exists and matches spec |
| `/api/admin/judging` POST — uses `singleScoreSchema` (`team_id`, `competition_id`, `score 0–100`) | [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/judging/route.ts) L6–10 |
| `/api/admin/judging` POST — upserts single score, recalculates rankings with tie-breaker | [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/judging/route.ts) L190–288 |
| `scoringService.ts` — shared `upsertTeamScore()` + `recalculateRankings()` | [scoringService.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/scoringService.ts) |
| `POST /api/admin/submissions/score` — inline scoring route | [score/route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/submissions/score/route.ts) |
| `/api/admin/submissions` GET — `competition_id` filter + joins scores table | [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/submissions/route.ts) L44–77 |
| Admin submissions page — segment tabs (competition filter) + status tabs | [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/submissions/page.tsx) L53–106 |
| Admin submissions page — inline score input + Save button per row | [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/submissions/page.tsx) L319–344 |
| Admin submissions page — inline video player toggle | [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/submissions/page.tsx) L431–443 |
| Admin submissions page — PDF link (`Open PDF` → new tab) | [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/submissions/page.tsx) L396–404 |

### ❌ Not Done / Gaps

| Item | Details |
|------|---------|
| **Table layout for submissions** | Plan spec'd a `<table>` layout with columns (Team, Competition, Title, Status, Submitted At, Score, Actions). Actual UI still uses **card-grid layout** — not a table |
| **Video player spec: `max-w-3xl aspect-video`** | Player uses `w-full aspect-video` (no `max-w-3xl` 720px cap). Close but not spec-compliant |
| **`scoringService.ts` not actually used by routes** | Both `/api/admin/judging` POST and `/api/admin/submissions/score` POST implement their own score upsert inline — they **do NOT import or call** `scoringService.ts`. The shared utility exists but is unused |
| **Judging page — inline score input in leaderboard table** | Plan said replace the multi-criteria modal with an **inline score input in table row**. The actual judging page still uses the old multi-criteria **modal** (`Grade Entry` button opens scorecard with `criteria_name`/`weight` fields from `judging_criteria`). This is pre-plan behavior |
| **Judging page — remove `judging_criteria` display from sidebar** | The sidebar console still renders `judging_criteria` badges ("Criteria Checklist") at [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/judging/page.tsx) L435–443 |
| **Judging page — team select/deselect checkboxes** | The plan says admin can select/deselect teams for publishing from the leaderboard table. The current page has a separate "Select Finalists Checklist" panel — this was already there. Whether this counts as done depends on interpretation, but the **inline checkbox on each row** is missing |
| **Score column in submissions table** | Score shows in card view inline (the `<Input>` field shows current score), but it's not a separate labeled "Score" column as spec'd |

---

## Phase B — CSV Export System

### ✅ Done

| Item | Evidence |
|------|----------|
| `adminExport.ts` service with 6 export types | [adminExport.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/adminExport.ts) — types: `teams`, `payments`, `rankings`, `participants`, `all_teams`, `submissions` |
| **participants** export — full profile join (name, email, phone, studentId, university, role, department, semester, team) | [adminExport.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/adminExport.ts) L216–319 |
| **all_teams** export — leader name+phone + member columns padded with "NA" | [adminExport.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/adminExport.ts) L338–409 |
| **submissions** export — title, team, competition, status, docs link, timestamps | [adminExport.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/adminExport.ts) L425–464 |
| **payments** + **rankings** exports also included | L98–194 |
| UTF-8 BOM prefix for Excel compatibility | [adminExport.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/adminExport.ts) L490 |
| `/api/admin/export` — auth + JSON preview + CSV download + audit log | [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/export/route.ts) |
| `/admin/exports` dedicated page with 6 export cards, competition dropdown, live preview table | [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/exports/page.tsx) |
| Download button with filename from `Content-Disposition` header | [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/exports/page.tsx) L203–248 |

### ⚠️ Minor Gaps

| Item | Details |
|------|---------|
| **`submissions` export missing `score` and `pdfLink`/`videoLink` columns** | Plan spec'd: `teamName, title, status, score, pdfLink, videoLink, submittedAt`. The actual export has `google_docs_url` but no `score` (not joined from `scores` table) and no separate `pdf_path`/`video_path` columns |
| **`participants` export: missing `category` column** | Plan spec'd column list includes `category`. The export has `department` instead — may be intentional if category = competition segment, but it's not included as a separate column |

---

## Phase C — Two-Stage Publish + Onsite Teams + Payment Gating

### ✅ Done

| Item | Evidence |
|------|----------|
| `migration_two_stage_publish.sql` — adds `preliminary_published`, `final_published` to competitions | `supabase/migration_two_stage_publish.sql` exists and matches spec |
| DB constraint: `final_published = false OR preliminary_published = true` | `migration_two_stage_publish.sql` L11–13 |

### ❌ Not Done — Critical Gaps

| Item | Details |
|------|---------|
| **`/api/admin/judging/publish` — `publish_type: "preliminary" \| "final"`** | The actual publish route uses the old schema: `{ competition_id, is_public, finalist_team_ids }`. It has **NO** `publish_type` parameter, does not set `preliminary_published` or `final_published` on the competitions table, and has no two-stage logic |
| **Admin judging page — "Publish Preliminary" and "Publish Final" buttons** | The page has a single "Publish Leaderboard & Finalists" button. No preliminary/final distinction in the UI |
| **"Publish Final" blocked until preliminary is published** | Not implemented |
| **Selected teams unlock payment form on preliminary publish** | Payment gating is based on `rounds_count === 2` and team `status === "selected"`. It does **not** check `preliminary_published` on the competition |
| **Public Onsite Teams page — two-section display (Preliminary / Final)** | The `/finalists` page reads `is_public` from rankings and filters `is_finalist`. It does **not** read `preliminary_published` or `final_published` from the competitions table. No two-section display |
| **Public page: "Results Under Review" placeholder when not published** | Partially done — shows "Leaderboard Under Review" card when no rankings returned, but it's not tied to the `preliminary_published` flag |
| **Notification to selected teams on preliminary publish** | Not implemented in the publish route |
| **Admin payments page — "Confirm for Final Selection" button after payment approval** | Missing — the admin payments page has Approve/Reject/Resubmit for payment status, but no "Confirm for Final" / "Decline for Final" CTA |
| **Admin payments page — segment filter (by competition)** | Not implemented — payments are filtered only by status, not by competition |
| **Admin payments page — show team score+rank alongside payment** | Not shown in the payments queue |
| **Payment API gate — server-side check for `preliminary_published = true`** | Not implemented — the `/api/payments` route does not check `preliminary_published` |

---

## Phase D — File Storage Restructuring + UX Polish

### ✅ Done

| Item | Evidence |
|------|----------|
| `getCompetitionSlug()` function — fetches slug from DB | [submissionStorage.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/submissionStorage.ts) L15–28 |
| New storage structure: `{slug}/{teamId}/` | `submissionDirPath()` routes through slug via `isSlug()` check |
| UUID-based filenames (no user input in filename) | `crypto.randomUUID()` in `writeSubmissionFile()` |
| Range requests for video streaming | [submissionStorage.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/submissionStorage.ts) L121–148 |
| `migration_move_submission_files.sql` — migration script for old files | `supabase/migration_move_submission_files.sql` exists |

### ❌ Not Done

| Item | Details |
|------|---------|
| **Video compression tips in `SubmissionFormCard.tsx`** | No text like "Compress video to under 100MB" or "HandBrake" found anywhere in the submissions UI |
| **Upload progress indicator** | No percentage progress shown during file upload |
| **File size display after selection** | Not implemented in the submissions form |

### ⚠️ Partial / Leftover

| Item | Details |
|------|---------|
| `getCompetitionCategory()` still present | The old category-based function still exists in `submissionStorage.ts` L32–38 — it was supposed to be replaced, not supplemented |

---

## UX Polish Checklist (Plan Section)

| Item | Status |
|------|--------|
| Segment tab counts (e.g. "Software (12)") on submissions page | ❌ Not done |
| Bulk select/reject checkboxes on submissions page | ❌ Not done |
| Score sort ascending/descending in submissions table | ❌ Not done (table layout not implemented either) |
| "Scored" vs "Unscored" filter tab | ❌ Not done |
| Score input with slider + number combo on judging page | ❌ Not done |
| Auto-save score on blur (debounced) on judging page | ❌ Not done |
| Visual score progress bar (0–100 fill) on judging page | ❌ Not done |
| Step-by-step wizard feel on participant payments page | ❌ Not done |
| Countdown timer to payment deadline | ❌ Not done |
| Animated team cards on public finalists page | ❌ Not done |
| Segment-specific accent colors on public finalists page | ❌ Not done |
| "Congratulations" banner for finalist teams | ❌ Not done |

---

## Priority Action Items

> [!CAUTION]
> **Phase C is completely unimplemented at the business logic level.** The DB migration exists, but the API and UI still use the old single-stage publish flow. This must be implemented before any preliminary selection can work correctly.

> [!WARNING]
> **The `scoringService.ts` shared utility is unused.** Both scoring routes duplicate the upsert logic inline. They should be refactored to call the service, or the service file should be deleted to avoid confusion.

> [!IMPORTANT]
> **The admin judging page still has the old multi-criteria modal.** The scoring simplification was only applied to the API/DB — the UI still shows the old `criteria_name`/`weight` grading scorecard which will break because the DB columns no longer exist.

### Recommended Order

1. **Fix judging page UI** — replace the multi-criteria modal with inline score input (0–100) [Phase A]
2. **Implement two-stage publish** — update publish API + admin judging page buttons + public finalists page [Phase C]
3. **Implement payment gating** — add `preliminary_published` check to `/api/payments` + participant payments UI messaging [Phase C]
4. **Admin payments enhancements** — competition filter + score/rank display + "Confirm/Decline Final" buttons [Phase C]
5. **Video compression tips** + file size display on submission form [Phase D]
6. **UX polish items** — tab counts, bulk actions, score sort [Phase A/D polish]
