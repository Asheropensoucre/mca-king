# MCA King — Production Security Hardening Plan

_Last updated: 2026-05-12_

## Purpose

This plan defines the security work required before MCA King should store real customer/merchant data at production scale.

MCA King is no longer just a demo/MVP. It handles data that can include bank statements, ownership information, signatures, funding documents, offers, contracts, business financials, and lender/funder decisions. That makes security a core product requirement, not a final polish task.

This document should be treated as a dedicated future phase that sits alongside the existing engineering roadmap and the broader broker CRM expansion plan.

## Target Outcome

Before onboarding real customer data, MCA King should be able to answer “yes” to these questions:

1. Can every API route prove the user is allowed to see or change that exact record?
2. Are secrets and privileged Supabase keys only available server-side?
3. Are login, registration, AI, and upload routes protected from abuse?
4. Are documents private, permission-checked, size-limited, and auditable?
5. Can the broker/ISO owner see who accessed sensitive data and when?
6. Can a compromised or terminated user be disabled and logged out everywhere?
7. Are sensitive fields masked by default?
8. Are production headers, cookies, CORS, and CSRF protections configured?
9. Are database policies and server checks aligned?
10. Can the team safely investigate incidents using logs without exposing secrets?

## Current Security Foundation

Already completed or mostly in place:

- Real auth routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- HTTP-only `mca_session` cookie.
- `SameSite=Lax` cookie setting.
- `Secure` cookie flag in production.
- Server-side Supabase service-role usage.
- Supabase Storage integration for documents.
- Gemini moved server-side through `/api/ai/chat`.
- `VITE_GEMINI_API_KEY` removed from public env usage.
- Single bundled Vercel API function to avoid runtime route/import crashes.
- Lazy server config for email/Supabase so missing optional env vars do not crash unrelated routes.
- Role concepts exist:
  - `admin`
  - `sales_rep`
  - `merchant`
  - `lender`
- API helpers exist for auth and role checks:
  - `requireAuth(req)`
  - `assertRole(...)`
- Broker-centered role model is documented:
  - Admin = broker/ISO shop owner/operator.
  - Sales rep = internal broker-shop rep.
  - Merchant = applicant/funding customer.
  - Lender/funder = reviewer/approver of broker-submitted/matched files.

## Security Gap Summary

The app has a good security foundation, but a production security hardening phase is still needed in these areas:

1. Endpoint-by-endpoint authorization.
2. Record ownership checks.
3. CSRF protection for cookie-authenticated mutations.
4. Rate limiting and brute-force protection.
5. Input validation and schema enforcement.
6. Audit logging.
7. Document/file upload hardening.
8. Sensitive data masking and minimization.
9. User lifecycle controls.
10. Security headers and browser protections.
11. Supabase RLS/storage policy verification.
12. Incident response and operational logging.

---

# Phase S0 — Security Inventory and Threat Model

## Goal

Create a complete map of what data exists, who can access it, and how it can be abused.

## Tasks

- [ ] List all API routes from `src/server/api.ts`.
- [ ] For each route, document:
  - method
  - role allowed
  - ownership requirement
  - request body shape
  - records touched
  - sensitive data returned
  - whether it mutates state
- [ ] List all Supabase tables and classify data sensitivity:
  - public/basic
  - internal business data
  - merchant financial data
  - personal/owner PII
  - credentials/session data
- [ ] List all document types and classify risk:
  - bank statements
  - applications
  - contracts
  - IDs/owner docs if later added
  - stipulations
- [ ] Identify high-risk flows:
  - login/register
  - document upload/download/delete
  - offer acceptance
  - lender access to merchant files
  - sales rep assignment
  - merchant status changes
  - AI chat context injection
- [ ] Write a simple threat model covering:
  - unauthorized merchant viewing another merchant file
  - lender viewing unmatched merchant files
  - sales rep viewing another rep's book of business
  - brute-force login
  - CSRF status changes
  - malicious file uploads
  - leaked service-role key
  - exposed Gemini/Resend keys
  - audit-log tampering

## Acceptance Criteria

