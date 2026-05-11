Project Overview: Automated Lending & Funding Portal
Executive Summary
This project outlines the architecture for a dual-sided Merchant Cash Advance (MCA) and lending platform. The system is designed to seamlessly transition a merchant from initial onboarding through automated/manual lender matching, document distribution, and final funding. It features dynamic dashboards tailored to the user's current status in the funding pipeline.

Phase 1: Onboarding & Intake
The initial funnel where merchants enter the system and provide baseline qualification data.

Services & Process: The public-facing landing area where merchants learn about the funding options and start the funnel.

Portal Sign-Up: Account creation and initial authentication.

Form Completion: The merchant fills out the core application. This serves as the foundational data payload for the matching engine.

Phase 2: Processing, Matching & Distribution Engine
The backend logic layer that evaluates the merchant, finds the right lenders, and packages the data.

Customer Profile Generation: The system compiles the intake form and any uploaded documents (e.g., 3 months of bank statements) into a unified, standardized merchant profile.

Analyze Customer Profile: The system evaluates the merchant's metrics (industry, revenue, time in business, current advance positions, etc.).

Identify & Match Suitable Lenders (Dual-System):

Automated Matching Engine: Algorithms pair the merchant with lenders based on strict criteria (e.g., if a lender explicitly targets "trucking industry" and "3rd to 6th position advances," and the merchant fits, it's an auto-match).

Manual/Sales Rep Routing: Upon sign-up, merchants are assigned to internal Sales Reps. These reps have the authority to manually review the profile and explicitly match the merchant to specific lenders based on relationship nuances or complex profiles.

Send Profile to Lender Network (Distribution): * The system generates a standardized PDF/data package of the merchant.

Using an email templating system with dynamic tags, the platform automatically emails the package (along with necessary attachments like bank statements) directly to the matched lenders' contact lists.

Phase 3: Dynamic Portal Dashboards
The logged-in user experience. The dashboard UI is state-dependent and dynamic, meaning the interface changes based on the user type (Merchant vs. Lender) and the current status of the application.

Merchant Dashboard
Offer Management: * View incoming lender offers.

Select the preferred/winning offer.

View final contract details.

Dynamic Actions (Status-Triggered):

Upload Remaining Docs (Stipulations): This module only appears or alerts the merchant when a specific lender requests additional documentation to close the deal.

Request Payoff Letters: A dynamic feature available only to merchants who have an active/current cash advance with the platform and wish to pay it off early or consolidate it with a new advance.

General Utilities: Contact support, request help, and receive email notifications.

Lender / Admin Dashboard
While not detailed in the original map, your logic requires a distinct view for the other side of the marketplace.

View matched merchant profiles.

Request specific missing documents (which triggers the "Upload Remaining Docs" module on the merchant's side).

Submit offers to the merchant.

Key Technical Requirements to Build This:
Rules Engine: To handle the complex "If X industry and Y position, then match with Lender Z" logic.

Role-Based Access Control (RBAC): Distinct permissions and UI views for Merchants, Lenders, and Internal Sales Reps.

Document Parsing & Email Automation: A system to compile PDFs, securely attach sensitive bank statements, inject dynamic text tags, and fire out emails via an API (like SendGrid or AWS SES).

State Machine: The database needs to track the exact status of the application (e.g., Reviewing Offers, Stips Pending, Contract Generated) to tell the front-end dashboard which buttons and modules to show the merchant.