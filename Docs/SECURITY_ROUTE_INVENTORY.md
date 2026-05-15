# MCA King Security Route Inventory

_Last updated: 2026-05-15_

This inventory supports `Docs/PRODUCTION_SECURITY_HARDENING_PLAN.md`. It documents the production authorization model for the current API surface. All state-changing API requests are protected globally by CSRF verification except explicitly exempt auth bootstrap/webhook/unsubscribe endpoints.

## Global controls

- Authentication: `requireAuth(req)` resolves `mca_session` HTTP-only cookie.
- CSRF: `src/server/api.ts` calls `verifyCsrf()` before all `POST`, `PATCH`, and `DELETE` routes except `/api/auth/login`, `/api/auth/register`, `/api/webhooks/resend`, and `/api/communications/unsubscribe`.
- Origin check: `verifyRequestOrigin()` restricts mutating browser requests when `APP_ALLOWED_ORIGINS` / `BETTER_AUTH_URL` are configured.
- Rate limiting: auth, AI, document upload, and all mutating routes are rate-limited; durable Supabase-backed storage is default unless `RATE_LIMIT_STORE=memory`.
- Audit: sensitive auth/admin/document/report/AI/communications events write to `audit_logs` with metadata redaction.
- RLS: all public application tables have RLS enabled; app access is through server-side service-role routes.

## Route authorization summary

