# MCA King — Vercel Deployment Guide

_Last updated: 2026-05-12_

## Purpose

This guide explains how to deploy MCA King to Vercel safely. MCA King is a Vite + React app with server-side API route handlers. Local development uses a Vite middleware bridge, while production on Vercel uses root-level serverless functions in the `api/` directory.

## Deployment Architecture

```txt
Browser
  ↓
Vercel static frontend build from dist/
  ↓
Vercel serverless functions in api/
  ↓
Existing route logic in src/routes/
  ↓
Supabase Postgres + Supabase Storage
  ↓
Resend / Gemini where applicable
```

### Local development

Local development still uses the Vite API middleware bridge in:

```txt
vite.config.ts
src/server/api.ts
```

The dev bridge forwards local `/api/*` requests to the same handlers used in production.

### Production

Vercel does not run the Vite dev middleware. Production API calls are handled by root-level Vercel functions:

```txt
api/
```

Each file in `api/` is a thin wrapper around existing `src/routes/*` route logic. Do not duplicate business logic in `api/`; import and reuse route handlers from `src/routes`.

## Important Files

```txt
vercel.json                 # Vercel build/output config and API rewrite
.env.example                # Placeholder env var names only; no secrets
api/_utils.ts               # VercelRequest/VercelResponse bridge to Web Request/Response
api/**                      # Vercel serverless wrappers
src/routes/**               # Existing API route logic
src/server/api.ts           # Local dev API route registry
vite.config.ts              # Vite config and dev-only middleware bridge
src/lib/session-auth.ts     # Session cookie settings for local/prod
```

## API Route Mapping

| Vercel function file | Production route |
|---|---|
| `api/ai/chat.ts` | `POST /api/ai/chat` |
| `api/auth/login.ts` | `POST /api/auth/login` |
| `api/auth/register.ts` | `POST /api/auth/register` |
| `api/auth/logout.ts` | `POST /api/auth/logout` |
| `api/auth/me.ts` | `GET /api/auth/me` |
| `api/merchants/index.ts` | `GET/POST /api/merchants` |
| `api/merchants/[id].ts` | `GET/PATCH/DELETE /api/merchants/:id` |
| `api/lenders/index.ts` | `GET/POST /api/lenders` |
| `api/lenders/[id].ts` | `GET/PATCH/DELETE /api/lenders/:id` |
| `api/offers/index.ts` | `GET/POST /api/offers` |
| `api/offers/[id].ts` | `PATCH /api/offers/:id` |
| `api/leads/index.ts` | `GET/POST /api/leads` |
| `api/leads/[id].ts` | `GET/PATCH/DELETE /api/leads/:id` |
| `api/leads/[id]/notes.ts` | `POST /api/leads/:id/notes` |
| `api/leads/[id]/convert.ts` | `POST /api/leads/:id/convert` |
| `api/documents/index.ts` | `GET /api/documents` |
| `api/documents/upload.ts` | `POST /api/documents/upload` |
| `api/documents/[id].ts` | `DELETE /api/documents/:id` |
| `api/stipulations/index.ts` | `GET/POST /api/stipulations` |
| `api/matching/index.ts` | `GET /api/matching` |
| `api/matching/run.ts` | `POST /api/matching/run` |
| `api/matching/manual.ts` | `POST/DELETE /api/matching/manual` |
| `api/matching/notify.ts` | `POST /api/matching/notify` |
| `api/users/sales-reps.ts` | `GET /api/users/sales-reps` |

## Environment Variables

Add these in Vercel under:

```txt
Project Settings → Environment Variables
```

Never commit real values.

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project API URL for server-side Supabase client. | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key if server utilities need compatibility with anon usage. | Recommended |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key for server-side privileged operations. Keep secret. | Yes |
| `DATABASE_URL` | Supabase Postgres or pooler connection string for Better Auth/Kysely compatibility. | Yes |
| `BETTER_AUTH_SECRET` | Random secret for Better Auth-compatible auth configuration. | Yes |
| `BETTER_AUTH_URL` | Public Vercel app URL used for auth/email links. Update after first deploy. | Yes |
| `RESEND_API_KEY` | Resend API key for outbound workflow emails. | Yes for email |
| `EMAIL_FROM` | Verified sender email/domain in Resend. | Yes for email |
| `GEMINI_API_KEY` | Server-only Gemini API key for MCA King Assistant through `/api/ai/chat`. Do not prefix with `VITE_`. | Yes for AI |
| `VITE_SUPABASE_URL` | Public Supabase project URL exposed to browser. | Yes |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon/publishable key exposed to browser. | Yes |

