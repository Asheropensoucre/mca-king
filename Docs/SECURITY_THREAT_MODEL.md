# MCA King Security Threat Model and Incident Runbook

_Last updated: 2026-05-15_

## Top abuse cases and controls

| Abuse case | Control |
|---|---|
| Merchant A fetches Merchant B | `canAccessMerchant` and per-route merchant ownership checks. |
| Lender views unmatched/unsubmitted merchant | Lender access requires `lender_matches` or `merchant_file_submissions`; nested competing offers are sanitized. |
| Sales rep views another rep's book | Merchant, lead, report, renewal, finance, and task routes are scoped to assigned/created records. |
| CSRF status change or destructive mutation | Global CSRF middleware blocks missing/invalid token on `POST/PATCH/DELETE`. |
| Brute-force login | Durable Supabase-backed rate limits plus failed-login count and temporary lockout. |
| Upload spam or malicious files | Upload route has per-user/hour limit, file size cap, MIME allowlist, extension/MIME match, server-generated storage paths. |
| Public document exposure | `documents` bucket is private; signed URLs are generated only after permission checks and expire quickly. |
| Service role key leaked to browser | Browser only uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; service role is server-only in `src/lib/supabase-server.ts`. |
| AI prompt leaks PII | AI route sanitizes context before prompt construction and audit logs only request metadata. |
| Audit tampering by normal users | `audit_logs` has RLS enabled and public access blocked; only server service-role routes write/read. |
| Resend webhook spoofing | Webhook verifies `RESEND_WEBHOOK_SECRET` when configured. |

## Incident response checklist

1. Identify affected user, merchant, document, or route from `audit_logs`.
2. Disable suspicious user in Admin Settings or via SQL:
   ```sql
   update public.users set is_disabled = true, disabled_at = now() where email = '<user email>';
   delete from public.session where "userId" = '<user uuid>';
   ```
3. Rotate exposed secrets if suspected:
   - Supabase service role key: Supabase Dashboard → Project Settings → API.
   - Resend API key: Resend Dashboard → API Keys.
   - Gemini API key: Google AI Studio / Google Cloud key controls.
   - `BETTER_AUTH_SECRET`: update Vercel env and force logouts by deleting sessions.
4. Review unusual actions:
   ```sql
   select * from public.audit_logs order by created_at desc limit 100;
   select * from public.security_rate_limits order by created_at desc limit 100;
   select * from public.security_login_failures order by updated_at desc limit 100;
   ```
5. Revoke all sessions if needed:
   ```sql
   delete from public.session;
   ```
6. Check document access:
   ```sql
   select * from public.audit_logs where action in ('document.listed','document.signed_url_generated','document.deleted') order by created_at desc;
   ```
7. Restore data using Supabase backups/PITR if available for the project plan.
8. Document root cause and patch code/tests before re-enabling affected account or workflow.

## Operational monitoring recommendations

Set alerts for:

- high rate of `auth.login.failure`
- `security.rate_limited`
- unusual `document.signed_url_generated` volume
- repeated AI requests by one user
- upload spikes
- Supabase service-role errors in Vercel logs

## Security test checklist

Before production onboarding, manually or automatically verify:

- Merchant A cannot fetch Merchant B.
- Lender A cannot fetch unmatched Merchant B.
- Sales rep A cannot fetch unassigned Merchant B.
- Merchant cannot change status to `FUNDED` directly.
- Lender cannot create merchant records.
- Missing CSRF token blocks mutating requests.
- Invalid UUID path params return `400`/`404`, not crashes.
- Repeated bad login attempts produce `429`.
- Unsupported/oversized document upload is rejected.
- Direct anon Supabase table reads return no sensitive rows.