| Route | Methods | Roles | Ownership / security rule |
|---|---:|---|---|
| `/api/auth/register` | POST | public | Self-register only merchant/lender; rate-limited; audit failure/success. |
| `/api/auth/login` | POST | public | Rate-limited by email+IP; durable failed-login tracking/temporary lockout; sets session + CSRF token. |
| `/api/auth/logout` | POST | authenticated | CSRF required; deletes session; clears session/CSRF cookies; audit logged. |
| `/api/auth/me` | GET | authenticated | Restores/generates CSRF token for active session. |
| `/api/merchants` | GET | admin/sales_rep/merchant/lender | Admin all; rep assigned; merchant own; lender matched/submitted only with competing offers sanitized. |
| `/api/merchants` | POST | admin/sales_rep/merchant | Lenders cannot create deals; merchant self-submit is sanitized to default status/no offers/no matches/no rep. |
| `/api/merchants/:id` | GET | admin/sales_rep/merchant/lender | Uses exact ownership; lender can access through lender match or merchant-file submission; lender offers sanitized. |
| `/api/merchants/:id` | PATCH | admin/sales_rep | Sales rep only assigned merchant; only admin can rep-assign/admin-only relationship fields. |
| `/api/merchants/:id` | DELETE | admin | Admin only. |
| `/api/lenders` | GET | admin/sales_rep/lender | Merchant forbidden; lender sees own profile only. |
| `/api/lenders` | POST | admin/lender | Admin or lender self-profile only. |
| `/api/lenders/:id` | GET | admin/sales_rep/lender | Merchant forbidden; lender only own profile. |
| `/api/lenders/:id` | PATCH/DELETE | admin | Admin only. |
| `/api/offers` | GET | admin/sales_rep/merchant/lender | Lender sees only own offers; sales rep assigned merchant offers; merchant own offers. |
| `/api/offers` | POST | admin/lender | Lender must own lender profile and be matched/submitted to merchant. |
| `/api/offers/:id` | PATCH | merchant | Merchant can accept/reject own offer only. |
| `/api/leads` | GET/POST | admin/sales_rep | Sales rep scoped to assigned/created leads. |
| `/api/leads/:id` | GET/PATCH | admin/sales_rep | Sales rep assigned/created only; only admin can assign leads. |
| `/api/leads/:id` | DELETE | admin | Admin only. |
| `/api/leads/:id/notes` | POST | admin/sales_rep | Must have access to lead. |
| `/api/leads/:id/convert` | POST | admin/sales_rep | Sales rep assigned/created only. |
| `/api/documents` | GET | authenticated | Must pass `canAccessMerchant`; signed URL generation audited; URLs expire in 900 seconds. |
| `/api/documents/upload` | POST | authenticated | Merchant/reps/admin/lender only where authorized; MIME/ext/size enforced; server-generated storage path; audited. |
| `/api/documents/:id` | DELETE | admin | Admin only; storage object and DB row removed; audited. |
| `/api/stipulations` | GET | authenticated | Must access merchant; lender sees only own lender stipulations. |
| `/api/stipulations` | POST | admin/lender | Lender must be matched/submitted to merchant and can only use own lender ID. |
| `/api/matching` | GET | admin/sales_rep/lender | Merchant forbidden; lender only own match if authorized. |
| `/api/matching/run` | POST | admin/sales_rep | Must be able to update merchant; sales rep assigned only. |
| `/api/matching/manual` | POST | admin/sales_rep | Must be able to update merchant; sales rep assigned only. |
| `/api/matching/manual` | DELETE | admin | Admin only. |
| `/api/matching/notify` | POST | admin/sales_rep | Sales rep assigned merchant only; creates merchant-file submissions. |
| `/api/users/sales-reps` | GET | admin/sales_rep | Internal users only. |
| `/api/activities` | GET/POST | admin/sales_rep | Exact entity access checked before read/write. |
| `/api/tasks` | GET/POST | admin/sales_rep | Reps scoped to assigned/created tasks; task creation requires entity access. |
| `/api/tasks/:id` | PATCH | admin/sales_rep | Reps manage assigned/created tasks. |
| `/api/tasks/:id` | DELETE | admin | Admin only. |
| `/api/fundings*`, `/api/broker-revenue*`, `/api/sales-rep-commissions*` | mixed | admin/sales_rep where applicable | Finance routes are role-scoped; broker revenue admin-only; sales reps scoped to own/assigned records. |
| `/api/renewals*`, `/api/payoff-requests*` | mixed | admin/sales_rep/merchant/lender where applicable | Route-level merchant/funding/lender ownership checks. |
| `/api/reports/*` | GET | admin/sales_rep | Reports are admin/scoped sales rep only. |
| `/api/lender-dashboard/analytics` | GET | lender | Current lender profile only. |
| `/api/audit-logs` | GET | admin | Admin only. |
| `/api/audit/report-export` | POST | admin/sales_rep | CSRF protected; audit logged. |
| `/api/ai/chat` | POST | authenticated | CSRF + rate limited; context redacted/minimized; audited. |
| `/api/communications/*` | mixed | admin/sales_rep | Broker-only; entity ownership/suppression checks; SMS disabled; unsubscribe public token endpoint only. |
| `/api/webhooks/resend` | POST | provider webhook | CSRF exempt; verifies `RESEND_WEBHOOK_SECRET` if configured; does not trust payload instructions. |

## Sensitive table classification

| Sensitivity | Tables |
|---|---|
| Credentials/session/security | `users`, `account`, `session`, `verification`, `security_rate_limits`, `security_login_failures` |
| Personal/owner PII | `owners`, owner payload inside `merchants.payload`, `communication_preferences` |
| Merchant financial/application data | `merchants`, `documents`, `fundings`, `offers`, `stipulations`, `payoff_requests`, `renewals` |
| Internal broker business data | `broker_revenue`, `sales_rep_commissions`, `merchant_file_submissions`, `lender_matches`, `tasks`, `activities`, `saved_views`, `communications`, `campaigns`, `campaign_recipients` |
| Audit/security logs | `audit_logs`, `security_rate_limits`, `security_login_failures` |

## Document risk classification

- High: bank statements, contracts, IDs/owner documents, signatures, payoff letters.
- Medium: stipulation uploads, CSV/XLS/XLSX operational documents.
- Low: generic non-sensitive supporting documents.

All documents are stored in the private `documents` Supabase Storage bucket and only exposed through short-lived signed URLs after authorization checks.
