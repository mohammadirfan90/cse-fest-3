# CSE Fest 2026 — Admin, Scoring, Export, Publish & Payment Flow Overhaul

> **Scope**: Simplify scoring, add segment-filtered views, build proper CSV exports, implement two-stage publish (preliminary + final), restructure file storage, improve video player UX, and gate payments behind preliminary selection.

---

## User Review Required

> [!IMPORTANT]
> **Two-stage Publish changes the team status flow.**  
> Currently: `submitted → selected → finalist`  
> Proposed: `submitted → selected (preliminary) → payment_pending → finalist (final)`  
> This adds a `payment_pending` status to the team status enum. All existing code referencing team statuses must be updated.

> [!WARNING]
> **Scoring system replacement is destructive.**  
> The current multi-criteria weighted scoring (scores table: criteria_name, weight, score, max_score) will be replaced with a single `score` (0–100) per team per competition. Any existing scores in the `scores` table will need to be dropped/migrated. Since the event hasn't launched yet, this is safe.

> [!IMPORTANT]
> **File storage restructuring.**  
> Existing files in `storage/submissions/software/{teamId}/` will need to be moved to the new `storage/submissions/{competition_slug}/{teamId}/` structure. A one-time migration script will be provided.

---

## Open Questions

None — all questions resolved in clarification round.

---

## Proposed Changes (4 Phases)

The work is split into 4 phases, ordered by dependency:

| Phase | Focus | Est. Files |
|-------|-------|------------|
| **A** | Scoring simplification + Admin submissions table overhaul + Video player | ~10 files |
| **B** | CSV Export system (4 export types) | ~3 files |
| **C** | Two-stage publish + Onsite Teams page + Payment gating | ~8 files |
| **D** | File storage restructuring + UX polish + Edge case hardening | ~5 files |

---

## Phase A: Scoring Simplification + Admin Submissions + Video Player

**Goal:** Replace multi-criteria scoring with single score (0–100), add segment filtering to admin submissions, improve video player size and fullscreen.

---

### Database Migration

#### [NEW] supabase/migration_simplify_scoring.sql

```sql
-- Simplify scores table: remove multi-criteria, add single score
ALTER TABLE public.scores
  DROP COLUMN IF EXISTS criteria_name,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS max_score;

-- Rename 'score' column stays as-is (0-100 integer)
-- Add constraint
ALTER TABLE public.scores
  ADD CONSTRAINT score_range CHECK (score >= 0 AND score <= 100);

-- Add unique constraint: one score per team per competition
ALTER TABLE public.scores
  ADD CONSTRAINT unique_team_comp_score UNIQUE (team_id, competition_id);

-- Update rankings total_score to match (0-100 range)
-- No schema change needed for rankings table itself
```

**What changes:**
- `scores` table loses `criteria_name`, `weight`, `max_score` columns
- Single `score` column (0–100) per team per competition
- `judging_criteria` JSONB on `competitions` table becomes unused (keep for backward compat, ignore in UI)

---

### Admin Submissions Page — Segment Filtering + Video Player

#### [MODIFY] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/submissions/page.tsx)

**Changes:**
1. **Add segment (competition) filter tabs** — horizontal tabs showing each competition name (e.g., "Software Showcase", "IoT Showcase", "Idea Showcase"), replacing the current status-only filter
2. **Add status filter as secondary** — below segment tabs, the existing status tabs remain
3. **Restructure as a table view** — replace the current card-grid layout with a proper `<table>` for scannable review (columns: Team, Competition/Segment, Title, Status, Submitted At, Actions)
4. **Clicking a submission row** opens a detail panel/modal showing:
   - Team name + competition segment
   - PDF link (opens in new tab)
   - Video player (inline, 16:9, max-width 720px, with native fullscreen controls)
   - Notes
   - Score input (0–100) with save button
   - Select/Reject buttons
5. **Video player sizing**: `max-w-3xl aspect-video` (~720px), with `controls` attribute including native fullscreen
6. **Add score display column** in the table showing current score (or "—" if unscored)

**New data flow:**
- Fetch submissions grouped by competition
- Competition list populates the segment tabs
- Each submission row shows score (fetched from simplified `scores` table)

---

#### [MODIFY] [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/submissions/route.ts)

**Changes:**
1. Add `competition_id` query param filter for segment filtering
2. Join `scores` table to include current score per submission/team
3. Add `score` field to response shape

**New response shape:**
```typescript
{
  id: string;
  team_id: string;
  competition_id: string;
  title: string;
  pdf_path: string;
  video_path: string | null;
  notes: string | null;
  status: string;
  submitted_at: string;
  score: number | null; // from scores table
  teams: { id: string; name: string; leader_id: string };
  competitions: { id: string; name: string; type: string };
}
```

