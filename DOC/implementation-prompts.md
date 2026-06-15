# CSE Fest 2026 — Implementation Prompts
## Remaining Work from `admin-scoring-export-publish-plan.md`

> **Purpose:** Each section below is a self-contained prompt to give an AI agent.  
> Every prompt references exact file paths, exact line numbers, and exact current code so the agent has no reason to hallucinate. Read the referenced file sections before implementing.
>
> **How to use:** Copy one prompt at a time into the AI. Do not combine prompts. Complete and verify each task before moving to the next.

---

## Status Legend
- ✅ Already done — do not re-implement
- ❌ Not done — prompt provided below
- ⚠️ Partially done — prompt provided below

---

## Task A-1 — Fix Admin Judging Page: Replace Multi-Criteria Modal with Inline Score Input

**Status:** ❌ Not done. The API already accepts `{ team_id, competition_id, score }` (0–100) but the UI still shows the old multi-criteria modal.

**Files to read first (mandatory):**
- `src/app/(admin)/admin/judging/page.tsx` — current 622-line file, read entirely
- `src/app/api/admin/judging/route.ts` — current POST schema at lines 6–10

**Exact prompt:**

```
You are modifying the admin judging page at:
  src/app/(admin)/admin/judging/page.tsx

READ THE ENTIRE FILE FIRST before changing anything.

CURRENT PROBLEM:
The file has an "activeGradingTeam" modal (lines 531–617) that shows multi-criteria scoring
with criteria_name / weight / score / max_score fields. This is obsolete. The database no
longer has those columns (they were dropped by migration_simplify_scoring.sql). The API at
POST /api/admin/judging now accepts ONLY { team_id, competition_id, score } where score is
an integer 0–100.

CHANGES REQUIRED:

1. DELETE the following state variables entirely (they are for the old multi-criteria modal):
   - activeGradingTeam (TeamItem | null)
   - gradingScores (Array<{criteria_name, weight, score, max_score}>)
   - savingScores (boolean)
   Also remove handleOpenGrading(), handleScoreChange(), handleMaxScoreChange() functions.
   Remove the useBodyScrollLock import and call.

2. ADD new inline score state per team. Replace the deleted state with:
   - inlineScores: Record<string, number> — maps team.id to current score value
   - savingScoreId: string | null — which team is currently saving

3. UPDATE the TeamItem interface: remove the scores array field (it's unused now).
   Keep: id, name, status, created_at, submission, total_score, rank_position, is_finalist, is_public.

4. IN the teams table (lines 354–413), replace the "Grade Entry" button column with an
   inline score cell containing:
   - A number <input type="number" min={0} max={100} step={1}> that shows inlineScores[t.id] ?? t.total_score
   - onChange updates inlineScores[t.id]
   - A small "Save" <Button> that calls handleSaveInlineScore(t.id)
   - Show a loading spinner on the button when savingScoreId === t.id
   The column header should be "Score (0–100)".

5. ADD handleSaveInlineScore(teamId: string):
   - Sets savingScoreId = teamId
   - POSTs to /api/admin/judging with body { team_id: teamId, competition_id: selectedCompId, score: inlineScores[teamId] }
   - On success: sets successMsg, triggers setRefreshTrigger(prev => prev + 1)
   - On error: sets errorMsg with the server message
   - Finally: savingScoreId = null

6. IN the right sidebar "Leaderboard Console" (lines 424–522):
   - REMOVE the "Criteria Checklist" section (lines 434–444, the div containing activeComp?.judging_criteria.map(...))
   - Keep: finalist limit display, finalists checklist, publish buttons

7. DELETE the entire scoring modal overlay JSX block (lines 531–617).

8. The existing "Publish Leaderboard & Finalists" button logic is UNCHANGED.

Do not change the publish flow, the competition selector, the finalist checkboxes, or
the data loading useEffects. Only remove the old modal and add the inline score inputs.

TypeScript: no `any`. All types must be explicit.
```

---

## Task A-2 — Fix `/api/admin/submissions/score` to Use `scoringService`

