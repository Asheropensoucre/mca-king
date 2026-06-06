<p align="center">
  <img src="public/logo.png" alt="MCA King logo" width="160" />
</p>

# MCA King

<p align="center">
  A broker-shop CRM for merchant cash advance intake, lender/funder matching, offers, documents, stipulations, renewals, communications, reporting, and funding workflow automation.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" /></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-blue.svg" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB.svg" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF.svg" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg" />
  <img alt="Bun" src="https://img.shields.io/badge/Bun-Runtime-000000.svg" />
</p>

## Overview

MCA King is a broker-shop merchant cash advance CRM. The broker shop sources merchant files, manages them through internal admins and sales reps, submits qualified merchant packages to lenders/funders, and tracks the full workflow through matching, offers, stipulations, contracts, funding, renewals, payoff requests, reporting, and communications.

This is **not** a lender-originated deal marketplace. Lenders/funders sign in only to review broker-submitted or broker-matched merchant files, approve/decline them, request stipulations, and send offers. Admin users represent the broker shop owner/operator.

## Current Product Scope

MCA King includes four primary role experiences:

| Role | Purpose |
|---|---|
| Admin | Broker-shop owner/operator. Manages users, sales reps, merchants, lenders/funders, pipeline, matching, renewals, revenue, commissions, reporting, audit logs, and communications. |
| Sales Rep | Internal broker-shop rep. Works assigned leads, merchant files, tasks, renewals, reports, communications, and pipeline activity. |
| Merchant | Funding applicant/customer. Submits applications, uploads documents, responds to stipulations, reviews offers, requests payoff letters, and manages safe self-service account settings. |
| Lender/Funder | Funding partner reviewer. Reviews broker-submitted merchant files, submits offers, requests stipulations, manages their lender profile, and sees only their own authorized relationship data. |

## Features

- **Role-based dashboards** for Admin, Sales Rep, Merchant, and Lender/Funder users.
- **Responsive dashboard shell** with persistent desktop left navigation and mobile drawer navigation.
- **12-step Kamba pipeline** with drag-and-drop status movement powered by `@dnd-kit` for internal broker workflows.
- **Merchant-facing application dashboard** with simplified status messaging, next-action guidance, assigned broker contact details, document upload, stipulations, offers, renewals, and payoff requests.
- **Lead management** with lead assignment, CSV import with mapping/validation/duplicate skipping, notes/call log, saved views, filtering, and lead-to-merchant conversion.
- **Automated and manual lender/funder matching** based on lender criteria and merchant profile data.
- **Merchant-file submission tracking** for broker-to-lender/funder packages, response statuses, declines, no-response outcomes, offers, and stipulation requests.
- **Private document storage** through Supabase Storage, including upload validation, signed URLs, permission checks, and audit events.
- **Stipulations workflow** for admins/lenders to request additional documents and merchants to fulfill those requests.
- **Offer workflow** with lender/funder offer creation and merchant offer accept/reject decisions.
- **Renewals and payoff requests** for funded merchants, including renewal records, early-payoff request tracking, and official payoff-letter upload/linking by the funding lender/funder or admin.
- **Funded-deal finance tracking** for first fundings, renewal fundings, additional/split funding positions, broker revenue receivables, and internal sales rep commission status.
- **Reporting and analytics** for admins and scoped sales reps, including overview, pipeline, funding, leads, lender/funder performance, broker revenue, commissions, renewals, tasks, and CSV export support.
- **Lender/funder analytics** scoped to that lender/funder relationship only.
- **Search, filters, pagination, and saved views** for operational work queues.
- **Account settings and admin user management** with self-service password changes for normal users and admin-controlled email, role, reset, disable, and close-account actions.
- **Email automation** using Resend for transactional workflow emails.
- **Email-first Communications Center** with preferences, suppressions, templates, selected-recipient campaign drafts, recipient preview, unsubscribe handling, communication history, and Resend webhook ingestion.
- **AI Assistant** with page-aware context through Gemini via a server-side API route.
- **Audit and security hardening foundation** including server-side audit logs, admin audit viewer, sensitive-field masking, CSRF protection, production security headers, and first-pass rate limiting.
- **Dark/light Corporate Tech theme** with semantic Tailwind tokens and global MCA King styling.

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS/PostCSS |
| Backend/API | Custom Vite dev middleware and Vercel serverless API bundle |
| Database | Supabase Postgres |
| Storage | Supabase Storage private `documents` bucket with signed URLs |
| Auth/session | Better Auth-compatible auth models plus custom HTTP-only session-cookie route helpers |
| Email | Resend for app/campaign email; Zoho Mail intended only for human mailbox hosting |
| AI | Google Gemini via `@google/genai` |
| Build/package manager | Bun, Vite, TypeScript |

