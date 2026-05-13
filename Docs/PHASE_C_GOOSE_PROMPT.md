# Phase C Goose Prompt — Merchant-File Submissions

## Mission

Build Phase C of MCA King: **Merchant-File Submissions**.

This phase tracks the broker shop's outbound submission of merchant files/packages to lenders/funders and each lender/funder's response outcome.

## Locked Business Model

MCA King is a broker-shop CRM.

| Role | Meaning |
|---|---|
| Admin | Broker shop owner/operator. Controls all shop data and workflow. |
| Sales Rep | Internal broker-shop rep. Works assigned leads/merchant files. |
| Merchant | Funding customer/applicant. Submits applications and reviews offers. |
| Lender/Funder | External reviewer/funder. Reviews broker-submitted or broker-matched merchant files, requests stipulations, declines, and sends offers. |

Critical rules:

- Lenders/funders do **not** submit merchant deals into MCA King.
- Merchant-file submission means **broker shop → lender/funder**.
- Do not call this feature "lender submissions" in new code/UI/docs.
- Do not create referral partner, outside broker, ISO payout, or lender-side manager payout concepts.
- Lender-side account/relationship managers are lender contacts only.

## Privacy / Security Rules

- Admin can see all merchant-file submissions.
- Assigned sales reps can see merchant-file submissions for assigned merchant files.
- Merchants do not need direct access to merchant-file submission records.
- Lenders/funders can see only their own submission row for merchant files submitted/matched to them.
- Lenders/funders must not see other lenders that received the same file.
- Lenders/funders must not see other lender statuses, decline reasons, notes, response times, or package history.
- UI hiding is not security. The API must enforce these rules server-side.

## Database

Create table:

```txt
merchant_file_submissions
```

Columns:

```sql
id                  uuid primary key default gen_random_uuid()
merchant_id          uuid references merchants(id) on delete cascade not null
lender_id            uuid references lenders(id) not null
match_id             uuid references lender_matches(id) on delete set null
submitted_by         uuid references users(id) on delete set null
submitted_at         timestamptz default now() not null
status               text default 'submitted' not null
-- submitted | viewed | no_response | declined | offer_received | stips_requested | withdrawn
response_at          timestamptz
decline_reason       text
package_version      int default 1 not null
notes                text
created_at           timestamptz default now() not null
updated_at           timestamptz default now() not null
```

Indexes:

```sql
unique (merchant_id, lender_id, package_version)
(merchant_id, submitted_at desc)
(lender_id, status, submitted_at desc)
(status, response_at desc)
```

Security:

- Enable RLS.
- Add a deny-all public policy because the app uses server-side service-role routes for access control.
- Run Supabase security/performance advisors after migration.

## API Routes

Create:

```txt
GET    /api/merchant-file-submissions?merchant_id=
POST   /api/merchant-file-submissions
PATCH  /api/merchant-file-submissions/:id
```

Role rules:

```txt
Admin:
  GET all / filtered
  POST create/upsert submission records
  PATCH status, notes, decline_reason

Sales Rep:
  GET only assigned merchant files
  POST only assigned merchant files
  PATCH only assigned merchant files

Merchant:
  Forbidden

Lender/Funder:
  GET only own submission rows
  POST forbidden
  PATCH forbidden unless a future explicit lender-safe action is added
```

Allowed statuses:

```txt
submitted
viewed
no_response
declined
offer_received
stips_requested
withdrawn
```

## Integrations

### `/api/matching/notify`

When broker shop notifies/submits to matched lenders:

- Update `lender_matches.notified_at`.
- Create or update one `merchant_file_submissions` row per matched lender.
- Set status to `submitted`.
- Set `submitted_by` to current admin/sales rep.
- Set `submitted_at` to notification timestamp.
- Preserve history by package_version uniqueness.
- Write merchant activity.

### `/api/offers` POST

When lender/funder or admin creates an offer:

- Update that lender's `merchant_file_submissions` row to `offer_received`.
- Set `response_at`.
- Do not update other lenders' rows.

### `/api/stipulations` POST

When lender/funder or admin requests stipulations:

- Update that lender's `merchant_file_submissions` row to `stips_requested`.
- Set `response_at`.
- Do not update other lenders' rows.

## Frontend

Create component:

```txt
components/dashboards/shared/MerchantFileSubmissionsPanel.tsx
```

Add it to merchant detail for admin/sales rep views.

Panel should show:

- Lender/funder name
- Status
- Submitted date
- Response date
- Decline reason
- Package version
- Notes

Admin/sales rep controls:

- Mark no response
- Mark declined
- Mark withdrawn
- Edit notes / decline reason as practical for this phase

Lender-facing views must not reveal competing lender submissions.

## Acceptance Criteria

- Broker admin can see every lender/funder this merchant file was submitted to.
- Assigned sales rep can see submissions for assigned merchant files only.
- Lender/funder can only see its own submission row if API is called directly.
- Merchant users are forbidden from submission routes.
- `/api/matching/notify` creates/updates merchant-file submission records.
- Offer creation updates only that lender's submission to `offer_received`.
- Stipulation request updates only that lender's submission to `stips_requested`.
- Broker can mark a submission `declined`, `no_response`, or `withdrawn`.
- Activity timeline records submission creation/status changes.
- TypeScript check passes.
- Production build passes.

## After Completion

Update docs:

- Mark Phase C complete in `Docs/MCA_BROKER_CRM_EXPANSION_PLAN.md`.
- Update README/project overview if needed.
- Report changed files and verification commands.
