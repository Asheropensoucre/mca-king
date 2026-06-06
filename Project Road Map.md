# Project Road Map and Audit

_Last updated: 2026-05-16_

> **Current product summary:** see [`project overview.md`](project%20overview.md).
>
> **Deployment:** see [`Docs/VERCEL_DEPLOYMENT.md`](Docs/VERCEL_DEPLOYMENT.md).
>
> **Security:** see [`Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md`](Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md), [`Docs/SECURITY_ROUTE_INVENTORY.md`](Docs/SECURITY_ROUTE_INVENTORY.md), and [`Docs/SECURITY_THREAT_MODEL.md`](Docs/SECURITY_THREAT_MODEL.md).
>
> **Communications:** see [`Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md`](Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md).

## Executive Summary

MCA King has moved beyond its early prototype phase into a V1 broker-shop CRM foundation. The current app uses React/Vite on the frontend, server-side API routes bundled for Vercel, Supabase Postgres/Storage, Better Auth-compatible session tables with custom HTTP-only session cookies, Resend email, and Gemini through a server-side AI route.

The product model is broker-shop centered:

- Admin = broker-shop owner/operator.
- Sales Rep = internal broker-shop rep.
- Merchant = funding applicant/customer.
- Lender/Funder = external funding partner who reviews broker-submitted or broker-matched merchant files.

This is **not** a lender-originated deal marketplace. Lenders/funders do not create merchant deals in MCA King.

## V1 Current Working State

### Completed / Good

- **Real backend data layer:** Core data is stored through Supabase-backed API routes, not browser `localStorage` for business records.
- **Real authentication/session foundation:** Email/password login/register routes, HTTP-only `mca_session` cookie, CSRF token cookie/header flow, logout, and current-user restore.
- **Role-based dashboards:** Admin, Sales Rep, Merchant, and Lender/Funder dashboard experiences.
- **Responsive dashboard shell:** Desktop has persistent left navigation; mobile/tablet uses a hidden left drawer opened by the menu button.
- **12-step Kamba status system:** `ApplicationStatus` in `types.ts` defines the funding workflow status machine.
- **Shared status configuration:** `components/dashboards/shared/applicationStatus.ts` centralizes status labels, themes, defaults, and helpers.
- **Kamba pipeline:** `components/dashboards/shared/KanbanPipelineView.tsx` provides real-data drag-and-drop workflow movement for Admin and Sales Rep users.
- **Merchant-facing status:** `components/dashboards/MerchantDashboard.tsx` maps internal Kamba statuses to simpler merchant messages, next-action guidance, and assigned broker contact details.
- **Leads:** Lead creation, assignment, notes/call log, filters, saved filters, and lead-to-merchant conversion.
- **Matching:** Server-side automated matching plus manual broker routing to lenders/funders.
- **Merchant-file submissions:** Tracks broker-to-lender/funder package submissions and response outcomes.
- **Documents:** Supabase Storage-backed private document uploads, signed URLs, validation, deletion, and audit events.
- **Stipulations:** Lender/funder/admin document requests and merchant fulfillment flow.
- **Offers:** Lender/funder offer creation and merchant accept/reject workflow with lender offer isolation.
- **Funding/finance:** Funding records, broker revenue receivables, and internal sales rep commission tracking.
- **Renewals and payoff requests:** Renewal queues/history plus early-payoff request tracking and official payoff-letter linking.
- **Reports/analytics:** Admin and sales-rep scoped reporting; lender/funder analytics scoped to their own relationship.
- **Search/work queues:** Global search, filters, pagination, and saved filters.
- **Settings/account management:** User self-service password settings and admin-only user/account management.
- **Communications Center:** Email-first communications with preferences, suppressions, templates, campaign recipients, history, unsubscribe handling, and Resend webhooks. SMS remains disabled/future-ready.
- **AI Assistant:** Gemini is called server-side through `/api/ai/chat`; client secrets are not exposed.
- **Security hardening foundation:** CSRF, origin checks, rate limiting, route authorization inventory, audit logs, sensitive-data masking, private documents, and security headers.
- **Theme/UI:** Corporate Tech theme, dark/light mode, Tailwind/PostCSS build, and mobile-aware UI components.