## Architecture Overview

### Vite API bridge

MCA King is a Vite React application, not a full-stack framework with automatic filesystem API routes. During local development, `vite.config.ts` intercepts `/api/*` requests and forwards them to `src/server/api.ts`.

`src/server/api.ts` maps HTTP methods and API paths to handlers under `src/routes`, including auth, merchants, lenders, offers, leads, documents, stipulations, matching, tasks, renewals, reports, communications, settings, audit logs, and webhooks.

### Vercel production API bundle

Production uses a single bundled serverless function at `api/index.js`, generated from `src/server/vercel-entry.ts` by:

```bash
bun run build:api
```

The full production build runs both the API bundle and the web build:

```bash
bun run build
```

See [`Docs/VERCEL_DEPLOYMENT.md`](Docs/VERCEL_DEPLOYMENT.md) for deployment notes.

### Role-based access control

Server routes use `requireAuth(req)` from `src/lib/requireAuth.ts` to resolve the current user from the `mca_session` HTTP-only cookie. Route handlers then enforce role and ownership access with helpers from `src/lib/route-utils.ts` and route-specific checks.

Important access rules:

- Admins can operate broker-shop-wide data.
- Sales reps are scoped to assigned leads/merchants and permitted broker workflows.
- Merchants can access their own applications, offers, stipulations, documents, and safe account settings.
- Lenders/funders can access only their own lender profile and merchant files tied to that lender/funder through matching/submission/funding relationships.
- Lenders/funders must not see competing lender/funder offers on the same merchant file.

### Communications strategy

MCA King's communications implementation is intentionally **email-first and SMS-later**:

- Use **Resend** for controlled app email and campaign email.
- Use **Zoho Mail** only for normal human inbox/business email, not bulk campaign sending.
- Communication preferences, global suppressions, unsubscribe handling, email templates, campaign recipient tracking, communication history, and Resend webhook ingestion are implemented.
- SMS fields and consent planning exist for future readiness, but live SMS sending is intentionally deferred until there is a real company/client need that justifies provider setup, A2P 10DLC registration, STOP/HELP handling, quiet hours, documented opt-in proof, budget, and legal/compliance review.

See [`Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md`](Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md).

### 12-step status machine

The application status source of truth is the `ApplicationStatus` union in `types.ts`, with display configuration in `components/dashboards/shared/applicationStatus.ts`. Internal dashboard views, Kamba pipeline behavior, merchant reapply logic, matching triggers, status history, and email triggers depend on these status values. The merchant dashboard maps those internal statuses into simpler customer-facing status messages and next-action guidance so merchants are not shown the internal 12-step workflow as a linear journey.

### Matching engine

The server-side matching engine lives in `src/lib/matching.ts`. Auto-matching evaluates active lenders/funders against merchant attributes, then upserts matches into `lender_matches` without creating duplicates.

Matching criteria include:

- Monthly revenue minimum/maximum
- Minimum credit score
- Maximum current positions
- Industry restrictions
- State restrictions
- Requested funding amount minimum/maximum
- Active lender/funder status

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed locally
- Supabase project
- Supabase Postgres schema compatible with this app
- Supabase Storage bucket for private documents
- Resend account/API key for email features
- Gemini API key for AI Assistant features
- Vercel account for production hosting, if deploying publicly

