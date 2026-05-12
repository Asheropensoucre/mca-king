<p align="center">
  <img src="public/logo.png" alt="MCA King logo" width="160" />
</p>

# MCA King

<p align="center">
  A production-focused brokerage CRM for merchant cash advance intake, lender matching, offer management, documents, stipulations, and funding workflow automation.
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

MCA King is a broker/ISO-centered merchant cash advance CRM for managing merchant funding files from lead intake through lender submission, approvals, offers, contracts, stipulations, and final funding. The broker shop sources merchant deals; admins and sales reps manage those files; lenders/funders sign in to review broker-submitted merchant files, approve or decline them, request stipulations, and send offers.

The app is designed for MCA broker owners, ISO shops, internal sales reps, merchants, and lender/funder users. Admin users represent the broker/ISO shop owner or operator, not a lender marketplace operator.

<!-- Add screenshots here -->

## Features

- **Role-based dashboards** for broker/ISO Admins, internal Sales Reps, Merchants, and Lender/Funder users.
- **12-step Kamba pipeline** with drag-and-drop deal movement powered by `@dnd-kit`.
- **Automated and manual lender matching engine** that helps the broker shop decide which lenders/funders should review each merchant file.
- **Leads system** with a mini pipeline, assignment, notes/call log, and lead-to-merchant conversion.
- **Document uploads** to Supabase Storage with private files and signed URLs.
- **Stipulations flow** for lenders/funders or broker admins to request additional documents and merchants to fulfill them.
- **Email automation** with 7 Resend-powered triggers for merchant, lender, offer, stipulation, contract, and funded-deal events.
- **Real auth with Better Auth-compatible email/password and database sessions**, backed by Supabase auth tables and secure HTTP-only session cookies.
- **AI Assistant with page-aware context** through the MCA King Assistant powered by Gemini.
- **Dark/light mode** using the Corporate Tech/MCA King theme and global wallpaper background.
- **Grace period reapply logic** for merchants after terminal statuses such as `FUNDED`, `all lenders decline`, or `Declined by funder`.

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CDN configuration |
| Backend | Vite development middleware API bridge, server route handlers in `src/routes` |
| Database | Supabase Postgres |
| Storage | Supabase Storage private `documents` bucket with signed URLs |
| Auth | Better Auth configuration, Better Auth-compatible tables, custom HTTP-only session-cookie route helpers |
| Email | Resend |
| AI | Google Gemini via `@google/genai` |
| Build | Bun, Vite, TypeScript |

## Architecture Overview

### Vite API bridge

MCA King is a Vite React application, not a full-stack framework with automatic filesystem API routes. The project implements a custom Vite middleware bridge in `vite.config.ts` that intercepts `/api/*` requests during local development and forwards them to `src/server/api.ts`.

`src/server/api.ts` maps HTTP methods and paths to handlers under `src/routes`, including auth, merchants, lenders, offers, leads, documents, stipulations, matching, and users.

> **Production note:** the current Vite middleware bridge is a development/runtime integration. For production deployment, these route handlers should be hosted in an appropriate server runtime, serverless functions, or a dedicated API service.

### Role-based access control

Server routes call `requireAuth(req)` from `src/lib/requireAuth.ts`, which resolves the current user from the `mca_session` HTTP-only cookie. Route handlers then enforce role access using shared helpers from `src/lib/route-utils.ts`.

Role examples:

- Admins are broker/ISO shop owners or operators who can manage merchants, lenders/funders, leads, sales reps, matching, documents, and pipeline movement.
- Sales reps are internal broker-shop users who manage assigned deals and leads.
- Merchants can access their own applications, offers, stipulations, and documents.
- Lenders/funders can access their own profile and merchant files submitted or matched to them; they do not originate merchant deals in this CRM.

### 12-step status machine

The application status source of truth is the `ApplicationStatus` union in `types.ts`, with display configuration in `components/dashboards/shared/applicationStatus.ts`. Dashboard views, the Kamba pipeline, merchant reapply logic, matching triggers, and email triggers all depend on these status values.

### Matching engine criteria