**Status:** ⚠️ The route exists but duplicates logic. The `scoringService.ts` exists but is never imported.

**Files to read first:**
- `src/app/api/admin/submissions/score/route.ts` — full 68-line file
- `src/lib/server/scoringService.ts` — full 147-line file
- `src/app/api/admin/judging/route.ts` — POST handler lines 134–312

**Exact prompt:**

```
You are refactoring two API routes to use a shared scoring service.

READ THESE FILES FIRST:
  1. src/lib/server/scoringService.ts (147 lines) — has upsertTeamScore() and recalculateRankings()
  2. src/app/api/admin/submissions/score/route.ts (68 lines) — current inline implementation
  3. src/app/api/admin/judging/route.ts — POST handler starting at line 134

TASK 1: Update src/app/api/admin/submissions/score/route.ts

Replace the inline upsert logic (lines 42–60) with a call to upsertTeamScore() from
scoringService, then call recalculateRankings() after it. The import at the top should be:

  import { upsertTeamScore, recalculateRankings } from "@/lib/server/scoringService";

Remove the logAdminAction import and call — the scoringService already handles audit logging.
Keep the auth + Zod validation exactly as-is. Only replace the DB operation section.

TASK 2: Update src/app/api/admin/judging/route.ts POST handler

In the POST handler (line 134 onwards), after the score is validated (after line 179),
replace everything from line 181 (fetch previous score) through line 299 (logAdminAction call)
with:

  import { upsertTeamScore, recalculateRankings } from "@/lib/server/scoringService";
  // ...
  await upsertTeamScore(supabase, user.id, team_id, competition_id, score);
  await recalculateRankings(supabase, competition_id);

Keep the return statement (lines 301–304) and the catch block unchanged.
The logAdminAction import can be removed from this file since scoringService handles it.

Do not change anything else in either file. TypeScript: no `any`.
```

---

## Task B-1 — Fix Submissions CSV Export: Add `score`, `pdf_path`, `video_path` Columns

**Status:** ⚠️ The submissions export exists but is missing `score`, `pdf_path`, and `video_path` columns per spec.

**Files to read first:**
- `src/lib/server/adminExport.ts` — lines 412–464 (buildSubmissionsExport function)

**Exact prompt:**

```
You are modifying a single function in src/lib/server/adminExport.ts.

READ lines 412–464 of that file first. This is the buildSubmissionsExport() function.

CURRENT STATE:
- The Supabase query selects: id, title, google_docs_url, notes, status, submitted_at, reviewed_at, teams(name), competitions(name)
- Headers: ["Submission ID", "Title", "Team Name", "Competition", "Status", "Google Docs URL", "Notes", "Submitted At (ISO)", "Reviewed At (ISO)"]

REQUIRED CHANGES:

1. Update the SubmissionRowJoined interface (lines 413–423) to add:
   - pdf_path: string | null
   - video_path: string | null
   - team_id: string
   - competition_id: string

2. Update the Supabase select string to also fetch:
   - pdf_path
   - video_path
   - team_id
   - competition_id

3. After fetching submissions, fetch scores from the `scores` table for all
   (team_id, competition_id) pairs in the result. Use:
   const teamIds = submissions.map(s => s.team_id);
   const compIds = [...new Set(submissions.map(s => s.competition_id))];
   const { data: scores } = await supabase.from("scores")
     .select("team_id, competition_id, score")
     .in("team_id", teamIds)
     .in("competition_id", compIds);
   
   Create a Map for fast lookup:
   const scoreMap = new Map<string, number>();
   (scores ?? []).forEach(sc => scoreMap.set(`${sc.team_id}:${sc.competition_id}`, sc.score));

4. Update headers to:
   ["Submission ID", "Title", "Team Name", "Competition", "Status", "Score",
    "PDF Link", "Video Link", "Google Docs URL", "Notes", "Submitted At (ISO)", "Reviewed At (ISO)"]

5. Update the rows map to include:
   - score: scoreMap.get(`${s.team_id}:${s.competition_id}`) ?? ""
   - pdf_path: s.pdf_path ?? ""
   - video_path: s.video_path ?? ""

Do not change any other function in the file. TypeScript: no `any`.
```

