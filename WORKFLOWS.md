# CSE Fest 2026 — Feature Workflows

> Exact state machines and workflows for every core feature.  
> Implement these exactly. Do not invent alternative flows.

---

## 1. User Registration & Verification

### State Machine
```
[No Account]
    → Register (email/password or Google OAuth)
    → [Account Created — Profile Incomplete]
    → Complete Profile Wizard (5 steps)
    → Upload Student ID (front + back)
    → [Pending Verification]
    → Admin Reviews Documents
    → [Verified] ← competition access unlocked
         OR
    → [Rejected] → Re-upload documents
```

### Profile Wizard Steps
1. **Personal** — Name, Phone, Gender
2. **Academic** — University, Department, Semester, Student ID
3. **Verification** — ID Front Image, ID Back Image
4. **Professional** — GitHub, Portfolio, Skills, Bio
5. **Review** — Confirm all data before submitting

### Rules
- User cannot skip to competition registration until `verification_status === 'verified'`
- Profile is not resubmittable once verified — admin must unlock

---

## 2. Team Management

### Create Team
```
Leader fills Team Name + optional Logo
→ Select Competition
→ Team created in [Forming] state
→ Leader can now invite members
```

### Invite Member
```
Leader enters member email
→ System checks: account exists? → if no: error "User not found on platform"
→ System checks: user already on a team for this competition? → error if yes
→ Invitation sent (in-app notification)
→ Member receives invite → Accept or Reject
→ Accept: member added to team roster
→ Team size validated against competition max_members
```

### Leadership Transfer
```
Leader selects existing member → "Transfer Leadership"
→ Confirmation modal
→ On confirm: old leader becomes member, selected member becomes leader
```

### Team Status Flow
```
Forming → Registered → Submitted → Selected → Finalist
                                 ↘ Rejected
```

---

## 3. Competition Registration

All competitions currently have `rounds_count = 2` configured in the database, meaning they all follow a uniform two-stage publication and payment flow.

### Phase 1: Team Registration & Submission
```
Verified User → Create/Join Team
  → Enter details (Showcase segments require Project Title + Proposal PDF + optional Demo Video)
  → Register Team
  → [Team Status: submitted]
```

### Phase 2: Preliminary Selection (Admin Action)
```
Admin reviews submissions/teams in Review Dashboard
  → Triggers "Publish Preliminary" (sets preliminary_published = true on competition)
  → Selected teams: [Team Status: selected] + in-app notification sent to pay
  → Deselected teams: [Team Status: submitted] (or "registered") + rankings hidden
```

### Phase 3: Payment Verification (Paid Round)
```
Selected Team → Pays Entry Fee via bKash/Nagad Personal number
  → Submits Transaction ID, sender number + Screenshot proof
  → [Payment Status: pending]
  → Admin reviews payment manually
  → Approved payment: [Team Status: finalist] [Payment Status: approved]
  → Rejected payment: [Payment Status: rejected]
  → Resubmission requested: [Payment Status: resubmission_required] → team can re-submit
```

*Note: For two-round competitions, payment forms are locked until a team is selected in Phase 2.*

### Phase 4: Final Selection (Admin Action)
```
Admin reviews final scores & leaderboards
  → Triggers "Publish Final" (sets final_published = true on competition)
  -- Enforced by DB CHECK constraint: preliminary_published must already be true
  → Selected finalist teams: [Team Status: finalist] (rankings public, is_finalist = true)
  → Finalists Confirmed notification sent
```


---

## 4. Submission System

### Submission Form
- Fields: Title + Google Docs URL + optional Notes
- Pre-checks before allowing submission:
  - Competition is open (`submission_start <= now <= submission_end`)
  - User is verified
  - Team is complete (meets min_members)
  - Team has not already submitted (one submission per team)

### Submission State Machine
```
[No submission] → Draft → Submitted → Under Review → Selected
                                                    ↘ Rejected
```

### Locking Rules
- After `submission_end`: form is disabled, editing blocked
- After team is Rejected: no resubmission unless admin unlocks
- Admin can override lock via "Admin Override" flag on the competition

---

## 5. Payment Verification

### Participant Side
```
Team instructed to pay via bKash or Nagad
→ Complete payment externally
→ Return to platform: enter Transaction ID + upload screenshot
→ Submit → [Payment: Pending]
```