---

### Scoring System Simplification

#### [MODIFY] [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/judging/route.ts)

**Changes:**
1. **POST handler**: Replace multi-criteria score array with single `score` (0–100)
2. **New Zod schema:**
   ```typescript
   const saveScoreSchema = z.object({
     team_id: z.string().uuid(),
     competition_id: z.string().uuid(),
     score: z.number().min(0).max(100),
   });
   ```
3. **Score save logic**: Upsert single row into `scores` table with `score` value
4. **Ranking update**: `total_score = score` (direct mapping, no weighted calculation)
5. **GET handler**: Return teams with their single score value

#### [MODIFY] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/judging/page.tsx)

**Changes:**
1. Remove multi-criteria scoring modal (the complex modal with per-criterion inputs)
2. Replace with inline score input (0–100) in the leaderboard table row itself
3. Add a small "Save" button next to the score input
4. Score column shows editable input when focused, display value otherwise
5. Remove `judging_criteria` display from the sidebar console
6. Leaderboard updates automatically on score save (re-rank)
7. **Admin can select/deselect teams for publishing** directly from the leaderboard table (checkboxes)

---

### Admin Submissions — Scoring from Submissions Page

#### [NEW] POST `/api/admin/submissions/score` route

**Purpose:** Allow scoring a team directly from the admin submissions review page (inline scoring without navigating to the judging page).

```typescript
// POST body
{
  team_id: string;
  competition_id: string;
  score: number; // 0-100
}
```

This reuses the same upsert + ranking recalculation logic from the judging route (extracted to a shared utility).

#### [NEW] [scoringService.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/scoringService.ts)

Shared scoring logic extracted from the judging route:
- `upsertTeamScore(supabase, adminId, teamId, competitionId, score)` → upserts score, recalculates rankings, writes audit log
- Used by both `/api/admin/judging` POST and `/api/admin/submissions/score` POST

---

### Edge Cases — Phase A

| Edge Case | Handling |
|-----------|----------|
| Admin scores a team that hasn't submitted yet | Allow — score exists independently of submission |
| Admin scores 0 | Allowed — valid score, team appears at bottom of leaderboard |
| Admin changes score after publish | Allowed — rankings recalculated, but published state unchanged until re-publish |
| Two admins score the same team simultaneously | Last-write-wins (upsert). Consider: show "last scored by" + timestamp |
| Score > 100 or < 0 | Rejected by Zod schema + DB constraint |
| Competition has no submissions yet | Leaderboard shows "No teams to evaluate" empty state |
| Video file is corrupted/unplayable | Show player with error fallback: "Unable to play video. Download file instead." |
| PDF fails to load in new tab | Browser handles PDF rendering natively; if 404, the file API returns proper error |

---

## Phase B: CSV Export System

**Goal:** Build 4 export types with proper profile data joins and segment filtering.

---

### Export Types

| # | Export Name | Columns | Filter |
|---|-------------|---------|--------|
| 1 | **Participants by Segment** | name, email, phone, studentId, university, role, category, semester, team | Per competition |
| 2 | **All Participants** | Same as above | None (all) |
| 3 | **All Teams** | teamName, leaderPhone, leaderName, member1Name, member2Name, member3Name, ... (NA for empty) | Optional per competition |
| 4 | **Submissions by Segment** | teamName, title, status, score, pdfLink, videoLink, submittedAt | Per competition |

---

#### [MODIFY] [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/export/route.ts)

**Complete rewrite.** Current export is minimal (Team ID, name, status, leader email). New version:

1. **`type=participants&competition_id=xxx`** — Join `team_members` → `profiles` → `teams` → `competitions` to get per-participant rows with full profile data
2. **`type=all_participants`** — Same join but no competition filter
3. **`type=teams&competition_id=xxx`** — For each team, fetch leader profile + all member profiles. Pad member columns to max_members with "NA"
4. **`type=submissions&competition_id=xxx`** — Join submissions + teams + scores

**Key implementation detail for teams export:**
```
Headers: Team Name, Leader Phone, Leader Name, Member 1 Name, Member 2 Name, Member 3 Name, Member 4 Name
Row:     "Alpha Team", "01712345678", "John Doe", "Jane Smith", "Bob Lee", "NA", "NA"
```
Member columns are dynamically generated based on `max_members` from the competition, padded with "NA".

---

#### [MODIFY] Admin dashboard — Add export UI

