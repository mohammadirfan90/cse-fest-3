# CSE FEST 2026

# UI/UX DESIGN SPECIFICATION

Version 1.1

> **Changelog**
> - **v1.1 (2026-06-15)** — Typography floor raised to **16px**. `text-xs` and `text-sm` now resolve to 16px; heading/body scales were retuned upward. The 14px caption rule from v1.0 is **superseded** by this floor. See the *Hierarchy* table below for the new values.
> - v1.0 — Initial specification.

---

# Design Philosophy

The UI must communicate:

* Innovation
* Professionalism
* Prestige
* Competition
* Technology
* Creativity

The experience should feel like:

* A premium technology conference
* A modern SaaS platform
* A national-level technology festival

The experience must NOT feel like:

* A university portal
* A government website
* A dashboard template
* A Bootstrap event website

---

# Visual Identity

## Design Personality

Keywords:

* Premium
* Futuristic
* Elegant
* Fast
* Intelligent
* Technical
* Modern

---

## Design References

### Website

* Apple
* Vercel
* Linear
* Stripe
* Arc Browser
* GitHub Universe

---

## Dashboard

* Stripe Dashboard
* Vercel Dashboard
* Linear
* Notion
* Supabase Studio

---

# Color System

## Primary

Deep Indigo

Used For:

* Brand
* Hero
* CTA

---

## Secondary

Electric Violet

Used For:

* Highlights
* Statistics
* Accents

---

## Accent

Soft Cyan

Used For:

* Hover states
* Success indicators
* Interactive elements

---

## Neutral

Dark Slate

Near Black

Soft Gray

White

---

# Background System

No flat backgrounds.

Every page should include depth.

---

## Primary Background

Animated Gradient Mesh

Very subtle movement.

---

## Secondary Background

Technology Grid

Low opacity.

---

## Decorative Layer

Floating particles.

Slow movement.

Very lightweight.

---

## Public Site Is Dark-First

The public route group (`src/app/(public)/**` — `/`, `/competitions`, `/competitions/[id]`, `/schedule`, `/finalists`) renders **dark by default** for every visitor. This is not a theme preference — it is a brand contract:

* Every illustration, gradient, glassmorphism, neon accent, floating orb and grid pattern in the public surface is authored against a near-black canvas (`bg-neutral-950`). Rendering those surfaces in light mode would break the visual identity and most `dark:`-prefixed shadcn primitive variants.
* Dashboard, admin and auth surfaces remain **light-default** because their tokens, charts, and tables were designed against a light surface.

### Implementation Contract

| Surface          | Default Theme | localStorage key   | Source of truth                               |
|------------------|---------------|---------------------|-----------------------------------------------|
| Public (`(public)`) | **dark**      | `theme_public`      | `src/app/(public)/layout.tsx` pre-paint script |
| Dashboard / Admin / Auth | **light**   | `theme`             | `src/app/layout.tsx` pre-paint script         |

The two keys are deliberately disjoint. A visitor who clicks the navbar's theme toggler on a public page writes `theme_public`, and that choice never bleeds into the dashboard. A participant who toggles dark in their dashboard writes `theme`, and that choice never bleeds back into the public site on a separate visit.

### Pre-Paint Script Rules

Both pre-paint scripts run synchronously in `<head>`, before any React hydration. They MUST:

1. Set `<html>` class to either `dark` or `light` (no in-between state).
2. Set `color-scheme` on `<html>` so native form controls and scrollbars match.
3. Catch `localStorage` exceptions silently (Safari Private Mode, blocked storage) and fall back to the surface default.
4. Never cause a hydration mismatch — both scripts carry `suppressHydrationWarning`.

The public script additionally writes `data-public-theme` on `<html>`. The root script **must** check for that attribute and defer entirely to the public script when present.

### Anti-Patterns

* **Do not** ship a public route that depends on a light-mode CSS file being loaded. The `dark:` variants are the canonical styling.
* **Do not** write the `theme` key from a component rendered on a public route.
* **Do not** read `prefers-color-scheme` for the public site. The brand is dark regardless of OS preference; a user opt-out is the only way to flip.

---

# Typography

## Font Strategy

Headings:

Space Grotesk

Body:

Inter

Numbers:

Geist Mono

---

## Hierarchy

> All sizes use `clamp()` for fluid scaling. **The minimum readable size in v1.1 is 16px** — nothing on the page should render below this floor.

Hero (display-xl):

60–100px

Section Titles (display-lg):

44–76px

Display (display-sm):

32–52px

H1 (page titles):

32–56px

H2 (section titles):

26–42px

H3 (sub-section):

22–32px

H4 (card titles):

20–30px

H5 (small headings):

18–26px

Body Large:

18–20px

Body (default):

16–18px

Small (text-sm / text-xs):

16px (floor — was 14px / 12px in v1.0)

---

# Motion Design

Motion should feel:

* Expensive
* Intentional
* Smooth

Not:

* Flashy
* Distracting

---

## Motion Duration

Fast

150–250ms

Medium

300–500ms

Page

500–700ms

---

## Motion Types

Fade

Slide

Scale

Blur Reveal

Parallax

Mouse Tracking

---

# Layout System

## Container

Max Width:

1440px

---

## Content Width