---

## Task C-1 — Two-Stage Publish: Update `/api/admin/judging/publish` Route

**Status:** ❌ Not done. The route exists at 190 lines but uses old single-stage schema.

**Files to read first:**
- `src/app/api/admin/judging/publish/route.ts` — entire 190-line file
- `supabase/migration_two_stage_publish.sql` — confirms `preliminary_published` and `final_published` columns exist on `competitions` table

**Exact prompt:**

```
You are REWRITING src/app/api/admin/judging/publish/route.ts from scratch.
READ THE ENTIRE CURRENT FILE (190 lines) before starting so you understand what to preserve.

The competitions table now has two new boolean columns (already migrated):
  - preliminary_published (default false)
  - final_published (default false)
There is a DB constraint: final_published can only be true when preliminary_published is true.

NEW Zod schema (replace publishLeaderboardSchema at line 6):
```typescript
const publishSchema = z.object({
  competition_id: z.string().uuid("Invalid competition ID format"),
  publish_type: z.enum(["preliminary", "final"]),
  finalist_team_ids: z.array(z.string().uuid()).optional().default([]),
});
```

NEW POST handler logic (replace everything inside the try block after validation):

PRELIMINARY PUBLISH (`publish_type === "preliminary"`):
  1. Fetch competition. Return 404 if not found.
  2. Set competitions.preliminary_published = true for this competition_id.
  3. For each team_id in finalist_team_ids:
     a. Upsert rankings: set is_public = true, is_finalist = false (they are selected, not final yet)
     b. Update teams.status = "selected" where id = team_id
  4. For teams NOT in finalist_team_ids that currently have status "selected":
     - Set them back to "judging_ready" (they were deselected)
  5. Insert in-app notifications for all accepted members of finalist teams:
     title: "Preliminary Selection Announced"
     message: `Your team has been selected for ${compRecord.name}! Please complete payment to confirm your spot.`
     type: "success"
     action_url: "/payments"
  6. Log audit: action "PUBLISH_PRELIMINARY"
  7. Return { success: true, message: "Preliminary results published. X teams selected." }

FINAL PUBLISH (`publish_type === "final"`):
  1. Fetch competition. Return 404 if not found.
  2. Check: if preliminary_published is false, return 400 with message:
     "Preliminary results must be published before publishing final results."
  3. Count how many finalist_team_ids have payments with status "approved":
     const { data: approvedPayments } = await supabase.from("payments")
       .select("team_id").eq("status", "approved").in("team_id", finalist_team_ids);
     const unverifiedCount = finalist_team_ids.length - (approvedPayments?.length ?? 0);
     Include unverifiedCount in the response message as a warning (still allow publish).
  4. Set competitions.final_published = true.
  5. For each team_id in finalist_team_ids:
     a. Update rankings: is_finalist = true, is_public = true
     b. Update teams.status = "finalist"
  6. Insert in-app notifications for all accepted members of finalist teams:
     title: "Finalist Confirmed!"
     message: `Congratulations! Your team has been confirmed as a finalist for ${compRecord.name}.`
     type: "success"
     action_url: "/dashboard"
  7. Log audit: action "PUBLISH_FINAL"
  8. Return { success: true, message: "Final results published. X finalists confirmed. Y payments unverified." }

PRESERVE these from the current file:
- The auth + admin role check pattern (copy exactly from lines 14–41)
- The logAdminAction import and call pattern
- The catch block pattern

TypeScript: no `any`. All types explicit.
```

---

## Task C-2 — Two-Stage Publish: Update Admin Judging Page UI

**Status:** ❌ Not done. The judging page has one publish button. Needs two staged buttons.

**Files to read first:**
- `src/app/(admin)/admin/judging/page.tsx` — read entire file AFTER Task A-1 is complete
- `src/app/api/admin/judging/publish/route.ts` — read after Task C-1 is complete (for the new schema)

**Exact prompt:**