Add an "Export Data" section/modal to the admin panel (accessible from sidebar or toolbar) with:
- Competition selector dropdown
- Export type radio buttons (4 options)
- "Download CSV" button
- Shows loading state during export

This can be added to:
- The admin submissions page (for submission exports)
- A new dedicated `/admin/exports` page (for all export types)

#### [NEW] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/exports/page.tsx)

Dedicated admin exports page with:
- Competition dropdown filter
- 4 export cards (participants by segment, all participants, all teams, submissions)
- Each card has a download button
- Shows file size estimate and row count after generating

---

### Edge Cases — Phase B

| Edge Case | Handling |
|-----------|----------|
| Team has fewer members than max_members | Pad remaining member columns with "NA" |
| Team has no leader profile | Show "N/A" for leader fields |
| Participant has no profile completed | Include row but with empty fields for missing data |
| CSV cell contains commas or quotes | Already handled by `escapeCSVValue()` (exists in codebase) |
| Export with no data | Return CSV with headers only + show "No data to export" toast |
| Very large export (1000+ rows) | Stream response, no pagination needed for CSV |
| Unicode characters in names | UTF-8 BOM prefix added to CSV for Excel compatibility |
| Competition has no teams registered | Return empty CSV with headers |

---

## Phase C: Two-Stage Publish + Onsite Teams Page + Payment Gating

**Goal:** Implement the complete flow: Score → Leaderboard → Preliminary Publish → Payment → Final Selection → Final Publish.

---

### State Machine (Updated Team Status Flow)

```
submitted
  → [Admin scores team] → scored (or stays submitted, score is separate)
  → [Admin selects for preliminary] → selected
  → [Admin rejects] → rejected

selected (preliminary)
  → [Admin publishes preliminary] → Public "Onsite Teams" page shows team
  → [Payment enabled in participant dashboard]
  → [Team pays] → payment submitted (payment.status = pending)
  → [Admin verifies payment] → payment.status = approved
  → [Admin accepts for final] → finalist
  → [Admin declines] → rejected (or back to selected)

finalist (final)
  → [Admin publishes final] → Public page shows final selections
```

---

### Database Migration

#### [NEW] supabase/migration_two_stage_publish.sql

```sql
-- Add publish phase tracking to competitions
ALTER TABLE public.competitions
  ADD COLUMN preliminary_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN final_published BOOLEAN DEFAULT FALSE;

-- Add payment_round to payments to distinguish which phase the payment is for
-- (not strictly necessary if one payment per team, but good for clarity)
```

No new team statuses needed — we use the existing enum values (`selected`, `finalist`, `rejected`) plus the payment status to determine the current phase.

---

### Admin Judging Page — Two Publish Buttons

#### [MODIFY] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/judging/page.tsx)

**Changes to the Leaderboard Console (right sidebar):**

1. **"Publish Preliminary Results" button** — When clicked:
   - Sets `competitions.preliminary_published = true`
   - Sets `rankings.is_public = true` for selected teams only
   - Marks selected team statuses so their payment interface unlocks
   - The public Onsite Teams page begins showing preliminary selections

2. **"Publish Final Selection" button** — Visible only after preliminary is published + payments are processed:
   - Sets `competitions.final_published = true`
   - Updates the public Onsite Teams page to show final selections
   - Final selected teams are marked as `finalist`

3. **Admin can still select/deselect teams from leaderboard** at any point
4. **Admin can add new teams from leaderboard** even after preliminary publish (your requirement)
5. **Admin can decline previously selected teams** — moves them back to rejected

---

#### [MODIFY] [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/admin/judging/publish/route.ts)

**Changes:**
1. Accept `publish_type: "preliminary" | "final"` in the request body
2. **Preliminary publish:**
   - Set `competitions.preliminary_published = true`
   - Set `rankings.is_public = true` for all selected teams
   - Send notification to selected teams: "Your team has been selected for CSE Fest 2026! Please complete payment."
3. **Final publish:**
   - Set `competitions.final_published = true`
   - Verify that finalist teams have approved payments
   - Send notification: "Congratulations! Your team has been confirmed as a finalist!"

---

### Public Onsite Teams Page

#### [MODIFY] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(public)/finalists/page.tsx)

**Rename and restructure:**
- Route stays at `/finalists` but page title becomes "**Onsite Teams**"
- Shows two sections depending on competition publish state:
  1. **Preliminary Selected Teams** (when `preliminary_published = true`) — shows selected teams per segment
  2. **Final Selected Teams** (when `final_published = true`) — shows finalist teams per segment