### Clone and install

```bash
git clone https://github.com/Asheropensource/mca-king.git
cd mca-king
bun install
```

If your local folder has a different name, `cd` into that project folder before running the commands below.

### Environment variables

Create your local environment file from the checked-in example:

```bash
cp .env.example .env.local
```

Then fill in your Supabase, auth, Resend, Gemini, and app URL values.

> Never commit `.env`, `.env.local`, service-role keys, database URLs, API keys, or webhook secrets.

### Supabase setup

The app expects Supabase Postgres tables for users, sessions/accounts, merchants, owners, lenders/funders, matches, merchant-file submissions, offers, documents, status history, stipulations, leads, lead notes, activities, tasks, fundings, broker revenue, sales rep commissions, renewals, payoff requests, saved views, audit logs, communication preferences, suppressions, templates, campaigns, campaign recipients, communication history, and account-status fields.

There is not yet a checked-in standalone Supabase SQL schema/migration folder in this repository. The current required schema is reflected by:

- shared models in `types.ts`
- database/frontend mapping in `src/lib/data-shapes.ts`
- API route handlers in `src/routes`
- Supabase helpers in `src/lib/supabase.ts` and `src/lib/supabase-server.ts`
- planning docs under `Docs/`

Self-hosters should run MCA King against a compatible Supabase schema. If a reusable one-command self-host setup is added later, it should describe application schema setup only; customer data should stay in each operator's own Supabase backups and should never be committed to this repo.

### Run locally

```bash
bun run dev
```

Vite starts on port `3000` when available:

```txt
http://localhost:3000
```

### Typecheck and build

```bash
bun run tsc
bun run build
```

Preview the production web build:

```bash
bun run preview
```

## Environment Variables

| Variable name | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project API URL used by the server-side Supabase admin client. | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key used only on the server for privileged route operations. Never expose this in browser code. | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key, included for compatibility with some server/auth setup patterns. | If used by your deployment |
| `VITE_SUPABASE_URL` | Supabase project URL exposed to the Vite client. | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key exposed to the Vite client. | Yes |
| `DATABASE_URL` | Postgres connection string for Better Auth/Kysely compatibility and auth table access. | Yes |
| `BETTER_AUTH_URL` | Public application URL used by auth/email flows and email links. | Yes |
| `BETTER_AUTH_SECRET` | Secret for Better Auth/runtime signing and communication unsubscribe signing fallback. | Yes in production |
| `APP_ALLOWED_ORIGINS` | Comma-separated allowed browser origins for authenticated mutating API requests. | Yes in production |
| `RATE_LIMIT_STORE` | Rate-limit backend. Use Supabase-backed durable limits in production; `memory` is for local/dev fallback only. | Recommended |
| `RESEND_API_KEY` | Resend API key used for outbound workflow and campaign email. | Yes for email |
| `EMAIL_FROM` | Verified sender address used for Resend emails. | Yes for email |
| `RESEND_WEBHOOK_SECRET` | Optional Resend webhook signing secret. If set, `/api/webhooks/resend` rejects invalid webhook signatures. | Recommended |
| `BROKER_PHYSICAL_ADDRESS` | Mailing address/footer value required before sending marketing/campaign emails. | Yes for campaign email |
| `GEMINI_API_KEY` | Server-only Google Gemini API key used by `/api/ai/chat`. Do **not** prefix with `VITE_`. | Yes for AI |

## Project Structure