1200px

---

## Grid

12 Column Grid

Desktop

8 Column Grid

Tablet

4 Column Grid

Mobile

---

# Public Website

---

# Homepage

## Hero Section

Full Screen

100vh

---

### Left Side

Title

```text
CSE FEST 2026
```

Subtitle

```text
Bangladesh's Next Generation Technology Festival
```

Statistics

* Competitions
* Universities
* Participants
* Prize Pool

CTA

Register Now

Explore Competitions

---

### Right Side

Interactive 3D Scene

Floating Competition Cards

Animated Background

Mouse Reactive Effects

---

## Hero Animation

Competition cards orbit slowly.

Examples:

Software Showcase

IoT Showcase

CTF

Valorant

Datathon

---

# Announcement Ticker

Position:

Below Navbar

---

Behavior

Auto Scroll

Pause On Hover

Responsive

---

Style

Glass Panel

Subtle Glow

---

# Competition Section

NOT simple cards.

Each competition should feel unique.

---

### Competition Card

Contains

Banner

Title

Description

Prize

Team Size

Deadline

Register Button

---

Hover Effects

Lift

Glow

Gradient Border

Scale

---

# Timeline Section

Visual Timeline

Connected Nodes

Animated Progress Line

---

Items

Registration Open

Submission Deadline

Selection

Festival Day

---

# Statistics Section

Animated Counters

Count Up Effect

---

Examples

1000+

Participants

50+

Universities

10+

Competitions

---

# FAQ Section

Accordion

Glass Cards

Smooth Animation

---

# Footer

Premium

Not generic.

Include:

Social Links

Contact

Quick Links

Copyright

---

# Competition Details Page

URL

```text
/competitions/software-showcase
```

---

## Hero

Competition Banner

Competition Title

Status Badge

Register Button

---

## Information Tabs

Overview

Rules

Timeline

Prizes

FAQ

---

## Sidebar

Prize Pool

Team Size

Deadline

Eligibility

Registration Status

---

# Authentication

---

# Login Page

Split Layout

---

Left

Festival Branding

Illustration

Statistics

---

Right

Login Form

---

Options

Google Login

Email Login

---

# Profile Completion

Multi Step Wizard

Step 1

Personal

Step 2

Academic

Step 3

Verification

Step 4

Professional

Step 5

Review

---

Progress Bar

Top

---

# Participant Dashboard

Mobile First

---

# Dashboard Home

Cards

Profile Completion

My Teams

My Competitions

Notifications

Upcoming Deadlines

---

# Dashboard Layout

Desktop

Sidebar

Content

Topbar

---

Mobile

Bottom Navigation

---

# Team Management

---

## Team Page

Header

Team Name

Competition

Status

---

Members Grid

Member Cards

Leader Badge

Verification Badge

---

Actions

Invite Member

Transfer Leadership

View Submission

---

# Submission Page

Simple.

Focused.

---

Displays

Competition

Template Link

Rules

Submission Deadline

---

Form

Google Docs URL

Submit

---

# Payment Page

Displays

Amount

Instructions

bKash

Nagad

---

Form

Transaction ID

Screenshot Upload

Submit

---

# Notifications

Timeline Design

Newest First

---

States

Unread

Read

Action Required

---

# Admin Dashboard

Desktop First

---

# Design Goal

Should feel like:

Linear + Stripe + Vercel

---

# Layout

Sidebar

Top Navigation

Content Area

---

# Sidebar

Dashboard

Competitions

Participants

Teams

Submissions

Payments

Analytics

Announcements

Settings

---

# Dashboard Overview

KPI Cards

Large

Beautiful

Animated

---

Cards

Participants

Teams

Revenue

Competitions

Pending Reviews

Pending Payments

---

# Analytics

Modern Charts

Not default chart styles.

Use:

Recharts

Custom Design

---

# Competition Management

Data Table

Advanced Filters

Search

Bulk Actions

---

# Competition Builder

Multi Step Builder

---

Step 1

Basic Information

---

Step 2

Rules

---

Step 3

Timeline

---

Step 4

Fees

---

Step 5

Judging

---

Step 6

Review

---

# Submission Review

Master Detail Layout

---

Left

Teams List

---

Right

Submission Details

Score Panel

Actions

---

# Payment Verification

Card Based Review

---

Display

Screenshot

TXID

Participant

Competition

---

Actions

Approve

Reject

Resubmission

---

# Ranking System

Table

Leaderboard Style

---

Columns

Rank

Team

University

Score

Status

---

# Google Sheets Sync

Dedicated Page

---

Displays

Connected Sheet

Last Sync

Pending Changes

Sync Status

---

Primary CTA

Sync Changes

---

# Responsive Rules

Everything must work on:

320px

375px

390px

768px

1024px

1280px

1440px

1920px

---

# Accessibility

Minimum AA Compliance

---

Keyboard Navigation

Required

---

Focus States

Required

---

Screen Reader Support

Required

---

# UX Principles

Never make users think.

Every action should be obvious.

Every page should have a primary action.

Every empty state should guide the user.

Every loading state should be beautiful.

Every error should explain the solution.

Every workflow should require the minimum number of clicks possible.

The system should feel fast, polished, and trustworthy from the first interaction to the final competition result.