**Display logic:**
```
if (competition.final_published):
  Show "Final Onsite Teams" with finalist teams
else if (competition.preliminary_published):
  Show "Preliminary Selected Teams" with selected teams
else:
  Show "Results Under Review" placeholder
```

- Remove score display from public page (scores are internal)
- Show only: Rank, Team Name, Status badge (Selected / Finalist)
- Segment tabs to filter by competition

---

### Payment Gating

#### [MODIFY] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(participant)/payments/page.tsx)

**Changes:**
1. Payment form is **hidden/disabled** until the team's competition has `preliminary_published = true` AND the team status is `selected`
2. Show clear messaging:
   - Before preliminary publish: "Payment will be enabled once preliminary results are announced."
   - After team is selected: "Congratulations! Your team was selected. Please complete payment below."
   - After payment submitted: "Payment under review."
   - After payment approved: "Payment verified! You're confirmed for CSE Fest 2026."
3. BKash number and instructions are shown dynamically from the `payment_methods` table (already implemented)

#### [MODIFY] [route.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/api/payments/route.ts)

**Changes:**
1. Add server-side check: team must have status `selected` AND competition must have `preliminary_published = true`
2. Reject payment submissions if these conditions aren't met

---

### Admin Payments — Transaction Verification + Final Selection

#### [MODIFY] [page.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(admin)/admin/payments/page.tsx)

**Additions:**
1. After approving a payment, show a "Confirm for Final Selection" button
2. Admin can also "Decline for Final Selection" even after payment approval
3. Add segment filter to the payments page (filter by competition)
4. Show team's score and rank alongside the payment details

---

### Edge Cases — Phase C