### Admin Side
```
Payment queue shows: Team, Competition, Amount, TXID, Screenshot
→ Admin reviews screenshot + verifies TXID manually
→ Approve → [Payment: Approved] → team notified
→ Reject → [Payment: Rejected] → team notified
→ Request Resubmission → [Status: Resubmission Required] → team can re-submit
```

### Resubmission Flow
```
[Rejected] → Admin sets Resubmission Required
→ Team submits new Transaction ID + Screenshot
→ Back to [Pending]
```

---

## 6. Judging & Scoring

### Setup (Admin, per competition)
```
Admin creates criteria:
  - Criterion Name (e.g., Innovation)
  - Weight (e.g., 30 = max 30 points)
Total weights must sum to 100
```

### Score Entry (Admin)
```
Select competition → select team
→ Enter score for each criterion (0 to max)
→ Save → system calculates total automatically
```

### Total Score Calculation
```
score_contribution = (entered_score / max_score) * weight
total = sum(all score_contributions)
```

### Ranking Logic
```
ORDER BY total_score DESC
Tie-break 1: higher total_score wins
Tie-break 2: earlier submission_time wins
Tie-break 3: manual admin override
```

### Finalist Selection
```
Admin reviews rankings
→ Click "Publish Finalists" → selects top N teams (based on finalist_limit)
→ System marks teams as is_finalist = true
→ Notifications sent to finalist teams
→ Public finalist page updated (if admin enables public visibility)
```

---

## 7. Notification System

### Trigger Events
| Event | Recipient |
|-------|-----------|
| Team invitation received | Invited member |
| Team invitation accepted | Team leader |
| Profile verified | Participant |
| Submission selected | Team leader |
| Submission rejected | Team leader |
| Payment approved | Team leader |
| Payment rejected | Team leader |
| Finalist published | All finalist teams |
| New announcement | All users (or targeted) |

### Display
- In-app notification center (timeline, newest first)
- Unread indicator on topbar bell icon
- States: Unread · Read · Action Required

---

## 8. Admin CMS

### Announcements
```
Create → Title + Content + Priority + Type + Publish Date + Expiry
→ Pin (optional) → Publish
→ Displayed on: Homepage / Participant Dashboard / Notification Center
```

### News Ticker
```
Create ticker item → Message + Schedule + Pin (optional)
→ Auto-scrolling display below navbar on public site
→ Pause on hover
```

### FAQ Management
```
Create → Question + Answer + Display Order + Visibility
→ Drag to reorder → Shown on homepage + competition detail pages
```

### Contact Management
```
Edit: Email, Phone, Facebook, LinkedIn, Address, Maps URL
→ Changes propagate instantly to public website (no deployment needed)
```

---

## 9. Google Sheets Sync

### Initial Export
```
Admin clicks "Push Initial Data"
→ Creates Google Sheet with tabs:
   Participants | Teams | Payments | Submissions | Rankings | Finalists
→ Stores sync metadata (sheet_id, last_sync_time)
```

### Subsequent Sync
```
Admin clicks "Sync Changes"
→ Engine compares updated_at timestamps
→ Detects: New Records | Updated Records | Status Changes | Score Changes
→ Updates only changed rows (no duplicates)
→ Shows: affected record count + sync timestamp
```

### Selective Export
```
Admin selects: Competition + Data Type + Columns + Destination Sheet
→ Exports filtered subset
```

---

## 10. Global Search (Admin)

**Shortcut:** `Ctrl+K` (Windows) / `Cmd+K` (Mac)

Searches across: Participants · Teams · Competitions · Payments · Submissions · Universities

**Style:** Command palette (Linear/Vercel-inspired)

---

## 11. Data Export

**Formats:** CSV, Excel  
**Supported exports:** Selected Teams, Finalists, Payments, Participants, Universities  
**Filter support:** Export reflects current active filters in the table view

---

## 12. Audit Logging

Every admin action is recorded:
```
stored: admin_id, action_type, resource_type, resource_id,
        previous_value, new_value, timestamp
```

Examples logged: Competition Created, Participant Verified, Payment Approved,  
Team Selected, Finalists Published, Competition Updated