```txt
mca-king/
├── App.tsx                         # Root React app, auth/session routing, dashboards, print flow
├── index.html                      # Vite HTML entry
├── index.css                       # Tailwind directives, semantic theme tokens, global styling
├── index.tsx                       # React root mount
├── package.json                    # Bun/Vite scripts and dependencies
├── types.ts                        # Shared application data model
├── vite.config.ts                  # Vite config and local /api middleware bridge
├── vercel.json                     # Vercel routing/build config
├── api/
│   └── index.js                    # Generated bundled Vercel serverless API function
├── scripts/
│   └── build-api.ts                # API bundling script
├── public/
│   └── logo.png                    # MCA King logo
├── Docs/                           # Roadmaps, phase notes, security, deployment, communications docs
├── components/
│   ├── BusinessInfoForm.tsx        # Merchant application form step
│   ├── OwnersForm.tsx              # Owner information form step
│   ├── AgreementsForm.tsx          # Credit authorization/signature step
│   ├── DocumentUploadStep.tsx      # Merchant bank-statement upload step
│   ├── LenderForm.tsx              # Lender/funder profile and criteria form
│   ├── PrintView.tsx               # Printable merchant application package
│   ├── Chatbot.tsx                 # MCA King Assistant UI
│   └── dashboards/
│       ├── DashboardController.tsx # Loads data and routes users to role dashboards
│       ├── AdminDashboard.tsx      # Broker admin dashboard
│       ├── SalesRepDashboard.tsx   # Sales rep dashboard
│       ├── MerchantDashboard.tsx   # Merchant-facing status, broker contact, documents, offers, renewals
│       ├── LenderDashboard.tsx     # Lender/funder dashboard
│       ├── AdminSettingsPage.tsx   # Admin user/account settings
│       ├── LeadManager.tsx         # Lead list/detail/notes/conversion UI
│       ├── ReportsView.tsx         # Reporting/analytics UI
│       ├── RenewalsView.tsx        # Renewal queue UI
│       └── shared/                 # Shared dashboard shell, pipeline, documents, tasks, search, mobile helpers
└── src/
    ├── components/
    │   ├── auth/                   # Login and registration UIs
    │   └── ui/                     # Shared UI components and theme helpers
    ├── lib/                        # API client, auth/session, Supabase, security, audit, email, matching, reporting helpers
    ├── server/
    │   ├── api.ts                  # /api route dispatcher used locally and in production bundle
    │   └── vercel-entry.ts         # Vercel serverless entry point
    └── routes/                     # API route handlers by feature area
        ├── activities/
        ├── ai/
        ├── audit/
        ├── audit-logs/
        ├── auth/
        ├── broker-revenue/
        ├── communications/
        ├── documents/
        ├── fundings/
        ├── leads/
        ├── lender-dashboard/
        ├── lenders/
        ├── matching/
        ├── merchant-file-submissions/
        ├── merchants/
        ├── offers/
        ├── payoff-requests/
        ├── renewals/
        ├── reports/
        ├── sales-rep-commissions/
        ├── saved-views/
        ├── search/
        ├── settings/
        ├── stipulations/
        ├── tasks/
        ├── users/
        └── webhooks/
```

## The 12-Step Pipeline

| Step | Status | Plain English description |
|---:|---|---|
| 1 | `application & 3 months bank statements in` | Merchant submitted the application and required bank statements; the file is waiting for review. |
| 2 | `sent to lender` | Application is being matched and sent to lenders/funders. This can trigger server-side auto-matching. |
| 3 | `all lenders decline` | No lenders/funders approved the application. |
| 4 | `one or more lender's sent offer` | One or more lenders/funders sent offers for merchant review. |
| 5 | `Merchant accepts offer` | Merchant selected an offer and the deal moves toward contract. |
| 6 | `Merchant Declines Offer's` | Merchant rejected all offers. |
| 7 | `more docs requested` | A lender/funder requested additional documents/stipulations. |
| 8 | `contract sent` | Contract is ready for merchant review and signature. |
| 9 | `contract signed` | Contract is signed and awaiting funder approval/funding. |
| 10 | `contract declined by the merchant` | Merchant declined the contract. |
| 11 | `Declined by funder` | Funder rejected the deal after contract stage. |
| 12 | `FUNDED` | Deal is complete and the merchant received funding. |

