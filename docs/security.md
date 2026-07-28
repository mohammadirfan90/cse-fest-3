# Security Specifications

This document outlines the security architecture and defensive mechanisms implemented in the CSE Fest 2026 Management Platform.

---

## 🔒 Defense-in-Depth Control Layers

### 1. Authentication and Token Handling
Authentication is implemented via Supabase Auth using the PKCE flow.
*   **Cookie-First Checks:** To avoid header overflow issues caused by large JWTs, the middleware (`src/proxy.ts`) first checks the session via a cookie-only lookup (`getSession()`). It only triggers `getUser()` token validation if the route requires authorization.
*   **Secure Cookie Storage:** Session cookies are stored with the `HttpOnly`, `SameSite=Lax`, and `Secure` attributes.

### 2. Cross-Site Request Forgery (CSRF) Mitigation
The proxy middleware intercepts all data-mutating requests (`POST`, `PUT`, `DELETE`, `PATCH`). It rejects requests if the `Origin` header is present and does not match the `Host` header, preventing CSRF attacks:
```typescript
if (origin) {
  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "CSRF verification failed" }),
      { status: 403 }
    );
  }
}
```

### 3. Magic Byte Signature Verification
Uploaded files are parsed using binary buffers to verify their magic bytes, protecting the system against file spoofing:
*   **PDF Magic Bytes:** `%PDF` (`25 50 44 46`)
*   **Video Magic Bytes:** WebM/MKV headers (`1A 45 DF A3`) or the MP4 `ftyp` box.

### 4. Input Validation & Schema Integrity
API routes validate incoming JSON payloads against strict Zod schemas (e.g., `profileSchema`, `scoreSubmissionSchema`, `paymentReviewSchema`), stripping out undeclared parameters.

### 5. Path Traversal Mitigation
Absolute paths for file writes are validated using `path.join` and verified to ensure they start with `SUBMISSIONS_ROOT + path.sep` before executing write commands.

### 6. Disk safety checks
Before saving files to the server, the backend runs a disk check command (`df -BG /`). If the remaining space on the root partition is less than 5GB, uploads are blocked with a `507 Insufficient Storage` error.

---

## 🛡️ Database Row-Level Security (RLS)
All 17 tables in the database have RLS enabled.

| Table | Policy Rule | Bypassed By |
| :--- | :--- | :--- |
| `public.users` | `auth.uid() = id` (Users view own record) | Security Definer Functions |
| `public.profiles` | `auth.uid() = id` (Users update own profiles) | Admin Role |
| `public.team_members` | Allowed for teammates in the same team | Team Leader Actions |
| `public.submissions` | Members of the team (`invitation_status = 'accepted'`) | Admin Role |
| `public.payments` | Members of the team (`invitation_status = 'accepted'`) | Admin Role |
| `public.audit_logs` | Admin role only | System Mutations |
| `public.scores` | Members read own team score; Admins write | None |
| `public.rankings` | Select allowed only when `is_public = true` | Admin Role |
