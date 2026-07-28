# API Reference Documentation

This document describes the API route handlers implemented in the Next.js App Router for the CSE Fest 2026 Management Platform. All endpoints require authentication and enforce role-based access control (RBAC) unless marked as public.

---

## 🌐 Public Endpoints

### 1. Competitions Directory
*   **Endpoint:** `GET /api/public/competitions`
*   **Purpose:** Fetches a list of all published competitions, containing their names, entry fees, maximum team sizes, and eligibility rules.
*   **Authentication:** None

### 2. CMS Content Queries
*   **Endpoints:**
    *   `GET /api/public/cms/announcements` — Fetches pinned announcements.
    *   `GET /api/public/cms/ticker` — Fetches messages for the horizontal news ticker.
    *   `GET /api/public/cms/faqs` — Fetches active FAQ lists.
    *   `GET /api/public/cms/contact` — Fetches coordinator contact information.
*   **Authentication:** None

---

## 👥 Participant Endpoints

### 1. Profile Wizard Setup
*   **Endpoint:** `POST /api/profile`
*   **Purpose:** Saves the academic records and identity details filled out by the user in the onboarding wizard. Sets `profile_complete = true`.
*   **Request Body:**
    ```json
    {
      "full_name": "Mamun Al Rashid",
      "phone": "+8801700000000",
      "gender": "Male",
      "university": "SMUCT",
      "department": "CSE",
      "semester": "8th",
      "student_id": "201071000",
      "tshirt_size": "XL"
    }
    ```
*   **Rate Limit:** 20 requests per minute.

### 2. Team Management
*   **Endpoints:**
    *   `GET /api/teams` — Fetches user's current teams and pending invitations.
    *   `POST /api/teams` — Creates a team and invites members by email. If the invited email is not registered, pre-populates details as a leader-managed member.
*   **Request Body (POST):**
    ```json
    {
      "name": "Team Debuggers",
      "competition_id": "uuid-here",
      "email": "teammate@email.com"
    }
    ```

### 3. Project Submissions
*   **Endpoints:**
    *   `GET /api/submissions?team_id=[uuid]` — Fetches team proposal details.
    *   `POST /api/submissions` — Submits proposal details and uploads files using `multipart/form-data`.
*   **Request Form Fields:**
    *   `team_id` (string)
    *   `title` (string, min 5 chars)
    *   `pdf` (File, max 5MB)
    *   `youtube_demo_url` (string, optional)
    *   `notes` (string, optional)
*   **Rate Limit:** 10 requests per minute.

### 4. File Streaming
*   **Endpoint:** `GET /api/submissions/file/[id]?type=pdf`
*   **Purpose:** Streams proposal PDF documents directly from the local file system. Supports partial HTTP 206 range requests.
*   **Authorization:** Must be a team member or admin.
*   **Rate Limit:** 30 requests per minute.

### 5. Payments
*   **Endpoint:** `POST /api/payments`
*   **Purpose:** Submits transaction details and screenshot file uploads for registration entry fees.
*   **Request Form Fields:**
    *   `team_id` (string)
    *   `competition_id` (string)
    *   `amount` (number)
    *   `transaction_id` (string, unique)
    *   `screenshot` (File)
    *   `method` (`bkash` or `nagad`)

---

## 🛠️ Admin Endpoints

### 1. Analytics Aggregation
*   **Endpoint:** `GET /api/admin/analytics`
*   **Purpose:** Compiles registration statistics, top participating universities, payment gateway shares, and revenue averages in-memory.

### 2. CSV Exports
*   **Endpoint:** `GET /api/admin/export?type=[type]&competition_id=[uuid]&format=[csv/json]`
*   **Purpose:** Generates a downloadable CSV or JSON preview for teams, payments, rankings, participants, or submissions. Enforces UTF-8 BOM prefixes.
*   **Egress Auditing:** Action is automatically logged in `public.audit_logs`.

### 3. Payment Verification
*   **Endpoint:** `POST /api/admin/payments`
*   **Purpose:** Reviews submitted payments and sets status to `approved`, `rejected`, or `resubmission_required`.

### 4. Score Entry & Rankings
*   **Endpoint:** `POST /api/admin/submissions/score`
*   **Purpose:** Enters numeric scores for team submissions, triggering database ranking updates.
*   **Request Body:**
    ```json
    {
      "team_id": "uuid-here",
      "competition_id": "uuid-here",
      "score": 85
    }
    ```