| Edge Case | Handling |
|-----------|----------|
| Admin publishes preliminary, then changes scores | Scores update but published list doesn't change until re-publish |
| Team pays but admin declines for final | Payment stays approved, team status set to rejected, refund instructions shown |
| Admin selects a new team from leaderboard after preliminary publish | Team gets selected status, payment enabled for them, public page updates on next publish |
| Admin unpublishes preliminary results | `preliminary_published = false`, public page shows "Under Review", payment forms disabled |
| Team payment is rejected, team resubmits | Normal resubmission flow (already implemented) |
| Multiple payments for same team | Only latest payment matters; show payment history in admin view |
| Admin publishes final before all payments are verified | Show warning: "X teams have unverified payments. Publish anyway?" confirmation modal |
| Competition has no entry_fee (free) | Skip payment step entirely — selected → finalist directly on final publish |
| Admin tries to publish final without publishing preliminary first | Block with error: "Preliminary results must be published first" |
| Team was selected but declined their spot (didn't pay) | After payment deadline, admin can decline and select replacement from leaderboard |

---

## Phase D: File Storage Restructuring + UX Polish

**Goal:** Restructure file storage to use competition slugs, add video optimization guidance, and polish the overall UX.

---

### File Storage Restructuring

#### [MODIFY] [submissionStorage.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/submissionStorage.ts)

**Changes:**
1. Replace `getCompetitionCategory()` with `getCompetitionSlug()` that generates a URL-safe slug from the competition name
2. New storage structure:
   ```
   storage/submissions/
   ├── software-showcase/
   │   ├── {teamId}/
   │   │   ├── {uuid}.pdf
   │   │   └── {uuid}.mp4
   ├── iot-showcase/
   │   ├── {teamId}/
   │   │   ├── {uuid}.pdf
   │   │   └── {uuid}.mp4
   ├── idea-showcase/
   │   ├── {teamId}/
   │   │   └── {uuid}.pdf
   └── ...
   ```
3. Each team's files are isolated in `{competition_slug}/{teamId}/`
4. File names are UUID-based — no user input in filenames
5. When admin clicks a team's video/PDF, the system resolves the path via DB (`pdf_path` / `video_path`) — no guessing

#### [MODIFY] [submissionSubmissionService.ts](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/lib/server/submissionSubmissionService.ts)

**Changes:**
1. Pass competition name/slug to `writeSubmissionFile()` instead of category
2. Update path resolution logic

#### [NEW] Storage migration script

One-time script to move existing files from `software/{teamId}/` to `software-showcase/{teamId}/` (only if existing data exists). Safe to skip if no submissions exist yet.

---

### Video Optimization

#### File size enforcement (already in place):
- **Video**: 200 MB max (enforced in `submissionStorage.ts`)
- **PDF**: 5 MB max

#### Additional UX guidance for participants:

#### [MODIFY] [SubmissionFormCard.tsx](file:///f:/CSEFEST/cse-fest-vme1/cse-fest-2/src/app/(participant)/submissions/SubmissionFormCard.tsx)

Add:
1. **Video compression tips** shown below the video upload field:
   - "Recommended: Compress video to under 100MB for faster upload. Use HandBrake or an online compressor."
   - "Supported formats: MP4, WebM. Max 200MB."
2. **Upload progress indicator** — show upload percentage during large file uploads
3. **File size display** after selection: "Selected: demo.mp4 (145 MB)"

---

### UX Polish Items

#### Admin Submissions Page
- [ ] Segment tab counts (e.g., "Software Showcase (12)")
- [ ] Bulk select/reject via checkboxes
- [ ] Score sort in table (ascending/descending)
- [ ] "Scored" vs "Unscored" filter tab

#### Admin Judging Page  
- [ ] Score input with slider + number input combo
- [ ] Auto-save score on blur (debounced)
- [ ] Visual progress bar showing score (0–100 fill)

#### Participant Payments Page
- [ ] Step-by-step wizard feel: "Step 1: Review selection → Step 2: Pay → Step 3: Submit proof"
- [ ] Countdown timer to payment deadline (if set)

#### Public Onsite Teams Page
- [ ] Animated team cards on reveal
- [ ] Segment-specific accent colors
- [ ] "Congratulations" banner for finalist teams

---

### Edge Cases — Phase D

| Edge Case | Handling |
|-----------|----------|
| Competition name has special characters | `slugify()` function strips non-alphanumeric, lowercases, replaces spaces with hyphens |
| Two competitions have the same slug after slugification | Append competition ID suffix: `software-showcase-{short-id}` |
| Existing files in old structure | Migration script handles; new submissions go to new structure |
| Team uploads video that's technically valid but too large to stream smoothly | Serve with Range requests (already implemented); recommend compression in UI |
| Admin views video from team in wrong competition | Impossible — path is resolved from DB, not from URL params |
| File system runs out of disk space | Catch ENOSPC error, return meaningful "Server storage full" error (500) |
| Concurrent uploads from same team | UUID filenames prevent collision; last successful upsert wins in DB |

---

## Suggested Additional Features (UX Improvements)

Based on your request for UX suggestions:

1. **Admin Bulk Actions** — Select multiple submissions, bulk mark as "under review" or "rejected"
2. **Score Distribution Chart** — Small bar chart on the judging page showing score distribution (how many teams at each score bracket)
3. **Admin Notes per Team** — Private admin-only notes field on each submission (not visible to participants)
4. **Payment Deadline Countdown** — Show countdown timer on participant payment page
5. **Email Notifications** — Send email when team is selected/rejected (supplement in-app notifications)
6. **Export History** — Log when exports are generated (audit trail for data downloads)
7. **Quick Score from Submissions Page** — Admin can score directly from the submissions table without navigating to judging (implemented in Phase A)

---

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit          # TypeScript strict check
npx eslint src/           # Lint check  
npm run build             # Production build verification
```

### Manual Verification

#### Phase A
- [ ] Admin can filter submissions by segment (competition) tabs
- [ ] Admin can view submissions in table format
- [ ] Admin can click submission to see video player (720px, 16:9, fullscreen button)
- [ ] Admin can enter single score (0–100) and save
- [ ] Leaderboard re-ranks after score save
- [ ] Score validation: 0 and 100 accepted, -1 and 101 rejected

#### Phase B
- [ ] Export participants by segment → CSV downloads with correct columns
- [ ] Export all participants → CSV with all participants across competitions
- [ ] Export all teams → CSV with leader + member columns, padded with "NA"
- [ ] Export submissions by segment → CSV with scores and links
- [ ] Unicode names render correctly in Excel (BOM check)
- [ ] Empty export → CSV with headers only

#### Phase C
- [ ] Admin clicks "Publish Preliminary" → public Onsite Teams page shows selected teams
- [ ] Selected teams see payment form enabled in dashboard
- [ ] Non-selected teams see "Results announced" but no payment form
- [ ] Admin verifies payment → can confirm or decline for final
- [ ] Admin clicks "Publish Final" → public page updates to show finalists
- [ ] Admin can add new team from leaderboard after preliminary publish
- [ ] Admin blocked from publishing final before preliminary

#### Phase D
- [ ] New submissions go to `{competition-slug}/{teamId}/` folder
- [ ] Video player shows at correct size with fullscreen button
- [ ] File size tips shown on submission form
- [ ] No cross-contamination between team files across competitions

### Responsive Testing
- [ ] All new pages tested at 375px mobile width
- [ ] Admin tables are horizontally scrollable on mobile
- [ ] Video player scales properly on mobile (full-width below 640px)