```
You are modifying the admin judging page AFTER Task A-1 has already been applied.
READ THE CURRENT FILE FIRST before starting.

The file is: src/app/(admin)/admin/judging/page.tsx

The publish API at POST /api/admin/judging/publish now accepts:
  { competition_id: string, publish_type: "preliminary" | "final", finalist_team_ids: string[] }

CHANGES REQUIRED:

1. UPDATE competition fetch: when loading competitions (in the useEffect that calls supabase
   .from("competitions").select(...)), also select "preliminary_published, final_published".
   
   Update CompetitionItem interface to add:
   - preliminary_published: boolean
   - final_published: boolean

2. REPLACE the existing single handlePublishResults function with two separate handlers:
   
   handlePublishPreliminary():
   - Sets publishing = true
   - POSTs to /api/admin/judging/publish with:
     { competition_id: selectedCompId, publish_type: "preliminary", finalist_team_ids: finalistTeamIds }
   - On success: setSuccessMsg(data.message), setRefreshTrigger(prev => prev + 1), reload competitions
   - On error: setErrorMsg(...)
   - Finally: setPublishing(false)

   handlePublishFinal():
   - Same pattern but publish_type: "final"
   - Before calling the API, if activeComp?.preliminary_published is false, immediately
     setErrorMsg("You must publish preliminary results first.") and return

3. REPLACE the "Publish Action buttons" section (currently showing one publish button and
   one unpublish button) with:

   If preliminary_published is false:
   - Show "Publish Preliminary Results" button (variant="primary") → calls handlePublishPreliminary()
   - Show a helper text: "This will notify selected teams to complete payment."

   If preliminary_published is true AND final_published is false:
   - Show a green badge "Preliminary Published" to indicate current state
   - Show "Publish Final Selection" button (variant="success") → calls handlePublishFinal()
   - Show helper text: "Only publish after verifying payments."
   - Still show "Update Preliminary" button (variant="secondary", smaller) → calls handlePublishPreliminary()
     with note "(Update selection without re-notifying)"

   If final_published is true:
   - Show green badges for both "Preliminary Published" and "Final Published"
   - Show "Update Final" button (variant="secondary") for corrections

   The shared isLoading/disabled state uses the existing `publishing` boolean.

4. The finalist checkboxes list is UNCHANGED — it's still used to populate finalist_team_ids.

Do not change the scoring inline inputs (from Task A-1), the competition selector,
or the data loading logic. TypeScript: no `any`.
```

---

## Task C-3 — Update Public Finalists Page for Two-Stage Display

**Status:** ❌ Not done. The page reads `is_public` from rankings but ignores `preliminary_published`/`final_published`.

**Files to read first:**
- `src/app/(public)/finalists/page.tsx` — entire 302-line file

**Exact prompt:**

```
You are modifying the public finalists page at:
  src/app/(public)/finalists/page.tsx

READ THE ENTIRE FILE (302 lines) before starting.

CURRENT STATE:
- Loads competitions without preliminary_published / final_published fields
- Shows leaderboard if rankings are returned, "Under Review" state if empty

NEW BEHAVIOR:
The competitions table now has:
  - preliminary_published: boolean
  - final_published: boolean
These determine what the public sees.

CHANGES:

1. Update CompetitionItem interface to add:
   - preliminary_published: boolean
   - final_published: boolean

2. In the competition loading useEffect, update the select to include:
   "id, name, type, preliminary_published, final_published"

3. Create a computed value `activeComp` from competitions.find(c => c.id === selectedCompId).

4. Add a computed `publishPhase` variable:
   - if activeComp?.final_published === true → "final"
   - else if activeComp?.preliminary_published === true → "preliminary"
   - else → "unpublished"

5. Replace the "Leaderboard content" section logic:

   If publishPhase === "unpublished":
   - Show the "Leaderboard Under Review" card (similar to current empty state)
   - Message: "Organizers are evaluating submissions. Results will be published soon."
   - Do NOT fetch rankings at all (skip the rankings query)

   If publishPhase === "preliminary":
   - Show a yellow/warning banner at top: "⚡ Preliminary Selection — Final confirmation pending"
   - Page title changes from "Finalists & Rankings" to "Onsite Teams — Preliminary Selection"
   - Show ONLY teams with status = "selected" from the rankings (filter where teams.status === "selected")
   - Do NOT show total_score or rank numbers (scores are internal)
   - Show only: Team Name, Status badge ("Selected")
   - Show a note: "Final selections will be confirmed after payment verification."

   If publishPhase === "final":
   - Show page title: "Onsite Teams — Final Confirmed"
   - Show a green "Congratulations" banner
   - Show teams where is_finalist = true
   - Show: Team Name, Status badge ("Finalist"), Rank

6. The rankings query (is_public filter is handled by RLS automatically). Keep the
   existing Supabase query pattern but add `.neq("teams.status", "rejected")` to filter
   rejected teams.

7. Remove the "Total Score" column and "pts" display from any public-facing tables —
   scores are internal.

TypeScript: no `any`. Preserve all existing error states and loading states.
```