- Every route has an authorization rule documented.
- Every sensitive table and document type has a sensitivity classification.
- Top abuse cases are documented before code hardening begins.

---

# Phase S1 — Endpoint Authorization and Ownership Hardening

## Goal

Make sure every route checks not only “is the user logged in?” but also “is this exact user allowed to access this exact record?”

## Core Rule

UI hiding is not security. Every permission must be enforced server-side.

## Role Access Model

| Role | Allowed Access |
|---|---|
| `admin` | Broker/ISO-wide access to all shop data. |
| `sales_rep` | Assigned merchants/leads and permitted pipeline actions. |
| `merchant` | Their own application, offers, stipulations, and documents only. |
| `lender` | Their own lender profile and merchant files matched/submitted to them only. |

## Tasks

- [ ] Audit every route in `src/routes/**` for `requireAuth(req)`.
- [ ] Audit every route for role checks with `assertRole(...)` or equivalent.
- [ ] Add reusable ownership helpers, for example:
  - `canAccessMerchant(user, merchantId)`
  - `canAccessDocument(user, documentId)`
  - `canAccessLead(user, leadId)`
  - `canAccessOffer(user, offerId)`
  - `canAccessLenderProfile(user, lenderId)`
- [ ] Enforce merchant ownership:
  - merchant users can only read/update their own merchant record where appropriate.
- [ ] Enforce sales rep assignment:
  - reps only see assigned merchants/leads unless admin explicitly grants broader access.
- [ ] Enforce lender match/submission access:
  - lenders can only see merchants tied to them through `lender_matches` or future `merchant_file_submissions`.
- [ ] Enforce document access:
  - signed URLs are generated only after permission checks.
- [ ] Prevent lenders from creating merchant deals.
- [ ] Prevent merchants from changing admin-only fields:
  - status
  - assigned rep
  - matched lender
  - lender offer internals
- [ ] Prevent reps/lenders from changing security-sensitive user fields.

## Route Checklist

Audit and harden at minimum:

```txt
/api/auth/*
/api/merchants
/api/merchants/:id
/api/lenders
/api/lenders/:id
/api/offers
/api/offers/:id
/api/leads
/api/leads/:id
/api/leads/:id/notes
/api/leads/:id/convert
/api/documents
/api/documents/upload
/api/documents/:id
/api/stipulations
/api/matching
/api/matching/run
/api/matching/manual
/api/matching/notify
/api/users/sales-reps
/api/ai/chat
```

## Acceptance Criteria

- No route returns another user's sensitive data by changing an ID in the URL.
- Lenders cannot access unmatched/unsubmitted merchant files.
- Merchants cannot update pipeline/admin-only fields.
- Sales reps cannot access unassigned merchant files unless admin policy allows it.
- Authorization tests exist for each role.

---

# Phase S2 — CSRF Protection

## Goal

Protect state-changing cookie-authenticated routes from cross-site request forgery.

## Why This Matters

The app uses cookies for login sessions. Cookies are automatically sent by browsers. Without CSRF protection, another malicious website could potentially trick a logged-in user’s browser into sending a state-changing request.

`SameSite=Lax` helps, but production finance software should have explicit CSRF protection for sensitive mutations.

## Tasks

- [ ] Add CSRF token generation after login/session restore.
- [ ] Store CSRF token using a safe pattern, such as:
  - double-submit cookie, or
  - server-side token associated with the session.
- [ ] Require CSRF token header on:
  - `POST`
  - `PATCH`
  - `DELETE`
- [ ] Exempt only safe routes if necessary:
  - `GET /api/auth/me`
- [ ] Update frontend API client to send CSRF token.
- [ ] Return `403` on missing/invalid CSRF token.
- [ ] Add tests for missing/invalid/valid CSRF token.

## Acceptance Criteria

- State-changing requests without CSRF token fail.
- Valid app requests continue to work.
- Auth/session flows remain stable in Vercel production.

---

# Phase S3 — Rate Limiting and Abuse Protection

## Goal

Prevent brute-force login, fake registrations, AI abuse, and upload/API spam.