## Important Current Files

### Core App

```txt
App.tsx
types.ts
vite.config.ts
vercel.json
api/index.js
scripts/build-api.ts
index.html
index.css
index.tsx
```

### Dashboard System

```txt
components/dashboards/DashboardController.tsx
components/dashboards/AdminDashboard.tsx
components/dashboards/SalesRepDashboard.tsx
components/dashboards/LenderDashboard.tsx
components/dashboards/MerchantDashboard.tsx
components/dashboards/shared/DashboardShell.tsx
```

### Backend/API System

```txt
src/server/api.ts
src/server/vercel-entry.ts
src/routes/**
src/lib/requireAuth.ts
src/lib/session-auth.ts
src/lib/csrf.ts
src/lib/route-utils.ts
src/lib/supabase-server.ts
src/lib/api-client.ts
```

### Pipeline / Status System

```txt
components/dashboards/shared/applicationStatus.ts
components/dashboards/shared/KanbanPipelineView.tsx
types.ts
```

### Security / Compliance

```txt
src/lib/audit.ts
src/lib/rate-limit.ts
src/lib/security-headers.ts
src/lib/sensitive-data.ts
src/lib/webhook-security.ts
Docs/SECURITY_ROUTE_INVENTORY.md
Docs/SECURITY_THREAT_MODEL.md
Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md
Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md
```

## The 12-Step Kamba Pipeline

1. `application & 3 months bank statements in`
2. `sent to lender`
3. `all lenders decline`
4. `one or more lender's sent offer`
5. `Merchant accepts offer`
6. `Merchant Declines Offer's`
7. `more docs requested`
8. `contract sent`
9. `contract signed`
10. `contract declined by the merchant`
11. `Declined by funder`
12. `FUNDED`

The pipeline is the source of truth for `merchant.status` and is shared across dashboard, matching, offer, renewal, and notification workflows.

## Post-V1 Roadmap / Next Priorities

V1 is ready for controlled real-data production use based on the completed security sweeps, account access policies, activity/audit logging, private document controls, route authorization inventory, threat model, monitoring/log visibility, and email-first compliance foundation.

This is a free/self-hostable project, not a corporate SaaS launch plan. The practical next priorities are:

1. **Excel/XLSX lead import follow-up:** CSV lead import is implemented for admin/sales-rep users with column mapping, validation, duplicate skipping, safe assignment rules, and audit/activity logging. Add Excel/XLSX support only if CSV is not enough for real operators.
2. **Document malware scanning:** Add malware scanning for uploaded bank statements, contracts, payoff letters, and stipulation documents. This complements the current MIME/size validation, private storage, signed URLs, authorization checks, and audit logging.
3. **Targeted security regression checks:** The broad security sweeps are complete. Keep lightweight regression checks only for future changes to sensitive auth, role access, document access, CSRF, or lender/merchant isolation logic.
4. **Future SMS activation:** Keep SMS disabled until there is an actual company/client need that justifies provider selection, budget, A2P 10DLC registration, STOP/HELP handling, quiet hours, opt-in proof, and legal/compliance review.

Self-hosting note: this repo contains the application code. Customer data belongs in each operator's own Supabase/project backups and should never be committed to the repo.

## Development Commands

Use Bun and Vite:

```bash
bun install
bun run dev
bun run tsc
bun run build
```

Do not open `index.html` directly from the file system. The app expects the Vite dev server or the production build/serverless API route setup.

## Historical Notes

Older phase prompt files under `Docs/PHASE_*` are retained as implementation history. Some older prompt wording may describe work that is now complete. For current project status, prefer:

- `README.md`
- `project overview.md`
- `Project Road Map.md`
- `Docs/SECURITY_ROUTE_INVENTORY.md`
- `Docs/SECURITY_THREAT_MODEL.md`
- `Docs/VERCEL_DEPLOYMENT.md`
