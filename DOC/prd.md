# PHASE 1 PRD

# Foundation & Core Registration System

## Goal

Build the complete foundation required for:

* Public website
* Authentication
* Participant profiles
* Student verification
* Team management
* Competition registration

At the end of Phase 1:

The festival can already start accepting registrations.

---

# Success Criteria

Users can:

* Create account
* Login
* Complete profile
* Upload student ID cards
* Create teams
* Invite members
* Join teams
* Register competitions

Admins can:

* Verify participants
* Create competitions
* View registrations

---

# Features

## 1. Public Website

### Homepage

Sections:

* Hero
* About Festival
* Competitions
* Timeline
* Statistics
* FAQ
* Contact
* Footer

### Requirements

Responsive across:

* Mobile
* Tablet
* Desktop

---

## 2. Authentication

### Email Authentication

User can:

* Register
* Login
* Forgot Password
* Reset Password

Validation:

* Unique email
* Strong password

---

### Google Authentication

User can:

* Continue with Google

Requirements:

* OAuth integration
* Existing account linking

---

## 3. Profile System

### Profile Completion Flow

After registration:

User redirected to profile setup.

Required:

* Full Name
* Phone
* Gender
* University
* Department
* Semester
* Student ID
* GitHub
* Portfolio
* Skills
* Bio
* T-Shirt Size

---

## 4. Student Verification

### Upload Documents

Required:

* Student ID Front


Storage:

* Cloudinary for ID
* Server file storage for video/pdf

---

### Verification Status

States:

* Incomplete
* Pending Verification
* Verified

Restriction:

Unverified users cannot join competitions.

---

## 5. Competition Directory

### Competition Listing

Displays:

* Banner
* Name
* Description
* Team Size
* Fee
* Status

---

### Competition Detail Page

Displays:

* Description
* Rules
* Timeline
* Prize Pool
* Rulebook PDF
* Team Requirements

---

## 6. Team Management

### Create Team

Fields:

* Team Name
* Team Logo (Optional)

Rules:

Competition determines:

* Min members
* Max members

---

### Team Invitation

Leader enters email.

System:

* Validate account exists
* Send invitation

Member:

* Accept
* Reject

---

### Team Dashboard

Displays:

* Members
* Competition
* Team Status

---

### Leadership Transfer

Leader may transfer ownership.

---

## 7. Participant Dashboard

Widgets:

* Profile Completion
* My Teams
* My Competitions
* Notifications
* Deadlines
* Quick Actions

---

## 8. Notification System

In-App Only

Examples:

* Team Invitation
* Verification Approved
* Competition Registered

---

## 9. Admin Dashboard

### Overview

Cards:

* Total Participants
* Total Teams
* Total Competitions

---

### Participant Management

Admin can:

* View profiles
* Verify students

---

### Competition Builder (Basic)

Admin can:

* Create competition
* Edit competition
* Publish competition

---

# Deliverables

At end of Phase 1:

✓ Registration Open

✓ Teams Working

✓ Verification Working

✓ Competition Registration Working

✓ Public Website Live



# PHASE 2 PRD

# Competition Operations & Evaluation System

## Goal

Transform the platform from a registration portal into a complete competition management system.

At the end of Phase 2:

Organizers can run the entire competition lifecycle through the platform.

---

# Success Criteria

Admins can:

* Accept submissions
* Review teams
* Judge submissions
* Rank participants
* Verify payments
* Select finalists

Participants can:

* Submit proposals
* Track status
* Submit payment proof
* View results

---

# Features

## 1. Advanced Competition Builder

Expand the Phase 1 competition builder.

### Competition Information

Fields:

* Competition Name
* Competition Type
* Description
* Short Description
* Cover Image
* Banner Image

---

### Competition Categories

Supported:

* Showcase
* Programming
* Security
* Robotics
* Esports
* Custom

---

### Eligibility Rules

Admin Configures:

* Internal Only
* External Only
* Both

---

### Team Rules

Admin Configures:

* Solo Allowed
* Team Allowed
* Min Team Size
* Max Team Size

---

### Registration Timeline

Admin Sets:

* Registration Start
* Registration End

System Automatically:

* Opens registration
* Closes registration

---

### Submission Timeline

Admin Sets:

* Submission Start
* Submission End

System Automatically:

* Enables submissions
* Locks submissions

---

### Final Round Settings

Admin Sets:

* Finalist Limit
* Phase 2 Enabled

Example:

Top 20 Teams

---

## 2. Submission Management System

### Applicable Competitions

* Software Showcase
* IoT Showcase
* Idea Showcase

---

### Submission Form

Fields:

* Submission Title
* Google Docs Link

Optional:

* Additional Notes

---

### Submission Validation

System Checks:

* Competition Open
* User Verified
* Team Complete
* Submission Deadline Active

---

### Submission States

Draft

↓

Submitted

↓

Under Review

↓

Selected

OR

↓

Rejected

---

### Submission Locking

After Deadline:

* Cannot edit
* Cannot resubmit
* Cannot modify team

Admin Override Available

---

## 3. Review Dashboard

Admin View

Displays:

* Team Information
* Members
* University
* Submitted Proposal
* Submission Time

---

### Filters

By:

* Competition
* Status
* University
* Team Name

---

### Actions

Admin Can:

* Open Submission
* Select Team
* Reject Team

---

## 4. Judging System

### Criteria Builder

Admin Creates:

Criterion Name

Example:

Innovation

Weight:
30

---

Example:

Technical Feasibility

Weight:
25

---

Example:

Impact

Weight:
20

---

### Score Entry

Admin Inputs Score.

Example:

Innovation
25/30

Feasibility
20/25

Impact
18/20

Presentation
15/15

Total:
78

---

### Auto Calculation

System Calculates:

* Total Score
* Rank Position

Automatically

---

## 5. Ranking System

### Competition Leaderboard

Displays:

* Rank
* Team Name
* Competition
* Total Score

---

### Ranking Logic

Higher Score

↓

Higher Rank

---

Tie Breaking

Order:

1. Highest Total Score
2. Earlier Submission
3. Manual Override

---

### Public Visibility

Admin Chooses:

* Public Finalists Only
* Public Rankings
* Hidden

Per Competition

---

## 6. Finalist Selection System

### Selection Dashboard

Admin Sees:

* All Scores
* Rankings

---

### Finalist Publishing

Admin Clicks:

Publish Finalists

System:

* Creates finalist list
* Notifies teams

---

### Public Finalist Page

Displays:

* Competition
* Team Name
* University

---

## 7. Payment Management System

### Supported Methods

* bKash
* Nagad

---

### Participant Submission

Fields:

* Transaction ID
* Payment Screenshot

---

### Payment States

Pending

↓

Approved

OR

↓

Rejected

OR

↓

Resubmission Allowed

---

### Resubmission Flow

Rejected

↓

Resubmission Allowed

↓

New Submission

↓

Pending

---

## 8. Payment Verification Dashboard

Admin View

Displays:

* Team
* Competition
* Amount
* Transaction ID
* Screenshot

---

### Actions

Approve

Reject

Request Resubmission

---

## 9. Advanced Notifications

Events:

* Team Selected
* Team Rejected
* Payment Approved
* Payment Rejected
* Finalists Published

---

### Notification Center

Participant Dashboard

Displays:

* Latest Notifications
* Read Status
* Timestamps

---

## 10. Audit Logging

Every Admin Action Recorded

Examples:

Competition Created

Competition Updated

Participant Verified

Payment Approved

Team Selected

Finalists Published

---

### Audit Log Data

Store:

* Admin
* Action
* Timestamp
* Resource
* Previous Value
* New Value

---

## 11. Enhanced Admin Dashboard

### Registration Metrics

* Total Participants
* Total Teams
* Total Competitions

---

### Review Metrics

* Pending Reviews
* Selected Teams
* Rejected Teams

---

### Payment Metrics