---

## Task C-4 — Payment Gating: Update `/api/payments` to Check `preliminary_published`

**Status:** ❌ Not done. Current gate checks `rounds_count === 2 && team.status !== "selected"` but ignores `preliminary_published`.

**Files to read first:**
- `src/app/api/payments/route.ts` — entire 264-line file, focus on lines 154–202 (eligibility logic)
- `supabase/migration_two_stage_publish.sql` — confirms `preliminary_published` exists on `competitions`

**Exact prompt:**

```
You are modifying the payment submission gate in:
  src/app/api/payments/route.ts

READ THE ENTIRE FILE (264 lines) before starting. Focus on lines 154–202.

CURRENT ELIGIBILITY LOGIC (lines 154–202):
- Checks entry_fee > 0 ✓
- Checks payment method is active ✓
- Checks: if rounds_count === 2 AND team.status !== "selected" → reject (lines 182–202)

PROBLEMS:
- Does not check competitions.preliminary_published at all
- The rounds_count check is a proxy that predates the two-stage publish system

NEW LOGIC to add AFTER line 162 (after the entry_fee <= 0 check) and BEFORE the payment method check:

```typescript
// NEW: For two-round competitions, require preliminary_published = true
if (comp.rounds_count === 2) {
  if (!comp.preliminary_published) {
    return NextResponse.json(
      {
        success: false,
        message: "Payment is not yet open. Preliminary results have not been announced yet. Please wait for the organizers to publish preliminary selections.",
      },
      { status: 400 }
    );
  }
  // Team must be in "selected" status (set during preliminary publish)
  if (teamRecord.status !== "selected") {
    // Allow resubmission if a previous payment was rejected
    const { data: latestPayment } = await supabase
      .from("payments")
      .select("status")
      .eq("team_id", team_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const canResubmit = latestPayment &&
      (latestPayment.status === "rejected" || latestPayment.status === "resubmission_required");
    if (!canResubmit) {
      return NextResponse.json(
        {
          success: false,
          message: "Your team has not been selected in the preliminary results. Payment is only available to selected teams.",
        },
        { status: 400 }
      );
    }
  }
}
```

Also UPDATE the competitions query on line 128 to include `preliminary_published`:
  Change: `.select("*, competitions(*)")`
  To: `.select("id, name, status, competitions(id, name, entry_fee, eligibility, payment_instructions, rounds_count, preliminary_published)")`
  And access comp.preliminary_published in the checks above.

REMOVE the old eligibility block at lines 182–202 (the `if (comp.rounds_count === 2 && teamRecord.status !== "selected")` block) since the new logic above replaces it.

Do not change anything else. Preserve all other validation and the Cloudinary upload.
TypeScript: no `any`.
```

---

## Task C-5 — Payment Gating: Update Participant Payments Page UI

**Status:** ❌ Not done. The participant page gates on `rounds_count` but not `preliminary_published`.

**Files to read first:**
- `src/app/(participant)/payments/page.tsx` — entire 751-line file
- Focus on lines 317–341 (eligibility logic) and lines 636–655 (gating message card)

**Exact prompt:**

```
You are modifying the participant payments page at:
  src/app/(participant)/payments/page.tsx

READ THE ENTIRE FILE (751 lines) before starting.
Focus on lines 317–341 (the eligibility computation) and lines 636–655 (the warning card).

CURRENT STATE:
- The UserTeam interface (lines 25–38) has competitions with rounds_count
- isEligibleToPay (lines 335–340) checks: entryFee > 0, no approved/pending payment, (!isTwoRound || clearedFirstRound)
- The warning card at 636–655 shows generic messages

REQUIRED CHANGES:

1. Update UserTeam interface — add `preliminary_published: boolean` inside the competitions shape:
   ```typescript
   competitions: {
     id: string;
     name: string;
     type: string;
     entry_fee: number;
     eligibility: string;
     payment_instructions: string | null;
     rounds_count: number;
     preliminary_published: boolean; // ADD THIS
   } | null;
   ```

2. Update the Supabase query (line 145) to also select preliminary_published:
   Change: `.select("id, name, status, competitions(id, name, type, entry_fee, eligibility, payment_instructions, rounds_count)")`
   To: `.select("id, name, status, competitions(id, name, type, entry_fee, eligibility, payment_instructions, rounds_count, preliminary_published)")`

3. Update the eligibility logic (lines 319–340):
   Add a new derived boolean:
   ```typescript
   const isPreliminaryPublished = comp?.preliminary_published ?? false;
   ```
   
   Update isEligibleToPay:
   ```typescript
   const isEligibleToPay =
     entryFee > 0 &&
     (!latestPayment ||
       latestPayment.status === "rejected" ||
       latestPayment.status === "resubmission_required") &&
     (!isTwoRound || (isPreliminaryPublished && clearedFirstRound));
   ```

4. Update the warning card (lines 636–655) to add a new message case. Replace the ternary
   inside `<p className="text-neutral-500...">`:
   
   ```
   {paymentApproved
     ? "Your payment is verified and registration is fully complete."
     : paymentPending
     ? "A payment submission is currently under review by organisers. You will be notified if a resubmission is required."
     : isTwoRound && !isPreliminaryPublished
     ? "Payment will be enabled once organizers publish the preliminary selection results. You will be notified when your team is selected."
     : isTwoRound && !clearedFirstRound
     ? "For this 2-round competition, your team must be selected in the preliminary results before the payment window opens."
     : "Payment options are currently locked or inactive for this team configuration."}
   ```

Do not change any other logic, the form, the payment method UI, or the screenshot upload.
TypeScript: no `any`.
```

---

## Task C-6 — Admin Payments Page: Add Competition Filter + Score/Rank + Final Confirm Buttons

**Status:** ❌ Not done. The admin payments page has no competition filter, no score display, and no "Confirm for Final" button.

**Files to read first:**
- `src/app/(admin)/admin/payments/page.tsx` — entire 806-line file
- `src/app/api/admin/payments/route.ts` — entire 193-line file

**Exact prompt:**

```
You are making three additions to the admin payments page and its API.

READ BOTH FILES FIRST:
  1. src/app/(admin)/admin/payments/page.tsx (806 lines)
  2. src/app/api/admin/payments/route.ts (193 lines)

──────────────────────────────────────────────
PART 1 — API: Add competition filter + score to GET
──────────────────────────────────────────────

In src/app/api/admin/payments/route.ts GET handler (line 13):

1. After the statusFilter line (line 44), also read:
   const competitionIdFilter = searchParams.get("competition_id");

2. After `if (statusFilter) { query = query.eq("status", statusFilter); }` (line 52), add:
   if (competitionIdFilter) {
     query = query.eq("competition_id", competitionIdFilter);
   }

3. After fetching payments, join scores: for each payment, look up the team's score in the
   scores table. Add:
   ```typescript
   const teamIds = (payments ?? []).map(p => p.team_id);
   const { data: scores } = await supabase
     .from("scores")
     .select("team_id, competition_id, score")
     .in("team_id", teamIds);
   const { data: rankings } = await supabase
     .from("rankings")
     .select("team_id, rank_position")
     .in("team_id", teamIds);
   
   const enriched = (payments ?? []).map(p => ({
     ...p,
     team_score: scores?.find(s => s.team_id === p.team_id && s.competition_id === p.competition_id)?.score ?? null,
     team_rank: rankings?.find(r => r.team_id === p.team_id)?.rank_position ?? null,
   }));
   return NextResponse.json({ success: true, data: enriched });
   ```

──────────────────────────────────────────────
PART 2 — UI: Add competition filter dropdown
──────────────────────────────────────────────

In src/app/(admin)/admin/payments/page.tsx:

1. Add state: const [competitionFilter, setCompetitionFilter] = React.useState<string>("all");
2. Add state: const [competitions, setCompetitions] = React.useState<{id:string;name:string}[]>([]);
3. Add a useEffect to load competitions from /api/admin/competitions on mount.
4. Update the payments loading URL (line 101–103) to include the competition filter:
   const url = new URL("/api/admin/payments", window.location.origin);
   if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
   if (competitionFilter !== "all") url.searchParams.set("competition_id", competitionFilter);
5. In the filter bar area (line 414 area), add a competition filter select ABOVE the status pills:
   A simple <select> or shadcn Select that lists "All Competitions" + each competition.
   onChange → setCompetitionFilter(value), which triggers the refreshTrigger to refetch.

──────────────────────────────────────────────
PART 3 — UI: Show score/rank + Final Confirm button on each payment card
──────────────────────────────────────────────

Update PaymentItem interface to add:
  team_score: number | null;
  team_rank: number | null;

In each payment card (the card body, around lines 472–590):
1. In the detail grid (lines 504–519 area), add two new cells:
   - "Score": show team_score ?? "—" with font-mono
   - "Rank": show team_rank ? `#${team_rank}` : "—" with font-mono

2. After the current Approve / Resubmit / Reject buttons (lines 538–553), if payment is
   approved (status === "approved"):
   Add a "Confirm for Final" button (variant="success") that calls a new handler:
     handleConfirmFinal(p.id, p.team_id)
   And a "Decline from Final" button (variant="destructive") that calls:
     handleDeclineFinal(p.id, p.team_id)
   
   These buttons only show when p.status === "approved".

3. Add handleConfirmFinal(paymentId: string, teamId: string):
   - POSTs to /api/admin/payments with body { payment_id: paymentId, status: "approved", confirm_final: true }
   - On success, show successMsg

4. Add handleDeclineFinal(paymentId: string, teamId: string):
   - POSTs to /api/admin/payments with body { payment_id: paymentId, status: "rejected", notes: "Declined from final selection" }
   - On success, show successMsg

Note: The actual team status update to "finalist" is handled by the Phase C-1 final publish
flow, not by individual payment approval. The "Confirm Final" button here is just a UI marker
for the admin to track who they intend to finalize — it does not change team status.

TypeScript: no `any`. Do not remove any existing functionality.
```

---

## Task D-1 — Add Video Compression Tips to SubmissionFormCard

**Status:** ❌ Not done. No video guidance exists in the submission form.

**Files to read first:**
- `src/app/(participant)/submissions/SubmissionFormCard.tsx` — entire 129-line file
- `src/components/submissions/FileDropzone.tsx` — check if it has a helperText prop

**Exact prompt:**

```
You are making a small UX addition to:
  src/app/(participant)/submissions/SubmissionFormCard.tsx

READ THE ENTIRE FILE (129 lines) first.

CHANGE: After the video FileDropzone (lines 90–98), add a hint block:

```tsx
{/* Video compression guidance */}
<div className="text-[11px] text-neutral-500 font-sans leading-relaxed space-y-1 p-3 bg-neutral-950/60 border border-neutral-850 rounded-lg">
  <p className="font-semibold text-neutral-400">📹 Video Upload Tips</p>
  <ul className="list-disc list-inside space-y-0.5 ml-1">
    <li>Compress to under 100 MB for faster upload — use <span className="font-mono text-neutral-400">HandBrake</span> (free) or an online compressor</li>
    <li>Supported formats: <span className="font-mono text-neutral-400">MP4, WebM</span></li>
    <li>Maximum size: <span className="font-mono text-neutral-400">200 MB</span></li>
  </ul>
</div>
```

Also update the video FileDropzone helperText (line 96) from:
  "Upload an MP4/WebM video detailing your project"
to:
  "Optional. MP4/WebM, max 200 MB. Compress before uploading."

If videoFile is set (i.e. a file has been selected), show the file size below the dropzone:
```tsx
{videoFile && (
  <p className="text-[11px] text-neutral-500 font-mono mt-1">
    Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
  </p>
)}
```

That's the entire change. Do not modify anything else in this file.
```

---

## Task D-2 — UX Polish: Segment Tab Counts on Admin Submissions Page

**Status:** ❌ Not done.

**Files to read first:**
- `src/app/(admin)/admin/submissions/page.tsx` — entire 476-line file

**Exact prompt:**

```
You are adding submission counts to the competition segment tabs in:
  src/app/(admin)/admin/submissions/page.tsx

READ THE ENTIRE FILE (476 lines) first.

CURRENT STATE (lines 227–239): Competition tabs are rendered as simple buttons showing comp.name.

CHANGE: Show a count badge on each tab showing how many submissions belong to that competition.
Compute a count map before the return statement:
```typescript
const countByComp = React.useMemo(() => {
  const map: Record<string, number> = {};
  submissions.forEach(s => {
    if (s.competition_id) {
      map[s.competition_id] = (map[s.competition_id] ?? 0) + 1;
    }
  });
  return map;
}, [submissions]);
```

Update the competition tab button text (line 237) from:
  {comp.name}
to:
  {comp.name} <span className="ml-1 font-mono text-[10px] text-neutral-500">({countByComp[comp.id] ?? 0})</span>

Also add a count to the "All Competitions" tab:
  All Competitions <span className="ml-1 font-mono text-[10px] text-neutral-500">({submissions.length})</span>

Do not change any other logic.
```

---

## Verification Checklist

After completing all tasks, run these commands in the project root:

```bash
npx tsc --noEmit
npx eslint src/ --max-warnings 0
npm run build
```

Then manually verify:

**Phase A:**
- [ ] Admin judging page shows inline score input (0–100) in the leaderboard table, not a modal
- [ ] "Grade Entry" button and multi-criteria modal are gone
- [ ] "Criteria Checklist" in right sidebar is gone
- [ ] Score 0 and 100 are accepted; score -1 and 101 show validation error
- [ ] Saving a score re-ranks the leaderboard

**Phase B:**
- [ ] Submissions CSV export contains Score, PDF Link, Video Link columns
- [ ] Download works; UTF-8 BOM present (open in Excel, no garbled characters)

**Phase C:**
- [ ] Admin judging page shows "Publish Preliminary" button when not yet published
- [ ] After preliminary publish, button changes to "Publish Final"
- [ ] Publishing final with no preliminary shows error message
- [ ] Public `/finalists` page shows "Under Review" when `preliminary_published = false`
- [ ] Public `/finalists` page shows "Preliminary Selection" banner when preliminary only
- [ ] Public `/finalists` page shows "Finalist Confirmed" section when final published
- [ ] Participant payment page shows "Payment not open yet" message when `preliminary_published = false`
- [ ] Participant payment form appears when team is "selected" AND `preliminary_published = true`
- [ ] `/api/payments` POST returns 400 if `preliminary_published = false`
- [ ] Admin payments page shows competition filter dropdown
- [ ] Admin payments page shows team score and rank per payment
- [ ] Admin payments page shows "Confirm Final" button on approved payments

**Phase D:**
- [ ] Submission form shows video compression tips below the video dropzone
- [ ] Selected file name and MB size appear after picking a video
- [ ] Competition segment tabs on admin submissions show counts in parentheses

**Responsive (375px):**
- [ ] Admin judging table is horizontally scrollable with inline score inputs
- [ ] Public finalists page is readable at 375px
- [ ] Admin payments cards stack vertically at 375px
