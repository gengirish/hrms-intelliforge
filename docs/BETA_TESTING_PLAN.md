# IntelliForge HRMS — Beta Testing Plan

**Product:** IntelliForge HRMS Intern Portal
**Version:** 0.1.0 (Beta)
**Production URL:** https://hrms.intelliforge.tech
**Date:** 30 March 2026
**Prepared by:** IntelliForge AI Engineering Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Objectives](#2-objectives)
3. [Scope](#3-scope)
4. [Beta Tester Profiles](#4-beta-tester-profiles)
5. [Test Environment](#5-test-environment)
6. [Entry & Exit Criteria](#6-entry--exit-criteria)
7. [Test Scenarios](#7-test-scenarios)
   - 7.1 [Authentication & IAM](#71-authentication--iam)
   - 7.2 [Page Load & Navigation](#72-page-load--navigation)
   - 7.3 [Intern Onboarding](#73-intern-onboarding)
   - 7.4 [Admin Dashboard](#74-admin-dashboard)
   - 7.5 [Offer Letter Flow](#75-offer-letter-flow)
   - 7.6 [Attendance Management](#76-attendance-management)
   - 7.7 [Task Logging](#77-task-logging)
   - 7.8 [Email Automation (AgentMail)](#78-email-automation-agentmail)
   - 7.9 [PDF Generation](#79-pdf-generation)
   - 7.10 [Cron Jobs](#710-cron-jobs)
   - 7.11 [PWA & Mobile Experience](#711-pwa--mobile-experience)
   - 7.12 [Security & Access Control](#712-security--access-control)
   - 7.13 [Edge Cases & Error Handling](#713-edge-cases--error-handling)
8. [API Endpoint Test Matrix](#8-api-endpoint-test-matrix)
9. [Bug Reporting Process](#9-bug-reporting-process)
10. [Beta Timeline](#10-beta-timeline)
11. [Risk Assessment](#11-risk-assessment)
12. [Success Metrics & Exit Criteria](#12-success-metrics--exit-criteria)
13. [Feedback Collection](#13-feedback-collection)
14. [Appendix](#appendix)

---

## 1. Introduction

The IntelliForge HRMS Intern Portal is a web-based Human Resource Management System built for the IntelliForge AI internship program. It manages the full intern lifecycle — from onboarding and offer letter generation to daily attendance tracking, weekly task logging, and program completion certification.

This Beta Testing Plan defines the structured approach for validating the portal before general availability. Beta testing will involve real users (admins and interns) interacting with the live system to uncover functional bugs, usability issues, performance bottlenecks, and workflow gaps that internal testing may have missed.

### Key Application Capabilities

| Module | Description |
|--------|-------------|
| Custom IAM | Email+password sign-in, magic link (passwordless), password reset — JWT HttpOnly cookies, role-based access (admin/intern) |
| Self-Service Onboarding | Intern registration with document uploads (Aadhaar, PAN, photo) |
| Admin Dashboard | Intern lifecycle management, stipend configuration, status transitions |
| Offer Letter System | PDF offer generation, email delivery, web + email acceptance |
| Attendance Tracking | Daily punch in/out with WFH/Office mode, weekly history |
| Task Management | Weekly task logging with hours, status tracking, CRUD operations |
| Email Automation | AgentMail-powered welcome, offer, reminder, nudge, and completion emails |
| PDF Generation | Offer letters and completion certificates via @react-pdf/renderer |
| Cron Automation | Weekly task reminders (Monday 9 AM IST) and daily attendance nudges (10:30 AM IST) |
| PWA Support | Installable app with offline-capable service worker |

---

## 2. Objectives

| # | Objective | Measurement |
|---|-----------|-------------|
| O1 | Validate all user workflows end-to-end in production | 100% of critical paths tested without blocking defects |
| O2 | Identify UI/UX issues on real devices and browsers | Feedback collected from 5+ distinct device/browser combos |
| O3 | Verify email delivery and content accuracy | All 6 email types received with correct content and attachments |
| O4 | Confirm data integrity across the intern lifecycle | Status transitions: PENDING → OFFERED → ACTIVE → COMPLETED |
| O5 | Validate Indian locale conventions | IST timezone, DD/MM/YYYY dates, ₹ currency with en-IN formatting |
| O6 | Assess mobile responsiveness and PWA installation | Portal installable and usable on Android/iOS mobile browsers |
| O7 | Uncover security gaps in admin access control | No unauthorized access to admin endpoints or data |
| O8 | Measure system reliability under concurrent usage | No data corruption with 10+ simultaneous users |

---

## 3. Scope

### 3.1 In Scope

| Area | Details |
|------|---------|
| Functional Testing | All 8 pages, 20 API endpoints, 6 email flows, 2 PDF templates, 2 cron jobs |
| UI/UX Testing | Responsive layout, mobile navigation, form validation, toast notifications, loading states |
| Integration Testing | AgentMail email delivery + webhook, Vercel Blob uploads, Neon PostgreSQL, Vercel Cron |
| Browser Compatibility | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+, Samsung Internet |
| Device Testing | Desktop (1920×1080, 1366×768), Tablet (iPad), Mobile (iPhone 14+, Android flagship) |
| PWA Testing | Install prompt, standalone mode, service worker registration, manifest validation |
| Security Testing | Admin email allowlist enforcement, input validation, file upload restrictions |
| Data Validation | Stipend paise/INR conversion, ISO week calculation, IST date boundaries |
| Accessibility | Keyboard navigation, screen reader compatibility, color contrast |

### 3.2 Out of Scope

| Area | Reason |
|------|--------|
| Load/Stress Testing | Separate performance testing phase planned |
| Penetration Testing | Will use dedicated security audit tooling post-beta |
| Database Migration Testing | Schema is stable for beta; migration tests deferred |
| CI/CD Pipeline Testing | Infrastructure concern, not end-user facing |
| Third-party Service Outage Simulation | AgentMail/Vercel Blob failover tested separately |

---

## 4. Beta Tester Profiles

### 4.1 Tester Groups

| Group | Role | Count | Focus Areas |
|-------|------|-------|-------------|
| **Group A — Admins** | HR managers, program coordinators | 2–3 | Dashboard, offer management, stipend config, completion flow |
| **Group B — Interns** | Actual or simulated interns | 5–8 | Onboarding, attendance, tasks, offer acceptance |
| **Group C — QA Engineers** | Internal QA team | 2–3 | Edge cases, API validation, security, cross-browser |
| **Group D — Mobile Testers** | Users with diverse mobile devices | 3–5 | PWA install, mobile layout, touch interactions |

### 4.2 Tester Prerequisites

- Active email address for receiving AgentMail communications
- At least one device with a modern browser (Chrome 120+ recommended)
- Access to the production URL: https://hrms.intelliforge.tech
- Familiarity with the beta feedback form (provided at onboarding)

### 4.3 Test Data Convention

- Beta test intern emails: `beta.{testerName}@intelliforge.tech`
- Admin email pre-configured in the `admins` table: `admin@intelliforge.tech`
- Stipend values for testing: 10000 paise (₹100), 50000 paise (₹500), 0 paise (edge case)

---

## 5. Test Environment

| Component | Configuration |
|-----------|---------------|
| **Hosting** | Vercel (production deployment) |
| **Database** | Neon Serverless PostgreSQL |
| **File Storage** | Vercel Blob |
| **Email Service** | AgentMail (TypeScript SDK, HR inbox: `hr@intelliforge.tech`) |
| **Cron Jobs** | Vercel Cron (task-reminder: Mon 09:00 IST, attendance-nudge: weekdays 10:30 IST) |
| **Domain** | https://hrms.intelliforge.tech |
| **Monitoring** | Vercel Analytics + deployment logs |

### 5.1 Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob file upload token |
| `AGENTMAIL_API_KEY` | AgentMail API key for email automation |
| `CRON_SECRET` | Bearer token for cron endpoint authentication |

### 5.2 Pre-Beta Setup Checklist

- [ ] Admin email (`admin@intelliforge.tech`) exists in the `admins` table
- [ ] AgentMail webhook registered at `https://hrms.intelliforge.tech/api/webhooks/agentmail`
- [ ] AgentMail HR inbox (`hr@intelliforge.tech`) created or auto-creates on first use
- [ ] Vercel Cron jobs active and CRON_SECRET configured in Vercel environment
- [ ] Vercel Blob token valid and storage accessible
- [ ] Neon database accessible and schema up to date (`npx prisma db push`)
- [ ] PWA icons generated and available in `/public/`
- [ ] Playwright E2E tests pass against production (`npx playwright test`)
- [ ] Node E2E integration suite passes (`node e2e-test.js`)

---

## 6. Entry & Exit Criteria

### 6.1 Entry Criteria (Beta can begin when)

| # | Criterion | Verification |
|---|-----------|-------------|
| EC1 | All 6 pages render without errors | E2E page load tests pass |
| EC2 | Core APIs return expected status codes | E2E API tests pass (≥90% pass rate) |
| EC3 | At least one full lifecycle completed internally | PENDING → OFFERED → ACTIVE → COMPLETED flow verified |
| EC4 | Email delivery confirmed for all 6 types | Manual verification of AgentMail sends |
| EC5 | PDF generation produces valid documents | Offer letter and certificate PDFs open correctly |
| EC6 | Admin access control enforced | Non-admin email returns 403 on dashboard API |
| EC7 | Test data conventions documented | Beta testers briefed on email naming and procedures |

### 6.2 Exit Criteria (Beta is complete when)

| # | Criterion | Target |
|---|-----------|--------|
| XC1 | All critical (P0) bugs resolved | 0 open P0 bugs |
| XC2 | High-priority (P1) bugs resolved or mitigated | ≤ 2 open P1 bugs with documented workarounds |
| XC3 | All test scenarios executed | 100% scenario coverage |
| XC4 | Beta tester satisfaction score | ≥ 4.0 / 5.0 average |
| XC5 | No data integrity issues | 0 orphaned records, 0 incorrect status transitions |
| XC6 | Email delivery success rate | ≥ 95% delivery rate |
| XC7 | PWA installable on target platforms | Confirmed on Android Chrome + iOS Safari |

---

## 7. Test Scenarios

### 7.1 Authentication & IAM

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| AU-01 | Sign-up with valid credentials | Navigate to `/sign-up`, fill name, email, password (8+ chars), confirm password, select account type, submit | Account created, verification email sent, user auto-logged in with profile visible in navbar | P0 |
| AU-02 | Sign-up — password mismatch | Enter mismatched passwords, submit | Client-side error "Passwords do not match" | P0 |
| AU-03 | Sign-up — short password | Enter 7-char password | Client-side error "Password must be at least 8 characters" | P1 |
| AU-04 | Sign-up — duplicate email | Register with an already-used email | 409 "An account with this email already exists" | P0 |
| AU-05 | Sign-in with email + password | Navigate to `/sign-in`, enter valid credentials, submit | "Signed in successfully" toast, redirected to home, profile avatar visible in navbar | P0 |
| AU-06 | Sign-in — wrong password | Enter correct email but wrong password | 401 "Invalid email or password" | P0 |
| AU-07 | Sign-in — non-existent email | Enter unregistered email | 401 "Invalid email or password" (no enumeration) | P0 |
| AU-08 | Sign-in — rate limiting | Attempt 6+ logins within 60 seconds | 429 "Too many login attempts. Try again in a minute." | P1 |
| AU-09 | Magic link sign-in | Enter email on sign-in page, click "Send Magic Link" | Success toast, email received with sign-in link, clicking link logs user in | P0 |
| AU-10 | Magic link — expired | Click magic link after 15 minutes | Redirect to `/sign-in?error=expired_link` with error banner | P1 |
| AU-11 | Email verification | After sign-up, click verification link in email | Redirect to `/sign-in?verified=true` with success banner, emailVerified set to true | P0 |
| AU-12 | Email verification — broken link | Verification link with `<br>` or HTML tags in URL | URL sanitized, link works correctly (APP_URL trimmed and stripped) | P0 |
| AU-13 | Profile display after login | Sign in, navigate to any page | Navbar shows user initials avatar (not "Sign In" link) | P0 |
| AU-14 | User dropdown menu | Click profile avatar in navbar | Dropdown shows name, email, account type badge, and "Sign out" button | P1 |
| AU-15 | Sign out | Click "Sign out" in dropdown | Session cookie cleared, redirected to home, "Sign In" link restored in navbar | P0 |
| AU-16 | Session persistence | Sign in, close browser, reopen site | User still authenticated (JWT cookie valid for 7 days) | P1 |
| AU-17 | Protected page redirect | Visit `/dashboard` while signed out | Appropriate auth gate behavior (redirect or 401) | P1 |

### 7.2 Page Load & Navigation

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| PL-01 | Home page loads | Navigate to `/` | Hero section, action cards, IntelliForge branding visible | P0 |
| PL-02 | All navigation links work | Click each nav link (Home, Onboard, Attendance, Tasks, Offer Letter, Dashboard) | Correct page loads, active link highlighted | P0 |
| PL-03 | Mobile hamburger menu | On mobile viewport, tap hamburger icon | Slide-down menu with all links appears | P1 |
| PL-04 | Mobile bottom navigation | On mobile viewport, verify bottom nav bar | 5 tabs visible: Home, Onboard, Attendance, Tasks, Admin | P1 |
| PL-05 | Footer links functional | Click each footer quick link and external link | Correct destinations open | P2 |
| PL-06 | 404 handling | Navigate to `/nonexistent` | Next.js default 404 or custom error page | P2 |
| PL-07 | Page load performance | Measure LCP on each page | LCP < 2.5 seconds on 4G connection | P1 |

### 7.3 Intern Onboarding

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| OB-01 | Successful onboarding | Fill all fields (name, email, phone, college, branch, year, role, start date, duration), submit | Success screen shown, intern created with status PENDING | P0 |
| OB-02 | Onboarding with documents | Attach Aadhaar, PAN, photo files (image/PDF), submit | Files uploaded to Vercel Blob, URLs stored in intern record | P0 |
| OB-03 | Missing required fields | Leave name empty, submit | Form validation error displayed, submission blocked | P0 |
| OB-04 | Duplicate email rejection | Submit with an already-registered email | 409 error, toast "Email already registered" | P0 |
| OB-05 | Invalid email format | Enter "not-an-email", submit | Client-side validation prevents submission | P1 |
| OB-06 | Phone number validation | Enter invalid phone format | Validation error shown | P1 |
| OB-07 | Role selection | Select each role (AI Intern, Dev Intern, Research Intern) | Selected role saved correctly | P1 |
| OB-08 | Year selection | Select each year option (1st–4th, Graduated) | Selected year saved correctly | P2 |
| OB-09 | Duration boundary values | Enter 4 weeks (minimum) and 52 weeks (maximum) | Both accepted; values outside range rejected | P1 |
| OB-10 | Large file upload | Upload a 10MB+ file as document | Graceful handling (accept or display size limit error) | P1 |
| OB-11 | Welcome email received | Complete onboarding successfully | AgentMail welcome email arrives with correct name, role, and portal links | P0 |
| OB-12 | Onboarding without documents | Submit with all text fields but no file attachments | Intern created successfully, document URLs null | P1 |

### 7.4 Admin Dashboard

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| AD-01 | Admin login | Enter `admin@intelliforge.tech`, click Sign In | Dashboard loads with intern list | P0 |
| AD-02 | Non-admin rejection | Enter `random@example.com`, click Sign In | 403 error, "Not authorized. Admin access required." | P0 |
| AD-03 | Empty email rejection | Click Sign In without entering email | 400 error or client-side validation | P0 |
| AD-04 | KPI cards accuracy | View dashboard after creating test interns | Total, Pending, Active, Completed counts match actual data | P0 |
| AD-05 | Intern list display | View intern table | All interns listed with name, email, role, status, date | P0 |
| AD-06 | Intern list ordering | Create multiple interns, view list | Most recently created intern appears first (createdAt desc) | P1 |
| AD-07 | Intern detail view | Click on an intern row | Full detail loads: personal info, documents, attendance, tasks | P0 |
| AD-08 | Stipend update | Set stipend to 15000 paise, click Save | Stipend persisted; displayed as ₹150.00 | P0 |
| AD-09 | Stipend zero edge case | Set stipend to 0, attempt Send Offer | Send Offer blocked with appropriate error (stipend required) | P1 |
| AD-10 | Send Offer action | For PENDING intern with stipend > 0, click Send Offer | Status changes to OFFERED, offer email sent with PDF attachment | P0 |
| AD-11 | Send Task Reminder | For ACTIVE intern, click Send Task Reminder | Reminder email sent, success toast shown | P1 |
| AD-12 | Mark Complete | For ACTIVE intern, click Mark Complete + Send Certificate | Status changes to COMPLETED, certificate email sent with PDF | P0 |
| AD-13 | Document links | Click Aadhaar/PAN/Photo links in intern detail | Document opens in new tab from Vercel Blob URL | P1 |
| AD-14 | Status badge colors | View interns with different statuses | Each status (PENDING, OFFERED, ACTIVE, COMPLETED) has distinct badge styling | P2 |
| AD-15 | Back navigation | From intern detail, click back | Returns to intern list with state preserved | P2 |

### 7.5 Offer Letter Flow

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| OF-01 | Offer lookup by email | Enter registered intern email on `/offer`, click Look Up | Intern details displayed: role, stipend, start date, duration | P0 |
| OF-02 | Offer lookup — unknown email | Enter unregistered email | 404 "No offer found for this email" | P0 |
| OF-03 | Offer lookup — empty email | Click Look Up without email | 400 or client-side validation error | P1 |
| OF-04 | Accept offer (web) | For OFFERED intern, click "Accept & Sign" | Status changes to ACTIVE, `acceptedAt` set, success UI shown | P0 |
| OF-05 | Accept offer — wrong status | For PENDING intern, attempt accept | 400 "Cannot accept offer in PENDING status" | P1 |
| OF-06 | Re-accept blocked | For already ACTIVE intern, attempt accept again | 400 error, already active | P0 |
| OF-07 | Accept offer (email reply) | Reply to offer email with "I Accept" | Webhook processes reply, status changes to ACTIVE | P0 |
| OF-08 | Accept offer — keyword variations | Reply with "yes", "agree", "confirm" (case-insensitive) | All variations trigger acceptance | P1 |
| OF-09 | Non-acceptance reply | Reply with "Thank you" (no acceptance keyword) | Status remains OFFERED, no change | P1 |
| OF-10 | Offer letter PDF content | Open the PDF attached to offer email | Contains intern name, role, stipend in ₹, start date, duration, college, ref number | P0 |
| OF-11 | Status display per state | Check `/offer` page for PENDING, OFFERED, ACTIVE interns | Appropriate messaging displayed for each status | P1 |

### 7.6 Attendance Management

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| AT-01 | Load attendance page | Enter ACTIVE intern email on `/attendance` | Current IST date/time, mode toggle, punch buttons visible | P0 |
| AT-02 | Non-active intern blocked | Enter PENDING intern email | 403 "Attendance is available for active interns only" | P0 |
| AT-03 | Unknown email | Enter unregistered email | 404 error | P1 |
| AT-04 | Punch In — WFH | Select WFH mode, click Punch In | Attendance record created with punchIn timestamp and mode=WFH | P0 |
| AT-05 | Punch In — Office | Select Office mode, click Punch In | Record created with mode=Office | P0 |
| AT-06 | Duplicate Punch In blocked | After punching in, click Punch In again | 400 "Already punched in today", button disabled in UI | P0 |
| AT-07 | Punch Out | After Punch In, click Punch Out | punchOut timestamp added to today's record | P0 |
| AT-08 | Duplicate Punch Out blocked | After punching out, click Punch Out again | 400 "Already punched out today", button disabled | P0 |
| AT-09 | Punch Out without Punch In | Attempt Punch Out with no Punch In record | 400 "No punch-in record found" | P1 |
| AT-10 | Invalid type parameter | Send API request with type="invalid" | 400 "Invalid type" | P2 |
| AT-11 | Weekly attendance table | Punch in/out over multiple days | Weekly table shows all entries with computed hours | P0 |
| AT-12 | IST date boundary | Punch in at 11:30 PM IST, punch out at 12:30 AM IST | Records attributed to correct IST calendar dates | P1 |
| AT-13 | Today's record display | Punch in for today | Today's record shows punchIn time, mode, and working hours | P0 |

### 7.7 Task Logging

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| TK-01 | Load tasks page | Enter intern email on `/tasks` | Header with intern name, current week label, total hours | P0 |
| TK-02 | Create task — TODO | Fill title, description, select TODO, enter 2.5 hours, submit | Task created and appears in list with correct week | P0 |
| TK-03 | Create task — IN_PROGRESS | Set status to IN_PROGRESS | Task saved with IN_PROGRESS status | P0 |
| TK-04 | Create task — DONE | Set status to DONE | Task saved with DONE status | P0 |
| TK-05 | Missing required fields | Submit with empty title | Form validation prevents submission (400 from API) | P0 |
| TK-06 | Hours boundary — minimum | Enter 0.5 hours | Accepted (minimum valid value) | P1 |
| TK-07 | Hours boundary — maximum | Enter 40 hours | Accepted (maximum valid value) | P1 |
| TK-08 | Hours boundary — invalid | Enter 0 or 41 hours | Rejected by Zod validation | P1 |
| TK-09 | Delete task | Click delete on an existing task | Task removed from list, confirmed via GET | P0 |
| TK-10 | Delete — missing ID | Send DELETE request without task ID | 400 "Task id required" | P2 |
| TK-11 | Total hours calculation | Create 3 tasks with 2h, 3h, 4.5h | Total shows 9.5 hours | P0 |
| TK-12 | Week label accuracy | Check the displayed week label | Matches current ISO week calculation | P1 |
| TK-13 | Tasks filtered by week | Create tasks, advance to next week | Only current week's tasks visible | P1 |
| TK-14 | Unknown intern email | Enter unregistered email | 404 "Intern not found" | P1 |

### 7.8 Email Automation (AgentMail)

Setup reference (webhook URL, optional IMAP/SMTP for mobile clients): [docs/AGENTMAIL.md](./AGENTMAIL.md).

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| EM-01 | Welcome email | Complete intern onboarding | Email received from `hr@intelliforge.tech` with intern name, role, portal links | P0 |
| EM-02 | Offer letter email | Admin sends offer from dashboard | Email with subject "Your Internship Offer", HTML body with role/stipend, PDF attachment | P0 |
| EM-03 | Task reminder email | Admin clicks Send Reminder or Monday cron fires | Email with task reminder, link to `/tasks`, date in en-IN format | P1 |
| EM-04 | Attendance nudge email | Weekday cron fires for intern without today's attendance | Email with attendance nudge, link to `/attendance` | P1 |
| EM-05 | Completion certificate email | Admin marks intern complete | Email with completion message, PDF certificate attachment | P0 |
| EM-06 | Webhook — offer acceptance | Intern replies to offer email with "I Accept" | Webhook endpoint processes message, intern status → ACTIVE | P0 |
| EM-07 | Webhook — non-matching event | Webhook receives `message.sent` event | Returns 200 OK, no state change | P2 |
| EM-08 | Webhook — unknown inbox | Webhook receives message for non-existent inbox | Returns 200 OK, no error thrown | P2 |
| EM-09 | Email sender identity | Check From address on all emails | All emails from `hr@intelliforge.tech` | P1 |
| EM-10 | Email HTML rendering | Open emails in Gmail, Outlook, Apple Mail | HTML renders correctly across major clients | P1 |
| EM-11 | AgentMail API failure | Simulate API downtime / invalid key | Onboarding still succeeds (email failure logged, not blocking) | P1 |

### 7.9 PDF Generation

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| PF-01 | Offer letter PDF — content | Open offer letter PDF attachment | Contains: ref number, intern name, college, role, stipend (₹), start date, duration, signatures | P0 |
| PF-02 | Offer letter PDF — formatting | Inspect PDF layout | A4 page, IntelliForge branding header, structured table, dual signature blocks, footer | P1 |
| PF-03 | Completion certificate — content | Open certificate PDF attachment | Contains: intern name, role, college, start date, computed end date, certification text | P0 |
| PF-04 | Completion certificate — dates | Verify end date calculation | End date = start date + (durationWeeks × 7 days) | P0 |
| PF-05 | Stipend INR formatting | Check stipend in offer PDF | Displayed as ₹X,XXX.XX with en-IN locale formatting | P1 |
| PF-06 | PDF file validity | Download and open in multiple PDF readers | Opens without errors in Chrome PDF viewer, Adobe Reader, Preview | P1 |
| PF-07 | Special characters in name | Onboard intern with name containing accents/special chars | PDF renders name correctly without encoding issues | P2 |

### 7.10 Cron Jobs

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| CR-01 | Task reminder fires on Monday | Wait for Monday 09:00 IST or manually invoke `GET /api/cron/task-reminder` with Bearer token | All ACTIVE interns receive task reminder email; response `{ ok, sent, total }` | P1 |
| CR-02 | Attendance nudge fires on weekday | Wait for weekday 10:30 IST or manually invoke | ACTIVE interns without today's attendance receive nudge email | P1 |
| CR-03 | Cron auth — valid token | Call cron endpoint with correct `Authorization: Bearer CRON_SECRET` | 200 success | P0 |
| CR-04 | Cron auth — missing token | Call cron endpoint without Authorization header | 401 Unauthorized | P0 |
| CR-05 | Cron auth — wrong token | Call cron endpoint with incorrect Bearer token | 401 Unauthorized | P0 |
| CR-06 | Nudge skips already-attended | Intern punched in today, then cron fires | That intern does NOT receive a nudge email | P1 |
| CR-07 | No ACTIVE interns | All interns are PENDING/COMPLETED | Cron returns `{ ok: true, sent: 0, total: 0 }` | P2 |

### 7.11 PWA & Mobile Experience

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| PW-01 | Install prompt (Android Chrome) | Visit site in Chrome on Android | "Install" banner appears after brief delay | P1 |
| PW-02 | Install prompt dismissal | Click "Dismiss" on install banner | Banner hidden, not shown again in same session (`sessionStorage`) | P2 |
| PW-03 | PWA installation | Click "Install" on banner or browser menu | App installs, opens in standalone mode | P1 |
| PW-04 | Standalone mode | Open installed PWA | No browser address bar, IntelliForge branding, correct theme color (#6366f1) | P1 |
| PW-05 | Service worker registration | Check DevTools → Application → Service Workers | `sw.js` registered and active | P2 |
| PW-06 | Manifest validation | Check DevTools → Application → Manifest | Name, icons, start_url, display, theme_color all correct | P2 |
| PW-07 | iOS Safari — Add to Home Screen | Use Safari share → "Add to Home Screen" | App icon appears, opens in standalone mode | P1 |
| PW-08 | Mobile responsive — onboarding form | Open `/onboard` on mobile | Form fields stack vertically, inputs full-width, submit button accessible | P0 |
| PW-09 | Mobile responsive — dashboard | Open `/dashboard` on mobile | Table scrollable or cards stack, all actions accessible | P1 |
| PW-10 | Mobile responsive — attendance | Open `/attendance` on mobile | Mode toggle and punch buttons accessible, weekly table scrollable | P1 |
| PW-11 | PWA shortcuts | Long-press PWA icon (Android) | Shortcuts available: Attendance, Tasks, Onboard | P2 |

### 7.12 Security & Access Control

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| SC-01 | Admin endpoint — valid admin | `GET /api/dashboard?email=admin@intelliforge.tech` | 200 with intern list | P0 |
| SC-02 | Admin endpoint — non-admin | `GET /api/dashboard?email=intern@test.com` | 403 Forbidden | P0 |
| SC-03 | Intern detail — no auth bypass | `GET /api/dashboard/intern?id=<valid_id>` without admin check | Verify behavior (currently no admin check on this endpoint) | P0 |
| SC-04 | Dashboard action — no auth bypass | `POST /api/dashboard/action` without admin validation | Verify behavior (currently no admin check on this endpoint) | P0 |
| SC-05 | Cron endpoint — auth required | `GET /api/cron/task-reminder` without Bearer token | 401 Unauthorized | P0 |
| SC-06 | File upload restrictions | Upload non-image/PDF file as Aadhaar | Rejected by `accept="image/*,.pdf"` (client-side); server behavior verified | P1 |
| SC-07 | SQL injection attempt | Enter `'; DROP TABLE interns; --` as name | Prisma ORM parameterizes; no SQL injection | P1 |
| SC-08 | XSS attempt | Enter `<script>alert('xss')</script>` as intern name | Script not executed when rendered in dashboard | P1 |
| SC-09 | Email enumeration | Use offer/attendance/tasks endpoints with guessed emails | Returns 404 (acceptable), no additional info leakage | P2 |
| SC-10 | Webhook authenticity | Send fake webhook payload to `/api/webhooks/agentmail` | Returns 200 OK (current behavior — flag for security review) | P1 |

### 7.13 Edge Cases & Error Handling

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| EG-01 | Concurrent onboarding — same email | Two users submit onboarding with same email simultaneously | One succeeds (200), other gets 409 (unique constraint) | P1 |
| EG-02 | Very long intern name | Enter 500-character name | System handles gracefully (accept or truncate with error) | P2 |
| EG-03 | Unicode/emoji in fields | Enter Hindi/emoji characters in name/description | Stored and displayed correctly | P2 |
| EG-04 | Network interruption during upload | Disconnect network mid-file-upload | User receives error feedback, partial data not persisted | P1 |
| EG-05 | Rapid button clicks | Double-click "Punch In" rapidly | Only one attendance record created (idempotency) | P1 |
| EG-06 | Browser back/forward | Complete form, navigate back, forward | Form state handled gracefully (no duplicate submission) | P2 |
| EG-07 | Expired/invalid Blob token | Simulate expired BLOB_READ_WRITE_TOKEN | Onboarding succeeds without documents or shows clear error | P1 |
| EG-08 | Database connection failure | Simulate Neon outage | API returns 500 with generic error, no stack trace leaked | P1 |
| EG-09 | Multiple tabs — same action | Open two dashboard tabs, click Send Offer on both | Only one succeeds, second gets appropriate error | P2 |
| EG-10 | Timezone edge — midnight IST | Perform attendance at 11:59 PM IST → verify date attribution | Record attributed to correct IST date | P1 |

---

## 8. API Endpoint Test Matrix

| # | Method | Endpoint | Happy Path | Validation (400) | Auth (401/403) | Not Found (404) | Conflict (409) | Server Error (500) |
|---|--------|----------|:----------:|:-----------------:|:--------------:|:----------------:|:--------------:|:------------------:|
| 1 | POST | `/api/auth/register` | AU-01 | AU-02, AU-03 | — | — | AU-04 | — |
| 2 | POST | `/api/auth/login` | AU-05 | — | AU-06, AU-07 | — | — | — |
| 3 | GET | `/api/auth/me` | AU-13 | — | AU-13* | — | — | — |
| 4 | POST | `/api/auth/logout` | AU-15 | — | — | — | — | — |
| 5 | POST | `/api/auth/magic-link` | AU-09 | — | — | — | — | — |
| 6 | GET | `/api/auth/verify` | AU-11 | AU-10 | — | — | — | — |
| 7 | POST | `/api/onboard` | OB-01 | OB-03 | — | — | OB-04 | EG-07 |
| 8 | GET | `/api/dashboard` | AD-01 | AD-03 | AD-02 | — | — | EG-08 |
| 9 | GET | `/api/dashboard/intern` | AD-07 | SC-03 | — | AD-07* | — | EG-08 |
| 10 | POST | `/api/dashboard/action` | AD-10 | AD-09 | SC-04 | AD-10* | — | EG-08 |
| 11 | GET | `/api/offer` | OF-01 | OF-03 | — | OF-02 | — | — |
| 12 | POST | `/api/offer/accept` | OF-04 | OF-05 | — | OF-04* | — | — |
| 13 | GET | `/api/attendance` | AT-01 | AT-03 | AT-02 | AT-03 | — | — |
| 14 | POST | `/api/attendance` | AT-04 | AT-06 | — | — | — | — |
| 15 | GET | `/api/tasks` | TK-01 | TK-14 | — | TK-14 | — | — |
| 16 | POST | `/api/tasks` | TK-02 | TK-05 | — | — | — | — |
| 17 | DELETE | `/api/tasks` | TK-09 | TK-10 | — | — | — | — |
| 18 | GET | `/api/cron/task-reminder` | CR-01 | — | CR-04 | — | — | — |
| 19 | GET | `/api/cron/attendance-nudge` | CR-02 | — | CR-04 | — | — | — |
| 20 | POST | `/api/webhooks/agentmail` | EM-06 | — | — | — | — | — |

---

## 9. Bug Reporting Process

### 9.1 Bug Report Template

```
Title:        [Module] Brief description of the issue
Severity:     P0 / P1 / P2 / P3
Reporter:     Name (beta group)
Date:         DD/MM/YYYY
Device:       e.g., iPhone 14, Chrome 120 on Windows 10
Page/API:     e.g., /attendance or POST /api/attendance

Steps to Reproduce:
1. ...
2. ...
3. ...

Expected Result:
...

Actual Result:
...

Screenshots/Recordings:
(Attach if applicable)

Console Errors:
(Copy browser console output if applicable)
```

### 9.2 Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| **P0 — Critical** | System unusable, data loss, or security vulnerability | Fix within 4 hours | Onboarding fails completely, admin data exposed to non-admins |
| **P1 — High** | Major feature broken, no workaround | Fix within 24 hours | Offer acceptance doesn't change status, PDF generation fails |
| **P2 — Medium** | Feature impaired but workaround exists | Fix within 3 days | Stipend displays incorrectly, mobile layout broken on specific device |
| **P3 — Low** | Cosmetic issue, minor UX improvement | Fix before GA release | Typo in email, icon alignment, color inconsistency |

### 9.3 Bug Lifecycle

```
NEW → TRIAGED → IN PROGRESS → FIXED → VERIFIED → CLOSED
                                  ↓
                              REOPENED (if verification fails)
```

### 9.4 Reporting Channels

| Channel | Usage |
|---------|-------|
| GitHub Issues | Primary bug tracking (if repo initialized) |
| Shared spreadsheet | Backup for non-technical testers |
| Email to `admin@intelliforge.tech` | Urgent P0 issues |

---

## 10. Beta Timeline

| Phase | Duration | Dates | Activities |
|-------|----------|-------|------------|
| **Phase 0 — Preparation** | 3 days | 31 Mar – 02 Apr 2026 | Tester onboarding, test data setup, environment verification |
| **Phase 1 — Core Functionality** | 5 days | 03 Apr – 07 Apr 2026 | Onboarding, dashboard, offer flow, status transitions |
| **Phase 2 — Daily Operations** | 5 days | 08 Apr – 12 Apr 2026 | Attendance tracking, task logging, email verification, cron jobs |
| **Phase 3 — Edge Cases & Cross-Platform** | 4 days | 13 Apr – 16 Apr 2026 | Mobile testing, PWA, browser compat, security, edge cases |
| **Phase 4 — Regression & Sign-off** | 3 days | 17 Apr – 19 Apr 2026 | Retest fixed bugs, final regression, collect feedback |
| **Beta Completion Review** | 1 day | 20 Apr 2026 | Evaluate exit criteria, go/no-go decision for GA |

### 10.1 Daily Standup

- **Time:** 10:00 AM IST (Monday–Friday)
- **Duration:** 15 minutes
- **Agenda:** Bugs found yesterday, testing focus today, blockers

### 10.2 Weekly Summary Report

Published every Friday covering:
- Test scenarios executed vs. remaining
- Bugs found (by severity)
- Bugs resolved vs. open
- Tester feedback highlights
- Risk/blocker escalations

---

## 11. Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | AgentMail API rate limits or downtime | Medium | High | Monitor API usage; email failures are non-blocking for onboarding; cache HR inbox ID |
| R2 | Vercel Blob storage token expiry | Low | High | Set up token rotation alerts; test with expired token during beta |
| R3 | Neon database cold starts | Medium | Medium | Monitor query latency; ensure connection pooling configured |
| R4 | Webhook endpoint lacks authentication | High | High | Flag for immediate fix; any external actor can send fake acceptance events |
| R5 | No session/JWT auth for intern-facing routes | High | Medium | Interns identified by email only; consider adding token-based auth post-beta |
| R6 | Admin endpoints lack server-side auth check | High | High | `/api/dashboard/intern` and `/api/dashboard/action` accessible without admin validation — flag for fix |
| R7 | ISO week calculation mismatch | Medium | Low | Verify frontend and backend `getCurrentISOWeek` produce same results |
| R8 | Large file uploads cause timeouts | Medium | Medium | Test with 10MB+ files; set Vercel function timeout limits |
| R9 | Concurrent operations cause race conditions | Low | Medium | Test rapid-fire duplicate actions (punch in, onboarding) |
| R10 | Beta testers create test data in production | High | Low | Use naming convention (`beta.*@intelliforge.tech`); clean up after beta |

---

## 12. Success Metrics & Exit Criteria

### 12.1 Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Test scenario pass rate | ≥ 95% | Scenarios passed / total scenarios |
| P0 bugs at beta close | 0 | Bug tracker count |
| P1 bugs at beta close | ≤ 2 (with workarounds) | Bug tracker count |
| Email delivery success | ≥ 95% | AgentMail delivery reports |
| Page load time (LCP) | < 2.5s on 4G | Lighthouse / WebPageTest |
| Uptime during beta period | ≥ 99.5% | Vercel status monitoring |
| Playwright E2E pass rate | 38/38 (0 failures) | `npx playwright test` output |
| Node E2E integration pass rate | 100% (0 failures) | `node e2e-test.js` output |

### 12.2 Qualitative Metrics

| Metric | Target | Collection Method |
|--------|--------|-------------------|
| Overall satisfaction score | ≥ 4.0 / 5.0 | Post-beta survey |
| Onboarding flow ease | ≥ 4.0 / 5.0 | Task-specific survey question |
| Dashboard usability | ≥ 4.0 / 5.0 | Task-specific survey question |
| Mobile experience quality | ≥ 3.5 / 5.0 | Task-specific survey question |
| Email content clarity | ≥ 4.0 / 5.0 | Task-specific survey question |

### 12.3 Go / No-Go Decision Matrix

| Condition | Decision |
|-----------|----------|
| All P0 fixed, ≤ 2 P1 open, satisfaction ≥ 4.0 | **GO** — proceed to GA |
| All P0 fixed, > 2 P1 open, satisfaction ≥ 3.5 | **Conditional GO** — extend beta 1 week to resolve P1s |
| Any P0 open OR satisfaction < 3.5 | **NO-GO** — address issues, rerun impacted test phases |

---

## 13. Feedback Collection

### 13.1 Post-Beta Survey Questions

1. **Overall Experience** — How would you rate your overall experience with the HRMS portal? (1–5)
2. **Onboarding** — Was the self-onboarding process clear and easy to complete? (1–5)
3. **Dashboard** — Was the admin dashboard intuitive for managing interns? (1–5)
4. **Attendance** — Was the daily punch in/out process smooth? (1–5)
5. **Task Logging** — Was the task logging feature useful and easy to use? (1–5)
6. **Emails** — Were the automated emails timely, clear, and correctly formatted? (1–5)
7. **Mobile Experience** — How was the portal experience on a mobile device? (1–5)
8. **Bugs Encountered** — Did you encounter any bugs not already reported? (Free text)
9. **Missing Features** — What features or improvements would you like to see? (Free text)
10. **Recommendation** — Would you recommend this portal for intern management? (Yes / Maybe / No)

### 13.2 Continuous Feedback Channel

- Shared document or chat channel for real-time observations during beta
- Weekly feedback summary compiled by QA lead
- Final consolidated report at beta close

---

## Appendix

### A. Intern Status State Machine

```
  ┌──────────┐   send_offer    ┌──────────┐   accept (web/email)   ┌──────────┐   mark_complete   ┌───────────┐
  │ PENDING  │ ──────────────→ │ OFFERED  │ ──────────────────────→│  ACTIVE  │ ────────────────→ │ COMPLETED │
  └──────────┘                 └──────────┘                        └──────────┘                   └───────────┘
       ↑                                                                                               
   onboarding                                                                                          
```

### B. API Quick Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | None | Create account (admin or intern) |
| POST | `/api/auth/login` | None | Sign in with email + password |
| GET | `/api/auth/me` | JWT cookie | Get current authenticated user |
| POST | `/api/auth/logout` | JWT cookie | Sign out (clears session cookie) |
| POST | `/api/auth/magic-link` | None | Send passwordless sign-in link |
| GET | `/api/auth/verify` | None | Verify email or consume magic link token |
| POST | `/api/auth/forgot-password` | None | Send password reset email |
| POST | `/api/auth/reset-password` | None | Reset password with token |
| POST | `/api/onboard` | None | Register new intern |
| GET | `/api/dashboard` | Admin email | List all interns |
| GET | `/api/dashboard/intern` | None* | Get intern detail |
| POST | `/api/dashboard/action` | None* | Admin actions (stipend, offer, reminder, complete) |
| GET | `/api/offer` | None | Look up offer by email |
| POST | `/api/offer/accept` | None | Accept offer |
| GET | `/api/attendance` | None | Get attendance by email |
| POST | `/api/attendance` | None | Punch in/out |
| GET | `/api/tasks` | None | Get tasks by email |
| POST | `/api/tasks` | None | Create task |
| DELETE | `/api/tasks` | None | Delete task |
| GET | `/api/cron/task-reminder` | Bearer CRON_SECRET | Trigger task reminders |
| GET | `/api/cron/attendance-nudge` | Bearer CRON_SECRET | Trigger attendance nudges |
| POST | `/api/webhooks/agentmail` | None* | AgentMail inbound webhook |

*Flagged as security concern — lacks server-side auth validation

### C. E2E Test Suite Reference

#### Playwright (browser + API tests)

Run the Playwright E2E suite before and after each beta phase:

```bash
# Run all 38 tests against production (default baseURL in playwright.config.ts)
npx playwright test

# Run with visible browser
npx playwright test --headed

# View HTML report after run
npx playwright show-report
```

The suite covers 6 spec files: `homepage`, `auth`, `navigation`, `api`, `responsive`, `security-headers` — 38 tests total.

#### Node integration tests

```bash
# Against production
node e2e-test.js

# Against local development
BASE_URL=http://localhost:3000 node e2e-test.js
```

The integration suite covers 11 test groups with ~40 assertions across all API endpoints.

### D. Test Data Cleanup

After beta completion, remove test data:

```sql
-- Remove beta test interns and cascaded records
DELETE FROM interns WHERE email LIKE 'beta.%@intelliforge.tech';
DELETE FROM interns WHERE email LIKE 'e2e.%@test.intelliforge.tech';
```

---

*Document Version: 1.1 | Last Updated: 30 March 2026 | IntelliForge AI*