* Pending Payments
* Approved Payments
* Rejected Payments

---

### Revenue Metrics

* Total Revenue
* Expected Revenue
* Collection Rate

---

### Activity Feed

Recent:

* Registrations
* Payments
* Selections
* Competition Changes

---

# Deliverables

At End of Phase 2

✓ Submission System

✓ Judging System

✓ Ranking System

✓ Payment Verification

✓ Finalist Selection

✓ Audit Logs

✓ Revenue Tracking

✓ Competition Operations Complete

The platform can now run the entire CSE Fest 2026 competition process without external tools.


# PHASE 3 PRD

# Festival Management Platform, CMS, Analytics & Professional Operations

## Goal

Transform the platform from a competition management system into a complete festival operating platform.

At the end of Phase 3:

Everything required to manage CSE Fest 2026 should exist inside the platform.

No dependency on:

* Manual spreadsheets
* Hardcoded website content
* External participant tracking
* Manual reporting

---

# Success Criteria

Admins can:

* Manage website content
* Publish announcements
* Update FAQs
* Sync data to Google Sheets
* Monitor advanced analytics
* Track competition performance
* Track university participation
* Manage festival content

Participants can:

* Stay updated through announcements
* Track all competition activities
* Access a polished, premium experience

---

# Features

## 1. Festival CMS

The website becomes fully manageable from the Admin Dashboard.

---

### Announcement Management

Admin Can:

Create

Edit

Delete

Pin

Archive

Announcements

---

### Announcement Fields

Title

Content

Priority

Status

Publish Date

Expiry Date

Pinned

---

### Announcement Visibility

Homepage

Participant Dashboard

Notifications

---

### Announcement Types

General

Competition

Results

Deadline

Emergency

Custom

---

## 2. Homepage News Ticker

### Purpose

Display important updates instantly.

---

### Examples

Registration Open

Deadline Extended

Finalists Announced

Payment Deadline Reminder

---

### Admin Features

Create Ticker Item

Edit Ticker Item

Delete Ticker Item

Pin Item

Schedule Item

---

### Display

Auto-scrolling ticker.

Pause on hover.

Mobile optimized.

---

## 3. FAQ Management

### Admin Features

Create FAQ

Edit FAQ

Delete FAQ

Reorder FAQ

---

### FAQ Fields

Question

Answer

Display Order

Visibility

---

### Display Locations

Homepage

Competition Detail Pages

---

## 4. Contact Management

Admin Can Update:

Email

Phone

Facebook

LinkedIn

Address

Google Maps URL

Support Information

---

### Dynamic Website Updates

Changes appear instantly.

No code deployment required.

---

## 5. Advanced Google Sheets Integration

### Purpose

Allow organizers to work with spreadsheets while maintaining the platform as the source of truth.

---

### Initial Export

Button:

Push Initial Data

Creates:

Participants Sheet

Teams Sheet

Payments Sheet

Submissions Sheet

Rankings Sheet

Finalists Sheet

---

### Sync System

Button Changes To:

Sync Changes

---

### Sync Engine

Detects:

New Records

Updated Records

Deleted Records

Status Changes

Score Changes

Payment Changes

---

### Sync Dashboard

Displays:

Last Sync Time

Pending Changes

Sync Status

Affected Records

---

### Selective Export

Admin Chooses:

Competition

Data Type

Columns

Destination Sheet

---

## 6. Advanced Analytics Platform

### Overview Dashboard

Metrics

Total Participants

Total Teams

Total Competitions

Selected Teams

Pending Reviews

Pending Payments

Revenue

Expected Revenue

Collection Rate

Universities Participating

---

## 7. Competition Analytics

Displays

Registrations

Submissions

Selections

Finalists

Revenue

Per Competition

---

### Competition Performance

Most Popular Competition

Lowest Participation

Highest Revenue

Highest Selection Rate

---

### Trend Charts

Registration Trends

Submission Trends

Revenue Trends

---

## 8. University Analytics

### University Leaderboard

Displays

University

