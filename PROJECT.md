# CSE Fest 2026 — Project Overview

## What This Is

A full-stack festival management platform for SMUCT's annual technology festival, July 18 2026.  
It is **not** a university registration page. It is a complete operational system.

**Organizations:** CSE + CSIT, Shanto-Mariam University of Creative Technology (SMUCT)

---

## Platform Roles

| Role | Description |
|------|-------------|
| **Participant** | Students who register, form teams, submit proposals, pay, track status |
| **Admin** | Festival organizers with full platform control |

---

## What The Platform Does

Three combined products in one:

1. **Public Festival Website** — marketing, competitions, timeline, stats, FAQ, contact
2. **Participant Portal** — registration, team management, submissions, payments, notifications
3. **Admin Control Center** — full competition lifecycle, judging, analytics, CMS, Google Sheets sync

---

## Competition Catalog

### External (Open to all Bangladesh universities)

| Competition | Team Size | Structure |
|-------------|-----------|-----------|
| Software Project Showcase | 1–3 | Phase 1 (Proposal) → Phase 2 (Presentation) |
| IoT Showcase | 1–4 | Phase 1 (Proposal) → Phase 2 (Demo) |
| Idea Showcase | 1–3 | Phase 1 (Proposal) → Phase 2 (Presentation) |

### Internal (SMUCT students only)

| Competition | Team Size | Notes |
|-------------|-----------|-------|
| Competitive Programming | 1–3 | — |
| Datathon | 1–3 | — |
| CTF (Capture The Flag) | 1–3 | — |
| Robo Soccer | Admin-configured | — |
| Line Following Robot (LFR) | Admin-configured | — |
| Valorant | Admin-configured | — |
| FIFA | Admin-configured | — |

---

## Core Workflows (Summary)

All competitions currently follow a uniform two-stage flow (as `rounds_count = 2` is set for all segments in the database):

```
Register Team (status: submitted) 
  → Preliminary Selection Published (status: selected) 
  → Submit Payment Proof (status: pending)
  → Payment Approved (status: finalist)
  → Final Selection Published (final_published = true)
```

* **Showcase Segments (`submission_required = true`):** Require project title, proposal PDF, and optional demo video on registration.
* **Non-Showcase Segments (`submission_required = false`):** Registered directly. However, they must still be selected in the Preliminary Publish round before payment options are unlocked.


---

## Participant Profile Requirements

**Personal:** Full Name, Email, Phone, Gender  
**Academic:** University, Department, Semester, Student ID  
**Verification:** Student ID Front Image, Student ID Back Image  
**Professional:** GitHub, Portfolio, Skills, Bio  
**Festival:** T-Shirt Size  

---

## Student Verification States

```
Incomplete → Submitted → Verified
```

Only **Verified** participants may register for competitions.

---

## Team Management

- Leader creates team (Name + optional Logo)
- Leader invites via email
- Member accepts → official roster update
- Leadership may be transferred

---

## Payment System

**Supported:** bKash, Nagad  
**Participant submits:** Transaction ID + Screenshot  
**States:** Pending → Approved | Rejected | Resubmission Allowed  
**Verification:** Manual by Admin

---

## Success Criteria

- 100% of registrations happen through the platform
- Organizers eliminate all manual spreadsheets
- Payment verification is centralized
- Judging workflows are streamlined
- Google Sheets sync removes manual data entry
- Participants complete all actions without organizer help
- Platform is the **single source of truth** for CSE Fest 2026

---

## Design Inspiration

| Context | Inspiration |
|---------|-------------|
| Public Website | Apple, Vercel, Stripe, GitHub Universe |
| Participant Dashboard | Linear, Notion, GitHub |
| Admin Dashboard | Stripe Dashboard, Vercel Dashboard, Supabase Studio |