## Routes Requiring Rate Limits

High priority:

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/ai/chat
POST /api/documents/upload
```

Medium priority:

```txt
POST/PATCH/DELETE routes across merchants, offers, leads, matching, stipulations
```

## Tasks

- [ ] Choose rate limit storage:
  - Upstash Redis,
  - Vercel KV,
  - Supabase table/RPC,
  - or another production-safe store.
- [ ] Add IP-based and user-based rate limiting.
- [ ] Add stricter login rate limits by email + IP.
- [ ] Add temporary lockout or increasing delay after repeated failed login attempts.
- [ ] Add AI message limits per user/day.
- [ ] Add upload limits per user/hour and per merchant/day.
- [ ] Log rate-limit events to audit/security logs.

## Acceptance Criteria

- Repeated failed login attempts are blocked or slowed.
- AI endpoint cannot be used to create runaway cost.
- Upload endpoint cannot be spammed endlessly.
- Rate-limit responses use clear `429` errors.

---

# Phase S4 — Input Validation and Output Safety

## Goal

Make every API route validate input strictly before touching the database.

## Recommended Tooling

Use a schema validator such as Zod.

## Tasks

- [ ] Add schemas for:
  - login
  - registration
  - merchant create/update
  - lender create/update
  - offer create/update
  - lead create/update
  - lead notes
  - stipulations
  - matching manual add/remove
  - AI chat
  - document metadata
- [ ] Reject unknown fields where appropriate.
- [ ] Enforce max string lengths.
- [ ] Normalize email, phone, state, money, and percentage fields.
- [ ] Validate UUID path params.
- [ ] Prevent role escalation through request bodies.
- [ ] Sanitize text that may be shown in UI or emails.
- [ ] Standardize error responses without leaking internal stack traces.

## Acceptance Criteria

- Invalid payloads return `400` with safe messages.
- Extra sensitive/admin-only fields in merchant/lender updates are ignored or rejected.
- No route trusts frontend-only validation.

---

# Phase S5 — Document and File Upload Security

## Goal

Make document storage safe enough for real bank statements and contracts.

## Tasks

- [ ] Enforce private Supabase Storage bucket.
- [ ] Confirm no public storage policy exposes merchant documents.
- [ ] Check authorization before:
  - listing documents
  - uploading documents
  - generating signed URLs
  - deleting documents
- [ ] Limit allowed MIME types:
  - PDF
  - PNG/JPEG if needed
  - CSV/XLSX only if intentionally supported
- [ ] Enforce max file size.
- [ ] Validate file extension against MIME type.
- [ ] Store original filename safely without trusting it for paths.
- [ ] Generate storage paths server-side, not client-controlled.
- [ ] Set signed URL expiration to a short window.
- [ ] Log signed URL generation.
- [ ] Log document deletion.
- [ ] Add malware scanning if feasible before full production:
  - external scanning service,
  - Supabase Edge Function flow,
  - or async admin review queue.

## Acceptance Criteria

- Users cannot download documents they are not allowed to access.
- Documents are never public by default.
- Oversized or unsupported files are rejected.
- Document access is audit logged.

---

# Phase S6 — Audit Logging and Status History

## Goal

Create a real trail of who did what, when, and from where.

## New Table: `audit_logs`

Suggested structure:

```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references users(id)
action          text not null
entity_type     text
entity_id       uuid
ip_address      text
user_agent      text
metadata        jsonb default '{}'::jsonb
created_at      timestamptz default now()
```

## Events to Audit

Auth:

- login success
- login failure
- logout
- password reset requested/completed when added
- user disabled/enabled

User/admin:

- admin created sales rep
- role changed
- lender account approved/disabled if added

Merchant/deal:

- merchant created
- merchant viewed if sensitive
- merchant updated
- assigned rep changed
- status changed
- auto-match run
- manual match added/removed
- lender notified

Documents:

- document uploaded
- document listed
- signed URL generated
- document downloaded if trackable
- document deleted

Offers/stips/contracts:

- offer created
- offer accepted/declined
- stipulation requested
- contract sent
- contract signed
- funded status set

AI:

- AI chat request metadata, not full sensitive prompt unless intentionally retained
- blocked AI request
- AI config error

## Status History Table

Create a separate status history table for pipeline movement:

```sql
id              uuid primary key default gen_random_uuid()
merchant_id     uuid references merchants(id)
from_status     text
to_status       text not null
changed_by      uuid references users(id)
reason          text
created_at      timestamptz default now()
```

## Acceptance Criteria

- Sensitive actions create audit logs.
- Pipeline movement creates status history.
- Admin can review logs from the dashboard or internal SQL views.
- Audit logs cannot be edited by normal users.

---

# Phase S7 — Sensitive Data Masking and Minimization

## Goal

Reduce the amount of sensitive data stored and shown.

## Tasks

- [ ] Identify all PII/financial fields in `types.ts`, database payloads, and document metadata.
- [ ] Store only last 4 digits of SSN where possible.
- [ ] Mask sensitive fields in normal dashboard views.
- [ ] Require admin-only or explicit permission to reveal full PII if full PII is ever stored.
- [ ] Avoid sending unnecessary sensitive context to Gemini.
- [ ] Avoid putting sensitive data in logs.
- [ ] Avoid sending full sensitive data in email templates.
- [ ] Add data retention policy for old applications/documents.

## Acceptance Criteria

- Sensitive data is not visible by default.
- AI prompt context excludes unnecessary PII.
- Emails do not contain bank statements or sensitive owner PII directly unless intentionally secured.
- Logs do not contain passwords, tokens, service keys, or full PII.

---

# Phase S8 — User Lifecycle, Session Revocation, and Password Flows

## Goal

Let the broker/ISO safely manage users over time.

## Tasks

- [ ] Add `disabled_at` or `is_disabled` to users.
- [ ] Block disabled users from logging in.
- [ ] Revoke sessions when a user is disabled.
- [ ] Add password reset flow.
- [ ] Add email verification flow.
- [ ] Add admin-created sales rep invite flow instead of manual password handling.
- [ ] Consider MFA for admins and possibly sales reps.
- [ ] Add session list/revoke-all-sessions for admins or users.

## Acceptance Criteria

- Terminated users can be disabled immediately.
- Disabled users cannot keep using old sessions.
- Admins are protected by stronger account security.

---

# Phase S9 — Security Headers, CORS, and Browser Protections

## Goal

Harden browser/runtime behavior around the app.

## Headers to Add

Recommended headers:

```txt
Content-Security-Policy
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy
X-Frame-Options or CSP frame-ancestors
Strict-Transport-Security
```

## Tasks

- [ ] Add Vercel headers in `vercel.json` or middleware-equivalent.
- [ ] Create a CSP that allows only required scripts/styles/connect sources.
- [ ] Account for Tailwind CDN if still used; better long-term fix is build-time Tailwind.
- [ ] Restrict framing to prevent clickjacking.
- [ ] Confirm CORS does not allow arbitrary origins for authenticated APIs.
- [ ] Ensure cookies are not set with a broad/shared domain.

## Acceptance Criteria

- Security header scan passes with acceptable results.
- App still loads in light/dark mode and can call Supabase/API endpoints.
- Auth cookies still work in Vercel production.

---

# Phase S10 — Supabase RLS and Storage Policy Verification

## Goal

Make sure database and storage policies match the app security model.

## Tasks

- [ ] List all public tables.
- [ ] Confirm RLS is enabled on sensitive tables.
- [ ] Confirm anon access is blocked unless intentionally allowed.
- [ ] Confirm service role key is only used server-side.
- [ ] Confirm browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Confirm storage bucket is private.
- [ ] Run Supabase security advisors.
- [ ] Run Supabase performance advisors after adding audit/log indexes.
- [ ] Add indexes for authorization lookups:
  - `merchants.user_id`
  - `merchants.assigned_rep_id`
  - `lender_matches.lender_id`
  - `documents.merchant_id`
  - `session.token`
  - future `merchant_file_submissions.lender_id`

## Acceptance Criteria

- Direct anon access cannot read sensitive tables.
- Storage files are not public.
- Advisors have no critical unresolved security findings.

---

# Phase S11 — Testing and Security Regression Suite

## Goal

Make sure security fixes stay fixed.

## Test Types

- API authorization tests.
- Role/ownership tests.
- CSRF tests.
- Rate-limit tests.
- Input validation tests.
- File upload tests.
- Session/cookie tests.
- Build/deployment smoke tests.

## Required Abuse Tests

- Merchant A cannot fetch Merchant B.
- Lender A cannot fetch unmatched Merchant B.
- Sales rep A cannot fetch unassigned Merchant B unless admin policy allows.
- Merchant cannot change status to `FUNDED` directly.
- Lender cannot create a merchant deal.
- Unauthenticated user cannot call protected routes.
- Invalid UUIDs do not crash routes.
- Missing CSRF token blocks mutations.
- Repeated bad login attempts are rate-limited.
- Oversized document upload is rejected.

## Acceptance Criteria

- Security tests run before deployment.
- Critical auth/ownership rules are covered.
- A failed security test blocks deployment.

---

# Phase S12 — Operations, Monitoring, and Incident Readiness

## Goal

Be ready to detect, investigate, and respond if something goes wrong.

## Tasks

- [ ] Centralize production logs.
- [ ] Ensure logs do not include secrets or full PII.
- [ ] Add error monitoring.
- [ ] Add alerts for:
  - repeated login failures
  - unusual document access
  - high AI usage
  - upload spikes
  - service-role/Supabase errors
- [ ] Document how to rotate secrets:
  - Supabase service role key
  - Resend API key
  - Gemini API key
  - Better Auth secret/session secret strategy
- [ ] Document how to disable a user.
- [ ] Document how to revoke sessions.
- [ ] Document backup/restore expectations for Supabase.

## Acceptance Criteria

- Team can answer: “who accessed this merchant file?”
- Team can disable a user and invalidate access quickly.
- Team can rotate keys if a secret is exposed.
- Team can investigate production errors without reading sensitive data in logs.

---

# Recommended Implementation Order

## Must Do Before Real Customer Data

1. S0 — Security inventory and threat model.
2. S1 — Endpoint authorization and ownership hardening.
3. S3 — Rate limiting for auth/AI/uploads.
4. S4 — Input validation.
5. S5 — Document security.
6. S6 — Audit logging for sensitive actions.
7. S10 — Supabase RLS/storage verification.
8. S9 — Security headers.

## Should Do Very Soon After

1. S2 — CSRF protection.
2. S7 — PII masking/minimization.
3. S8 — Disabled users/session revocation/password reset.
4. S11 — Automated security regression tests.
5. S12 — Monitoring and incident readiness.

## Later / Enterprise-Level Enhancements

- MFA for admins and reps.
- IP allowlists for admin dashboard.
- Device/session management UI.
- Full data retention controls.
- Formal SOC 2-style control mapping.
- External penetration test.
- Malware scanning pipeline for uploaded documents.

---

# Definition of Done for “Customer Data Ready”

MCA King can be considered ready for real customer data only when:

- [ ] All critical API routes have server-side authorization and ownership checks.
- [ ] Lenders can only access broker-submitted/matched merchant files.
- [ ] Merchants can only access their own data.
- [ ] Sales reps can only access assigned data unless admin policy says otherwise.
- [ ] All mutation routes are protected from obvious abuse.
- [ ] Auth, AI, and uploads are rate-limited.
- [ ] Documents are private and signed URLs are permission-checked.
- [ ] Sensitive actions are audit logged.
- [ ] Supabase RLS/storage policies are verified.
- [ ] Secrets are server-only and documented in deployment docs.
- [ ] Security headers are in place.
- [ ] A basic security test suite exists.
- [ ] The team has a documented incident response process.

---

# Notes

This plan is intentionally separate from UI polish and normal feature work. Some items can be built alongside feature phases, but the authorization, document security, audit logging, and rate limiting work should be treated as blockers before serious customer onboarding.