Participants

Teams

Selected Teams

Finalists

---

### Insights

Most Active University

Highest Acceptance Rate

Largest Participation

---

### University Distribution Charts

Bar Charts

Pie Charts

Trend Graphs

---

## 9. Financial Analytics

### Revenue Dashboard

Total Revenue

Expected Revenue

Collection Rate

Pending Amount

---

### Competition Revenue

Revenue Per Competition

Average Fee

Collection Performance

---

### Payment Analytics

Approved Payments

Rejected Payments

Pending Payments

Resubmissions

---

## 10. Advanced Activity Monitoring

### Live Activity Feed

Shows

New Registrations

New Teams

Submissions

Payment Requests

Selections

Admin Actions

---

### Filters

Competition

Date

Action Type

Status

---

## 11. Enhanced Admin Search

### Global Search

Search Across

Participants

Teams

Competitions

Payments

Submissions

Universities

---

### Instant Results

Keyboard Shortcut

Ctrl + K

Command Palette Style

Inspired By:

Linear

Vercel

GitHub

---

## 12. Advanced Filtering System

Every Major Table Supports

Search

Sorting

Pagination

Column Visibility

Export

---

### Examples

Participants Table

Teams Table

Submissions Table

Payments Table

Rankings Table

---

## 13. Data Export System

Beyond Google Sheets.

Support:

CSV

Excel

Filtered Exports

---

### Export Examples

Selected Teams

Finalists

Payments

Participants

Universities

---

## 14. Website Performance Optimization

### Core Requirements

Lighthouse Score

90+

---

### Optimization Targets

Fast Initial Load

Image Optimization

Code Splitting

Lazy Loading

Caching

Database Optimization

---

## 15. Advanced Security Hardening

### Protection Layers

Authentication Security

Role Protection

Database RLS

API Validation

Rate Limiting

File Validation

Audit Logging

---

### Upload Security

Cloudinary Validation

File Type Restrictions

File Size Restrictions

Virus Prevention Strategy

---

## 16. Production Readiness

### Monitoring

Error Tracking

Performance Tracking

Activity Tracking

---

### Reliability

Graceful Error Handling

Fallback States

Loading States

Retry Logic

---

### Quality Standards

No Broken States

No Dead Ends

No Empty Pages

No Unhandled Errors

---

## 17. Premium User Experience

### Motion Design

Framer Motion

Page Transitions

Micro Interactions

Hover Effects

Scroll Animations

---

### Visual Features

Aurora Backgrounds

Glass Components

Animated Gradients

Interactive Cards

Premium Typography

---

### Mobile Experience

Mobile First

Touch Friendly

Responsive Layouts

Gesture Friendly

---

## 18. Final Festival Experience

The platform should feel like:

A premium technology conference platform.

Not:

A university portal.

Not:

A CRUD dashboard.

Not:

A form collection website.

---

### Experience Benchmarks

Public Website

Inspired By:

* Apple
* Vercel
* Stripe
* GitHub Universe

Participant Dashboard

Inspired By:

* Linear
* Notion
* GitHub

Admin Dashboard

Inspired By:

* Stripe Dashboard
* Vercel Dashboard
* Supabase Studio

---

# Phase 3 Deliverables

✓ CMS

✓ Announcements

✓ News Ticker

✓ FAQ Management

✓ Contact Management

✓ Google Sheets Sync

✓ Advanced Analytics

✓ University Analytics

✓ Revenue Analytics

✓ Global Search

✓ Advanced Exports

✓ Security Hardening

✓ Performance Optimization

✓ Premium UI/UX

✓ Production Readiness

---

# Final Product Outcome

By the completion of Phase 3, the platform becomes the single operational source of truth for CSE Fest 2026.

Every registration, team, submission, payment, evaluation, announcement, ranking, and organizer workflow is managed through one unified system.

No external registration forms.

No manual participant spreadsheets.

No scattered competition data.

No fragmented organizer workflow.

One platform.
One database.
One workflow.
One source of truth.