Use `.env.example` as the source list for Vercel variables.

## Cookie Settings

Session cookies are generated in:

```txt
src/lib/session-auth.ts
```

Production behavior:

```txt
HttpOnly
SameSite=Lax
Path=/
Max-Age=7 days
Secure=true in production
No hardcoded domain
```

Do not hardcode a cookie domain. Let the browser bind the cookie to the Vercel deployment domain.

## Step-by-Step Vercel Deployment

### 1. Push code to GitHub

```bash
git add .
git commit -m "Prepare MCA King for Vercel deployment"
git push
```

### 2. Import project in Vercel

Go to:

```txt
https://vercel.com
```

Then:

```txt
New Project → Import Git Repository → select the MCA King repo
```

### 3. Configure project root

If the Vite app is inside a subfolder, set:

```txt
Root Directory: mca-application-form
```

If the repository root is already the app root, leave Root Directory as default.

### 4. Configure build settings

Use:

```txt
Framework Preset: Vite
Install Command: bun install
Build Command: bun run build
Output Directory: dist
```

`vercel.json` also declares:

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 5. Add environment variables

In Vercel:

```txt
Project Settings → Environment Variables
```

Add every variable from `.env.example` with real values. `GEMINI_API_KEY` is server-only and must not be added as `VITE_GEMINI_API_KEY`.

Important rules:

- Do not prefix secret server variables with `VITE_`.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, and `BETTER_AUTH_SECRET` are server-only secrets.
- `VITE_*` variables are visible to browser code.

### 6. Deploy

Click:

```txt
Deploy
```

### 7. Update `BETTER_AUTH_URL`

After the first deploy succeeds, copy the final production URL, for example:

```txt
https://mca-king.vercel.app
```

Update the Vercel environment variable:

```txt
BETTER_AUTH_URL=https://mca-king.vercel.app
```

Then redeploy.

### 8. Update Supabase URL settings if needed

If any Supabase Auth or redirect settings use app URLs, add:

```txt
https://mca-king.vercel.app
```

Keep local development URLs too if needed:

```txt
http://localhost:3000
```

## Pre-Deploy Verification

Run locally before pushing:

```bash
bun run --bun tsc -p ./tsconfig.json --noEmit
bun run build
```

The Vite chunk-size warning is acceptable and does not block deployment.

## Post-Deploy Smoke Test

After deployment, test these flows against the Vercel URL:

1. `GET /api/auth/me` returns unauthorized when logged out.
2. Admin login succeeds.
3. Admin dashboard loads merchants/lenders/leads.
4. Merchant registration/login works.
5. Lender registration/login works.
6. Sales rep creation works from admin.
7. Merchant application can be submitted.
8. Document upload works through `POST /api/documents/upload`.
9. Matching routes work:
   - `GET /api/matching`
   - `POST /api/matching/run`
   - `POST /api/matching/notify`
10. Resend emails do not crash route execution.
11. MCA King Assistant calls `/api/ai/chat`; it shows a server configuration error if `GEMINI_API_KEY` is missing, or responds if configured.

## Common Deployment Issues

### API routes work locally but 404 on Vercel

Check that the root `api/` folder exists and was committed.

### Cookies not persisting

Check:

- Vercel deployment is HTTPS.
- `NODE_ENV=production` is set by Vercel.
- Cookie has `Secure`, `HttpOnly`, `SameSite=Lax`, and no hardcoded domain.
- `BETTER_AUTH_URL` matches the final Vercel URL.

### Supabase service role errors

Check:

- `SUPABASE_URL` is set.
- `SUPABASE_SERVICE_ROLE_KEY` is set.
- The service role key is not accidentally placed in a `VITE_*` variable.

### Gemini errors

Check:

- `GEMINI_API_KEY` is set in Vercel as a server-only variable, not a `VITE_*` variable.
- Redeploy after adding the key.

### Resend errors

Check:

- `RESEND_API_KEY` is set.
- `EMAIL_FROM` uses a verified Resend sender/domain.

## Maintenance Notes

When adding a new route under `src/routes`, also add:

1. A root Vercel wrapper under `api/`.
2. A local-dev registration in `src/server/api.ts`.
3. API client methods in `src/lib/api-client.ts` if used by frontend.
4. Documentation in this deployment guide if it changes public API behavior.
