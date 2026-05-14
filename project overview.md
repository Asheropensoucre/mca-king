# Project Overview: MCA King Broker CRM

## Executive Summary

MCA King is a broker-shop Merchant Cash Advance (MCA) CRM. The broker shop sources merchant files, manages those files through internal admins and sales reps, submits qualified merchant packages to lenders/funders, and tracks the file through offers, stipulations, contracts, and funding.

This is **not** a lender-originated deal marketplace. Lenders/funders are users who sign in to review merchant files submitted or matched to them by the broker shop. They can approve, decline, request stipulations, and send offers; they do not submit merchant deals into the CRM.

## Role Model

| Role | Business meaning |
|---|---|
| Admin | Broker shop owner or operator. Controls the shop, users, lenders, assignments, matching, pipeline, broker revenue, internal rep commissions, and admin-only account settings such as user emails, password resets, disabled/closed accounts, and roles. |
| Sales Rep | Internal broker-shop rep who works leads and assigned merchant files. Can manage only safe self-service settings such as own password, not email or role. |
| Merchant | Funding customer/applicant who submits an application, uploads documents, reviews offers, and responds to stipulations. Can change only own password in user settings; email/account status changes are admin-controlled. |
| Lender/Funder | Funding partner who reviews broker-submitted merchant files, approves/declines, requests documents, and sends offers. Can change only own password in user settings; email/account status changes are admin-controlled. |
| Lender-side account/relationship manager | Contact at the lender/funder company who manages the broker relationship/files from the lender side. Not a commission recipient and not a deal submitter in MCA King. |

## Phase 1: Onboarding & Intake

The broker shop brings merchants into the system and collects baseline qualification data.

- Merchant account creation and authentication
- Merchant application form completion
- Owner details and authorization
- Required document upload, especially 3 months of bank statements
- Initial status: `application & 3 months bank statements in`

## Phase 2: Processing, Matching & Broker-to-Lender Distribution

The broker shop evaluates the merchant file, identifies suitable lenders/funders, and submits the file to those lenders.

### Customer Profile Generation

The system compiles the merchant application and uploaded documents into a standardized merchant profile.

### Analyze Customer Profile

The broker shop and matching engine evaluate:

- Industry
- Revenue
- Time in business
- Current advance positions
- Credit score
- NSF count
- Requested amount
- State restrictions

### Identify Suitable Lenders

Matching is broker-controlled:

- **Automated matching:** server-side rules pair merchant files with lenders based on criteria.
- **Manual broker routing:** admins and sales reps can manually add lender matches based on relationships, lender appetite, or file nuance.

### Submit Merchant File to Lender Network

The broker shop submits a merchant package to selected lenders/funders. Lender users then review the broker-submitted file and respond with an approval, decline, stipulation request, or offer.

## Phase 3: Dynamic Portal Dashboards

The logged-in dashboard changes based on user role and application state.

### Merchant Dashboard

Merchants can:

- View current application status
- Upload documents
- Fulfill stipulations
- View offers
- Accept or reject offers
- View contract/funding state
- Reapply after the configured grace period when eligible

### Broker/Admin Dashboard

Broker admins can:

- View all leads, merchants, lenders/funders, documents, offers, matches, and pipeline stages
- Create and manage sales rep accounts from Admin Settings
- Assign reps to merchant files
- Match and submit files to lenders/funders
- Move merchant files through the 12-step Kamba pipeline
- Review status history and operational workflow

### Sales Rep Dashboard

Sales reps can:

- Manage assigned leads
- Convert leads into merchant applications
- Work assigned merchant files
- Help collect documents
- Match files to lenders when permitted
- Track assigned files in the Kamba pipeline
- Change only their own password in User Settings
- View scoped relationship analytics on their own dashboard, including files sent to them, funded deals together, total funded volume together, average funded amount, this-month funded volume, and pending payoff requests

### Lender/Funder Dashboard

Lenders/funders can:

- View merchant files submitted/matched to them by the broker shop
- Review merchant details and documents they are authorized to access
- Approve/decline files through offers or response statuses
- Request stipulations/additional documents
- Send offers to the broker/merchant workflow
- See only their own offers/responses; competing lender/funder offers on the same merchant file are hidden server-side
- Change only their own password in User Settings
- View scoped relationship analytics on their own dashboard, including files sent to them, funded deals together, total funded volume together, average funded amount, this-month funded volume, and pending payoff requests

## Phase 6: Renewals

The broker shop can track renewal opportunities after a merchant is funded. Renewal records are broker-controlled follow-up queues for admins and assigned sales reps. Funding history is dynamic: one merchant can have a first funding, later renewal fundings, and additional/split funding positions from one or more lenders/funders. MCA King tracks early payoff letter requests sent to current lenders/funders and links the lender/funder-provided payoff document when received. Merchants, admins, and assigned sales reps can request a payoff letter after funding; only the funding lender/funder for that deal or an admin can upload/link the official payoff letter. MCA King does not generate official payoff letters on behalf of lenders/funders.

## Key Technical Requirements

- Rules engine for broker-controlled lender matching
- Role-based access control for broker admins, sales reps, merchants, and lenders/funders
- Secure document storage and signed URL access
- Broker-to-lender package generation and notification workflow
- State machine for the 12-step Kamba pipeline
- Activity history and tasks are implemented. Funding records, broker revenue, internal sales rep commissions, merchant-file submission outcomes, search/filter/saved-view work queues, account settings/admin user management, renewals tracking with payoff request tracking, and reporting/analytics are implemented. Compliance controls remain a future expansion area.
