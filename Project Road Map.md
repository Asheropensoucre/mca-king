# Project Road Map and Audit

## Executive Summary

The project has been consolidated into a single main application folder: `mca-application-form/`.

The former standalone `mind-map-kanban/` mockup has been removed. Its Kamba/Kanban board concept has been merged into the main MCA app as the official internal pipeline for Admin and Sales Rep users.

The biggest current architectural change is that the old 6-status application system has been replaced by the 12-step Kamba Pipeline. The pipeline is now the source of truth for `merchant.status`.

---

## 1. Current Working State

### Completed / Good

* **Single Main App:** The active app is now `mca-application-form/`. The old standalone Kanban mockup folder has been deleted.
* **12-Step Kamba Status System:** `ApplicationStatus` in `types.ts` now uses the 12-step funding flow:
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
* **Shared Status Configuration:** `components/dashboards/shared/applicationStatus.ts` centralizes status labels, themes, default status, and old-status migration.
* **Kamba Pipeline Integration:** `components/dashboards/shared/KanbanPipelineView.tsx` provides a real-data drag-and-drop pipeline using merchant submissions.
* **Admin Pipeline Access:** Admin users have a left-side dashboard shell with:
  * Merchant Directory
  * Lender Directory
  * Kamba Pipeline
* **Sales Rep Pipeline Access:** Sales reps have a left-side dashboard shell with:
  * My Deals
  * Kamba Pipeline
* **Restricted Pipeline Visibility:** The Kamba Pipeline is only available in Admin and Sales Rep views. Merchant and Lender dashboards do not show it.
* **Real Data Cards:** Kamba cards display merchant names, requested amount, phone, email, state, matched lender count, offer count, accepted offer information, and contract-signed indicator.
* **Drag-and-Drop Status Updates:** Moving a card updates the actual `merchant.status` value.
* **Offer Flow Update:** Lender-created offers now move merchants to `one or more lender's sent offer`.
* **Accepted Offer Update:** Merchant-accepted offers now move merchants to `Merchant accepts offer`, not `FUNDED`.
* **Rejected Offer Update:** If all offers are rejected, the merchant moves to `Merchant Declines Offer's`.
* **Legacy LocalStorage Migration:** Old records with the previous 6 statuses are migrated automatically when the dashboard loads.
* **Role-Based Component Structure:** Admin, Sales Rep, Lender, and Merchant dashboards remain separated into their own files.
* **Prototype Data Persistence:** Merchant and lender records are still saved to browser `localStorage` for development/demo use.

---

## 2. Important Current Files

### Core App

```txt
App.tsx
types.ts
vite.config.ts
index.html
```

### Dashboard System

```txt
components/dashboards/DashboardController.tsx
components/dashboards/AdminDashboard.tsx
components/dashboards/SalesRepDashboard.tsx
components/dashboards/LenderDashboard.tsx
components/dashboards/MerchantDashboard.tsx
```

### Kamba Pipeline / Status System

```txt
components/dashboards/shared/applicationStatus.ts
components/dashboards/shared/KanbanPipelineView.tsx
components/dashboards/shared/DashboardShell.tsx
```

---

## 3. Known Issues / Cleanup Needed

### Styling / Build Cleanup

* `index.html` currently links to `/index.css`, but the app is primarily styled through Tailwind CDN in `index.html`.
* This causes a Vite build warning because `index.css` does not exist at build time.
* Recommended cleanup:
  * Either create a real `index.css`, or
  * Remove the unused stylesheet link from `index.html`.

### Legacy Files

The main app still contains some older components that appear unused, such as:

```txt
components/AdminView.tsx
components/LenderView.tsx
```

These should be reviewed and removed only after confirming they are not imported anywhere in the active app.

### Package / Build Process

The app should be run with Vite, not by double-clicking `index.html`.

```bash
cd mca-application-form
npm install
npm run dev
```

---

## 4. What Still Needs to be Added for Production

The current app is still a front-end prototype. To become production-ready, the following infrastructure is needed.

### Backend Database

Replace browser `localStorage` with a secure database such as:

* PostgreSQL
* Supabase
* Firebase/Firestore
* Custom Node/Express API with database

Required stored entities:

* Users
* Roles
* Merchants
* Owners
* Lenders
* Offers
* Documents
* Status history
* Sales rep assignments

### Real Authentication

Add real login/authentication for:

* Admins
* Sales reps
* Merchants
* Lenders

Current sales rep, merchant, and lender login flows are still profile-selector mockups.

### Backend Role-Based Access Control

RBAC must be enforced server-side:

* Admin sees all records
* Sales rep sees assigned deals
* Merchant sees only their own application
* Lender sees only assigned merchants

### Secure Document Storage

Uploaded documents should move to secure storage such as:

* AWS S3
* Supabase Storage
* Firebase Storage

The app also needs document permissions, download URLs, and audit logs.

### Server-Side Matching Engine

Current lender matching is client-side and should move to the backend.

Backend matching should consider:

* Revenue
* Credit score
* Industry
* State restrictions
* NSF count
* Requested amount
* Time in business
* Lender-specific rules

### Email and Notification Automation

Needed features:

* Send merchant packages to lenders
* Email matched lenders
* Notify merchants when offers arrive
* Notify sales reps on status movement
* Send contract/stipulation notifications

Potential providers:

* SendGrid
* Resend
* AWS SES

### PDF Package Generation

The current print/PDF flow is browser-based. Production should generate lender-ready packages server-side with:

* Application PDF
* Uploaded bank statements
* Owner information
* Offer/status history
* Dynamic email templates

### Formal State Machine / Status History

The 12-step Kamba status system is now in place, but production should also record:

* Who moved the deal
* Previous status
* New status
* Timestamp
* Notes/reason

This will become the audit trail for funding operations.

---

## 5. Recommended Next Steps

### Immediate Cleanup

1. Fix the `index.css` build warning.
2. Review and remove unused legacy files like `AdminView.tsx` if confirmed unused.
3. Smoke test all views:
   * Main landing page
   * Merchant application
   * Admin dashboard
   * Admin Kamba Pipeline
   * Sales Rep Kamba Pipeline
   * Lender offer creation
   * Merchant offer acceptance/rejection

### Next Development Phase

1. Choose backend stack.
2. Design database schema around the 12-step pipeline.
3. Add authentication and real user roles.
4. Replace `localStorage` with API calls.
5. Move lender matching to the backend.
6. Add secure document storage.
7. Add email automation.
8. Add status history/audit log.

---

## 6. Current Development Command

Use Vite:

```bash
cd mca-application-form
npm install
npm run dev
```

Do not open `index.html` directly from the file system.