The server-side matching engine lives in `src/lib/matching.ts`. Auto-matching evaluates active lenders against merchant attributes, then upserts matches into `lender_matches` without creating duplicates.

Matching criteria include:

- Monthly revenue minimum/maximum
- Minimum credit score
- Maximum current positions
- Industry restrictions
- State restrictions
- Requested funding amount minimum/maximum
- Active lender status

## Getting Started

For production hosting, see the [Vercel Deployment Guide](Docs/VERCEL_DEPLOYMENT.md).

### Prerequisites

- [Bun](https://bun.sh/) installed locally
- Supabase account and project
- Resend account and API key
- Gemini API key from Google AI Studio
- Node-compatible shell environment for Vite/Bun scripts

### Clone and install

```bash
git clone https://github.com/Asheropensoucre/mca-king
cd "Brokerage CRM"
bun install
```

### Environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

If `.env.example` does not exist yet, create `.env.local` manually and add the variables listed in the [Environment Variables](#environment-variables) section.

### Supabase setup

The app expects a Supabase project with Postgres tables for users, merchants, owners, lenders, lender matches, offers, documents, status history, stipulations, leads, lead notes, and Better Auth-compatible session/account tables.

There is currently no checked-in canonical SQL schema file in this repository. The schema is reflected by:

- data models in `types.ts`
- row mapping logic in `src/lib/data-shapes.ts`
- route handlers in `src/routes`
- Supabase client/server helpers in `src/lib/supabase.ts` and `src/lib/supabase-server.ts`

For a clean deploy, create a formal Supabase migration from the current remote schema before production rollout.

### Run locally

```bash
bun run dev
```

Vite starts on port `3000` when available:

```txt
http://localhost:3000
```

Build for production:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

## Environment Variables

| Variable name | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project API URL used by server-side Supabase admin client. | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key used only on the server for privileged route operations. Never expose in browser code. | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL exposed to the Vite client. | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key exposed to the Vite client. | Yes |
| `DATABASE_URL` | Postgres connection string for Better Auth/Kysely configuration and auth table compatibility. | Yes |
| `BETTER_AUTH_URL` | Public application URL used by auth/email flows and email links. | Yes |
| `BETTER_AUTH_SECRET` | Secret for Better Auth deployments that use Better Auth runtime/session features. | Recommended |
| `RESEND_API_KEY` | Resend API key used for outbound email automation. | Yes for email |
| `EMAIL_FROM` | Verified sender address used for Resend emails. | Yes for email |
| `GEMINI_API_KEY` | Server-only Google Gemini API key used by MCA King Assistant through `/api/ai/chat`. Do not prefix with `VITE_`. | Yes for AI |

## Project Structure

```txt
Brokerage CRM/
├── App.tsx                         # Root React app, auth/session routing, forms, dashboards, chat mounting
├── index.html                      # Vite HTML entry and Tailwind Corporate Tech theme config
├── index.css                       # Global Corporate Tech wallpaper, CSS variables, shadow overrides
├── index.tsx                       # React root mount
├── package.json                    # Bun/Vite scripts and dependencies
├── types.ts                        # Shared application data model
├── vite.config.ts                  # Vite config and /api middleware bridge
├── LICENSE                         # MIT license
├── README.md                       # Project documentation
├── public/
│   └── logo.png                    # MCA King logo used by app and README
├── Docs/
│   ├── CORPORATE_TECH_THEME.md     # Theme palette and design-system notes
│   ├── PHASE_1_GOOSE_PROMPT.md     # Historical implementation prompt
│   ├── PHASE_2_GOOSE_PROMPT.md
│   ├── PHASE_3_GOOSE_PROMPT.md
│   ├── PHASE_4_GOOSE_PROMPT.md
│   ├── PHASE_5_GOOSE_PROMPT.md
│   └── PHASE_6_GOOSE_PROMPT.md
├── components/
│   ├── BusinessInfoForm.tsx        # Merchant business information form step
│   ├── OwnersForm.tsx              # Merchant owner information form step
│   ├── AgreementsForm.tsx          # Credit authorization/signature step
│   ├── DocumentUploadStep.tsx      # Merchant bank statement upload step
│   ├── DocumentUpload.tsx          # Reusable document upload component
│   ├── LenderForm.tsx              # Lender criteria/profile form
│   ├── PrintView.tsx               # Printable merchant application package
│   ├── SignaturePad.tsx            # Canvas signature capture
│   ├── StepIndicator.tsx           # Multi-step form progress display
│   ├── Summary.tsx                 # Merchant application review step
│   ├── Chatbot.tsx                 # MCA King Assistant Gemini chat UI
│   ├── icons/
│   │   └── index.tsx               # SVG icon components
│   ├── ui/
│   │   ├── Card.tsx                # Shared card/panel component
│   │   ├── Input.tsx               # Shared input component
│   │   ├── Select.tsx              # Shared select component
│   │   └── Textarea.tsx            # Shared textarea component
│   └── dashboards/
│       ├── DashboardController.tsx # Loads data and routes users to role dashboards
│       ├── AdminDashboard.tsx      # Admin dashboard, directories, reps, pipeline
│       ├── SalesRepDashboard.tsx   # Sales rep leads/deals/pipeline dashboard
│       ├── MerchantDashboard.tsx   # Merchant application, docs, stips, offers, reapply logic
│       ├── LenderDashboard.tsx     # Lender matched merchants, offers, stip requests
│       ├── LeadManager.tsx         # Lead list/detail/notes/conversion UI
│       └── shared/
│           ├── DashboardShell.tsx  # Shared dashboard layout/sidebar shell
│           ├── KanbanPipelineView.tsx # 12-step Kamba drag-and-drop board and fullscreen views
│           ├── DocumentsPanel.tsx  # Server-backed document list/upload/delete panel
│           ├── MerchantDetailView.tsx # Merchant detail, documents, matches, offers
│           ├── LenderDetailView.tsx   # Lender detail summary
│           ├── EditMerchantForm.tsx   # Merchant edit form
│           ├── EditLenderForm.tsx     # Lender edit form
│           ├── SummaryItem.tsx        # Detail key/value row
│           └── applicationStatus.ts   # Status labels, themes, helpers
└── src/
    ├── components/
    │   ├── auth/
    │   │   ├── LoginPage.tsx       # Email/password login UI
    │   │   └── RegisterPage.tsx    # Merchant/lender self-registration UI
    │   └── ui/
    │       ├── PrimaryButton.tsx   # Neumorphic themed primary button
    │       ├── DarkModeToggle.tsx  # Dark/light toggle
    │       ├── RoleToggle.tsx      # Merchant/lender role selector
    │       ├── MCAKingLoader.tsx   # Animated SVG loader
    │       ├── authTheme.ts        # Auth card/input styling helpers
    │       └── corporateTechTheme.ts # Corporate Tech palette export
    ├── lib/
    │   ├── api-client.ts           # Browser API wrapper
    │   ├── auth.ts                 # Better Auth configuration
    │   ├── session-auth.ts         # Cookie session helpers backed by Supabase
    │   ├── requireAuth.ts          # Route authentication helper
    │   ├── supabase.ts             # Browser Supabase client
    │   ├── supabase-server.ts      # Server Supabase service-role client
    │   ├── data-shapes.ts          # Frontend/DB row mapping
    │   ├── matching.ts             # Auto lender matching engine
    │   ├── route-utils.ts          # Route response/access helpers
    │   ├── email.ts                # Resend client/env validation
    │   ├── email-data.ts           # Email data fetch helpers
    │   ├── email-templates.ts      # HTML email templates
    │   ├── send-email.ts           # Email send wrappers
    │   └── email-triggers.ts       # Fire-and-forget workflow email triggers
    ├── server/
    │   └── api.ts                  # /api route dispatcher used by Vite middleware
    └── routes/
        ├── auth/                   # register/login/logout/me
        ├── merchants/              # merchant CRUD and status updates
        ├── lenders/                # lender CRUD
        ├── offers/                 # lender offers and merchant offer decisions
        ├── leads/                  # leads, notes, conversion
        ├── documents/              # uploads, signed URLs, delete
        ├── stipulations/           # stipulation list/create
        ├── matching/               # auto/manual matching and lender notify
        └── users/                  # sales rep lookup
```

## The 12-Step Pipeline

| Step | Status | Plain English description |
|---:|---|---|
| 1 | `application & 3 months bank statements in` | Merchant submitted the application and required bank statements; the file is waiting for review. |
| 2 | `sent to lender` | Application is being matched and sent to lenders. This can trigger server-side auto-matching. |
| 3 | `all lenders decline` | No lenders approved the application. This is a red/dead-end outcome. |
| 4 | `one or more lender's sent offer` | One or more lenders/funders responded to the broker-submitted file with offers for merchant review. |
| 5 | `Merchant accepts offer` | Merchant selected an offer and the deal moves toward contract. |
| 6 | `Merchant Declines Offer's` | Merchant rejected all offers. |
| 7 | `more docs requested` | A lender requested additional documents/stipulations from the merchant. This is yellow/action-needed. |
| 8 | `contract sent` | Contract is ready for merchant review and signature. |
| 9 | `contract signed` | Contract is signed and awaiting funder approval. |
| 10 | `contract declined by the merchant` | Merchant declined the contract. |
| 11 | `Declined by funder` | Funder rejected the deal after contract stage. This is a red/dead-end outcome. |
| 12 | `FUNDED` | Deal is complete and the merchant received funding. This is green/funded. |

Color coding is configured in `components/dashboards/shared/applicationStatus.ts`:

- **Red** = declined/dead-end statuses
- **Green** = funded/completed status
- **Yellow** = action-needed statuses such as more documents or offers
- Neutral/accent colors = active in-progress pipeline steps

## Role Permissions

| Role | Can See | Can Do |
|---|---|---|
| Admin / Broker Owner | All merchants, lenders/funders, leads, sales reps, documents, matches, offers, stipulations, and full Kamba pipeline | Operate the broker shop: create sales reps, assign reps, edit merchants/lenders, run auto-match, add/remove manual matches, submit/notify lenders, manage leads, delete documents, move deals through the pipeline, print applications |
| Sales Rep | Assigned merchant files, leads, lender list for matching, pipeline view for assigned deals | Work broker-shop leads, convert leads, update assigned merchant files, run matching, manually add matches, print assigned applications |
| Merchant | Own application, own documents, own stipulations, own offers, current pipeline status | Submit application, upload documents, fulfill stipulations, accept/reject offers, edit active application, reapply after grace period |
| Lender/Funder | Own lender profile and merchant files submitted/matched to that lender | Maintain criteria, review broker-submitted merchant files, approve/decline, send offers, request stipulations/documents |

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
bun run --bun tsc -p ./tsconfig.json --noEmit
bun run build
```

6. Open a pull request with a clear description, screenshots for UI changes, and notes for any schema or environment changes.

### Code style notes

- Use TypeScript throughout.
- Avoid `any`; model data explicitly in `types.ts` or local route/component types.
- Keep shared API/data shape logic in `src/lib`.
- Keep route handlers in `src/routes` and register them through `src/server/api.ts`.
- Use Bun for dependency management.
- Do not expose service-role keys or database URLs to client-side code.
- Preserve the 12-step `ApplicationStatus` union unless a migration plan is included.

## License

MIT — Asheropensource

See [LICENSE](LICENSE).

## Acknowledgements

MCA King is built with and inspired by excellent open-source and developer-platform tools:

- [Supabase](https://supabase.com/) for Postgres, Storage, signed URLs, and service APIs
- [Better Auth](https://www.better-auth.com/) for auth architecture and database-compatible auth models
- [Resend](https://resend.com/) for transactional email automation
- [Vite](https://vite.dev/) for frontend tooling and development server middleware
- [React](https://react.dev/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling via CDN configuration
- [dnd-kit](https://dndkit.com/) for drag-and-drop pipeline interactions
- [Google Gemini](https://ai.google.dev/) for MCA King Assistant