Color coding and helper logic live in `components/dashboards/shared/applicationStatus.ts`.

## Security Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `GEMINI_API_KEY` server-only.
- Do not prefix server secrets with `VITE_`; Vite exposes `VITE_*` variables to browser code.
- The app uses HTTP-only cookies for session state and CSRF protection for authenticated mutating routes.
- Supabase Storage documents should remain private and be served only through permission-checked signed URLs.
- Campaign email must enforce unsubscribe/suppression logic and a configured physical mailing address.
- SMS sending is intentionally disabled until compliance requirements are complete.
- Review [`Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md`](Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md) and [`Docs/SECURITY_THREAT_MODEL.md`](Docs/SECURITY_THREAT_MODEL.md) before handling real customer data at scale.

## Key Documentation

| Document | Purpose |
|---|---|
| [`project overview.md`](project%20overview.md) | Product summary, role model, and implemented phase overview. |
| [`Project Road Map.md`](Project%20Road%20Map.md) | Historical roadmap/audit notes. Some older sections are retained for context. |
| [`ENGINEERING_PLAN.md`](ENGINEERING_PLAN.md) | Engineering plan and stack decisions. |
| [`Docs/VERCEL_DEPLOYMENT.md`](Docs/VERCEL_DEPLOYMENT.md) | Production deployment checklist for Vercel. |
| [`Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md`](Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md) | Security hardening plan and route/data risk model. |
| [`Docs/SECURITY_ROUTE_INVENTORY.md`](Docs/SECURITY_ROUTE_INVENTORY.md) | API route authorization inventory. |
| [`Docs/SECURITY_THREAT_MODEL.md`](Docs/SECURITY_THREAT_MODEL.md) | Threat model summary. |
| [`Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md`](Docs/COMMUNICATIONS_COMPLIANCE_STRATEGY.md) | Email-first/SMS-later communication compliance strategy. |
| [`Docs/MOBILE_UI_IMPLEMENTATION_PLAN.md`](Docs/MOBILE_UI_IMPLEMENTATION_PLAN.md) | Mobile/responsive UI plan and audit notes. |
| [`Docs/UI_THEME_AUDIT_AND_PLAN.md`](Docs/UI_THEME_AUDIT_AND_PLAN.md) | Corporate Tech theme and UI audit notes. |

## Contributing

Contributions are welcome. Treat this repository as a production-grade TypeScript application with strict expectations around data safety, role access, and user workflow integrity.

### Workflow

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

3. Install dependencies:

```bash
bun install
```

4. Make your changes.
5. Typecheck and build before opening a PR:

```bash
bun run tsc
bun run build
```

6. Open a pull request with a clear description and notes for any schema or environment changes.

### Code style notes

- Use TypeScript throughout.
- Avoid `any`; model data explicitly in `types.ts` or route/component-local types.
- Keep shared API/data/security logic in `src/lib`.
- Keep route handlers in `src/routes` and register them through `src/server/api.ts`.
- Use Bun for dependency management.
- Do not expose service-role keys, database URLs, webhook secrets, or AI/email keys to client-side code.
- Preserve the 12-step `ApplicationStatus` union unless a migration plan is included.
- Enforce permissions server-side; UI hiding is not security.

## License

MIT — Asheropensource

See [LICENSE](LICENSE).

## Acknowledgements

MCA King is built with and inspired by excellent open-source and developer-platform tools:

- [Supabase](https://supabase.com/) for Postgres, Storage, signed URLs, and service APIs
- [Better Auth](https://www.better-auth.com/) for auth architecture and database-compatible auth models
- [Resend](https://resend.com/) for transactional and campaign email
- [Vite](https://vite.dev/) for frontend tooling and development server middleware
- [React](https://react.dev/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for build-time utility-first styling
- [dnd-kit](https://dndkit.com/) for drag-and-drop pipeline interactions
- [Google Gemini](https://ai.google.dev/) for MCA King Assistant
