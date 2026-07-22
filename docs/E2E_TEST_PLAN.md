# Client Craft — End-to-End Test Plan

Single reference for manual E2E testing, demo recording, and QA walkthroughs. Run flows in **story order**: client registers → admin accepts → contract → payment → project → completion.

**Related docs:** [PayPal setup](./PAYPAL_SETUP.md) · [Desktop app](./DESKTOP-APP.md) · Routes in `src/App.tsx`

---

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document)
2. [Prerequisites & Environment](#prerequisites--environment)
3. [Test Accounts & Profiles](#test-accounts--profiles)
4. [Automated Tests (Vitest)](#automated-tests-vitest)
5. [Core E2E Flow](#core-e2e-flow)
   - [Phase 1 — Client Registration](#phase-1--client-registration)
   - [Phase 2 — Admin Accepts Registration](#phase-2--admin-accepts-registration)
   - [Phase 3 — Contract Wizard](#phase-3--contract-wizard)
   - [Phase 4 — Send Contract](#phase-4--send-contract)
   - [Phase 5 — Client Signs Contract](#phase-5--client-signs-contract)
   - [Phase 6 — Deposit Invoice](#phase-6--deposit-invoice)
   - [Phase 7 — Deposit Payment](#phase-7--deposit-payment)
   - [Phase 8 — Start Project](#phase-8--start-project)
   - [Phase 9 — File Sharing](#phase-9--file-sharing)
   - [Phase 10 — Completion & Final Invoice](#phase-10--completion--final-invoice)
6. [Optional & Secondary Flows](#optional--secondary-flows)
7. [Minimum Viable Test Path](#minimum-viable-test-path)
8. [Known Pitfalls & Expected Behavior](#known-pitfalls--expected-behavior)
9. [Recommended Test Order](#recommended-test-order)
10. [Route Reference](#route-reference)

---

## How to Use This Document

| Use case | Start here |
|----------|------------|
| Full regression / demo recording | [Core E2E Flow](#core-e2e-flow) — all phases |
| Quick smoke test before release | [Minimum Viable Test Path](#minimum-viable-test-path) |
| Payment setup issues | [Prerequisites](#prerequisites--environment) + [PayPal setup](./PAYPAL_SETUP.md) |
| Automated CI checks | [Automated Tests](#automated-tests-vitest) |

Use two browser profiles: **Studio Admin** and **Demo Client**.

---

## Prerequisites & Environment

- [ ] App running locally (`npm run dev`) or on staging
- [ ] PayPal sandbox configured — see [PAYPAL_SETUP.md](./PAYPAL_SETUP.md)
- [ ] `.env` has `JWT_SECRET` and PayPal credentials
- [ ] **Admin account:** work email (`firstname@aspencreativesolutions.com`) or existing admin login
- [ ] **Demo client email:** real inbox you control (contract + PayPal emails reference it)
- [ ] **File-sharing assets ready:** 1 PDF, 1 PNG/JPG logo, 1 DOC/DOCX
- [ ] **Settings pre-filled** (optional): `/settings` — business name, owner, email, phone, contract defaults
- [ ] **Notifications cleared** or plan to dismiss old dashboard alerts

---

## Test Accounts & Profiles

| Profile | Login URL | Purpose |
|---------|-----------|---------|
| Studio Admin | `/login` | Accept registrations, contracts, invoices, project start |
| Demo Client | `/portal/login` | Register, sign contract, pay, upload files |

---

## Automated Tests

### Unit / integration (Vitest)

```bash
npm test
```

| File | Coverage |
|------|----------|
| `server/lib/emailVerification.test.js` | Email verification helpers |
| `server/routes/auth.verification.test.js` | Auth verification routes |

### Browser E2E (Playwright)

Full lifecycle spec — runs **serially** in phase order (`e2e/full-flow.spec.ts`):

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

The E2E runner starts an isolated API + Vite dev server with `E2E_TEST=1` (no sample seed data). Payment steps use `/api/e2e/*` helpers when PayPal sandbox is not configured.

| Phase | Test |
|-------|------|
| 01 | Client registers |
| 02 | Unlinked portal dashboard |
| 03 | Admin accepts registration |
| 04 | Contract wizard + send |
| 05 | Client signs contract |
| 06–07 | Deposit invoice + payment |
| 08 | Start project |
| 09–10 | File upload (client → admin) |
| 11 | Project complete + final payment |

---

## Core E2E Flow

### Phase 1 — Client Registration

**URL:** `/portal/register` · `PortalRegisterPage`

- [ ] Landing: logo, **Create an account**, Aspen work-email vs client registration subtitle
- [ ] *(Optional)* **Choose Style** → pick theme in `PortalStyleModal` (themes; default Graphite Lab)
- [ ] Full name, email (designer-recognized), password (≥8 chars), confirm password
- [ ] **Create account** → land on `/portal` (unlinked state)

**Unlinked dashboard** · `PortalDashboardPage`

- [ ] **Welcome** / **Client Portal** headers
- [ ] Current Contracts empty: *No contracts yet* / waiting for designer acceptance
- [ ] Navbar: Dashboard, Timeline, Choose Style, Sign out
- [ ] *(Optional)* `/portal/timeline` — *Your profile is not linked yet*
- [ ] Sign out

---

### Phase 2 — Admin Accepts Registration

**URL:** `/login` · `LoginPage` → `/` · `DashboardPage`

- [ ] Admin sign in
- [ ] `AdminNotificationBanner`: **New portal registration** with client name/email
- [ ] **View New Registers** (badge on `NewRegistrationsModal`)
- [ ] Summary cards: Clients, Pending Clients, Active Projects, Pending Contracts, Upcoming Deadlines
- [ ] Open **New Registrations** modal → row with name, email, registered date
- [ ] **Accept User and Start Contract Draft** → auto-navigate to `/clients/:id/contract`

---

### Phase 3 — Contract Wizard

**URL:** `/clients/:id/contract` · `ContractPage` + `ContractForm`

#### Step 1 — Client Details

- [ ] Client Name, Business Name, Email, Phone, Client Address

#### Step 2 — Project Scope

- [ ] Service Tier (Launch / Studio / Summit)
- [ ] Project Title, Scope, Services Included/Not Included, Deliverables, Start Date, Estimated Completion

#### Step 3 — Payment Terms

- [ ] Total Project Cost, Deposit Amount, Remaining Balance
- [ ] Payment Schedule, Accepted Payment Methods, Late Payment Policy

#### Step 4 — Revisions & Responsibilities

- [ ] Included Revisions, Extra Revision Fee, Revision Timeline/Limits
- [ ] Client Responsibilities, Communication, Response Time, Meeting Expectations

#### Step 5 — Termination & Signatures

- [ ] Ownership Terms, Portfolio Rights, Termination Conditions
- [ ] Designer Signature (typed), Designer Sign Date

#### Step 6 — Review & Generate PDF

- [ ] Review summary (business, project, total/deposit/tier)
- [ ] **Generate Contract PDF** → download; status → **Generated**
- [ ] **Download Again** available
- [ ] **Save Draft** at least once (status → Draft in Progress)
- [ ] **Back** / **Next** navigation between steps

---

### Phase 4 — Send Contract

**Modal:** `SendContractModal`

- [ ] **Send Contract to Client**
- [ ] Mode tabs: **Client portal** | **Email (fallback)**
- [ ] Portal mode: read-only client email, portal-match explanation
- [ ] **Send to client account** → success; contract → **Sent**, project → **Contract Sent**

**Profile check** · `/clients/:id` · `ClientProfilePage`

- [ ] `ClientStatusOverview`: Project / Contract / Payment badges
- [ ] Contract stepper: Not started → Draft → Generated → **Sent**
- [ ] `ProjectTimeline`: **Contract Sent** step active
- [ ] `MarkOfficialClientCard`: still **Pending Client**

---

### Phase 5 — Client Signs Contract

**Client profile** · `/portal/login` → `/portal`

- [ ] **Current Contracts** table · `PortalCurrentContracts`
- [ ] Columns: Contract, Date sent, Status (**Pending Review**), Actions
- [ ] **View** → `/portal/contracts/:contractId`

**Contract page** · `PortalContractPage`

- [ ] Back link, project title, *Contract from {business}*, status (**Viewed** on first open)
- [ ] Summary: Total, Deposit, Tier
- [ ] All contract sections scrollable (scope, payment, revisions, termination, designer signature)

**Signing**

- [ ] Type full name in electronic signature field
- [ ] Check agreement checkbox
- [ ] **Accept contract** → **Contract accepted** + signed date + **Back to dashboard**

**Locked files (expected)**

- [ ] `PortalProjectFilesSection` still locked
- [ ] Message: file sharing unlocks after designer starts project
- [ ] **Assistance** modal · `PortalAssistanceModal`

---

### Phase 6 — Deposit Invoice

**Admin** · `/clients/:id`

- [ ] Dashboard banner: **Contract signed**
- [ ] **Official Client** badge · `MarkOfficialClientCard`: *Client since {date}*
- [ ] Timeline: **Contract Signed** complete
- [ ] `ClientInvoiceCard` — **Deposit Invoice** auto-generated on sign
- [ ] **Send Invoice Link** (or **Generate deposit invoice** if needed)
- [ ] *(Optional)* **Preview PayPal link**

---

### Phase 7 — Deposit Payment

**Client** · `/portal`

- [ ] **Deposit Invoice** · `PortalInvoiceSection` — amount, issued date
- [ ] **Pay with PayPal** → PayPal sandbox tab
- [ ] Complete checkout → `/portal/payment/success` · `PortalPaymentSuccessPage`
- [ ] **Confirming payment…** → **Payment successful** → **Back to dashboard**
- [ ] **Down payment received** banner

**Timeline** · `/portal/timeline` · `PortalTimelinePage`

- [ ] Steps: Contract Sent → Signed → Deposit Invoice Sent → PayPal Link Clicked
- [ ] Step labels, *Up next*, completion dates

---

### Phase 8 — Start Project

**Admin**

- [ ] Dashboard banner: payment link clicked → **View client**
- [ ] Timeline: **PayPal Link Clicked** step
- [ ] **Confirm Payment on PayPal** on **Payment Confirmed** (if shown)
- [ ] `/clients` or dashboard `ClientTable`: **Start Project** enabled
- [ ] Click **Start Project** → **Active** badge; project status → In Progress

---

### Phase 9 — File Sharing

#### Client uploads

**Client** · `/portal`

- [ ] **Your project is active** banner with start date
- [ ] **Project Files** unlocked
- [ ] Accepted types + notes explanation shown
- [ ] Optional upload note → drag-and-drop or **Choose files**
- [ ] File appears with *(you)* as uploader
- [ ] **Add Note** on file → **Save note**
- [ ] **Download** works

#### Admin receives & responds

**Admin** · `/clients/:id#project-files` · `ProjectFilesSection`

- [ ] Client uploads visible in real time (subtitle confirms)
- [ ] **Download** client file
- [ ] **Upload File** — admin deliverable appears in list

#### Client receives admin file

**Client** · refresh or wait (~10s auto-refresh)

- [ ] Designer file in list → **Download**

#### Timeline file events

- [ ] Admin timeline: **File Uploads / Notes Added** with sub-events
- [ ] Client timeline: file upload / note sub-events with filenames

---

### Phase 10 — Completion & Final Invoice

**Admin profile extras**

- [ ] **Add Note** · `AddNoteModal` (General, Payment, Contract, Project, Follow-Up)
- [ ] **Send Email** (mailto)
- [ ] **Edit Client** fields

**Complete project**

- [ ] Timeline: **Mark Project Completed**
- [ ] `ClientFinalInvoiceCard`: **Final Invoice**
- [ ] **Send Final Invoice** → *(optional)* **Preview PayPal link**

**Client final payment**

- [ ] `/portal`: **Final balance due**
- [ ] **Pay with PayPal** → success → **Final balance received**

**End-state timeline (both sides)**

| # | Step |
|---|------|
| 1 | Contract Sent |
| 2 | Contract Signed |
| 3 | PayPal Invoice Link Sent |
| 4 | PayPal Link Clicked |
| 5 | Payment Confirmed |
| 6 | Start Project Clicked |
| 7 | File Uploads / Notes Added |
| 8 | Project Completed |

---

## Optional & Secondary Flows

### Clients list · `/clients` · `ClientsPage`

- [ ] Search and filters (Project, Contract, Payment, Deadlines, Type)
- [ ] Inline **Service Tier** edit · `EditableServiceTierCell`
- [ ] Sample client tooltip: *THIS IS A MOCK USER.*

### Dashboard · `/` · `DashboardPage`

- [ ] Summary tile highlight mode (rows stay visible, matching rows highlighted)
- [ ] **Back** button when a tile filter is active
- [ ] Upcoming Deadlines + Timeline Updates side-by-side (large screens)
- [ ] `TimelineSkipNotesFeed` expand/collapse

### Timeline skip (admin)

- [ ] Hover pending step → *Click to skip to this step*
- [ ] `TimelineSkipModal`: confirm + optional note
- [ ] Skip note in dashboard **Timeline Updates**

### Contracts overview · `/contracts`

- [ ] All contract statuses → **Open Contract**

### Calendar & Scheduler · `/calendar`, `/scheduler`

- [ ] Deadlines list, urgency labels
- [ ] Weekly grid, **Regenerate Week**, notes sidebar

### Settings · `/settings`

- [ ] App Style theme picker
- [ ] Business Information + Contract Defaults → **Save Settings**
- [ ] Automation settings

### Admin profile · `/profile`

- [ ] Display name, change password, **My clients** table

### Portal polish

- [ ] **Choose Style** — theme persists after switch
- [ ] Footer: *Need help? Contact your designer…*

### In-app onboarding tours

Defined in `src/lib/onboardingSteps.ts` — trigger from navbar **Tour** button:

- **Client tour:** portal nav, registration waiting, status, contracts, invoices, files, timeline, notifications
- **Admin tour:** dashboard, registrations, clients, contracts, calendar, notifications, automation settings

---

## Minimum Viable Test Path

Shortest path that validates the critical business loop:

1. Client registers → admin accepts
2. Contract wizard (all 6 steps) → generate PDF → send via portal
3. Client signs contract
4. Admin sends deposit invoice → client pays PayPal
5. Admin starts project
6. Client uploads files with note → admin sees + uploads back
7. Admin marks complete → final invoice → client pays

Skip [Optional & Secondary Flows](#optional--secondary-flows) for smoke tests.

---

## Known Pitfalls & Expected Behavior

| Behavior | Detail |
|----------|--------|
| Deposit invoice on portal | Does **not** appear until admin clicks **Send Invoice Link** (auto-generated on sign, not auto-sent) |
| Start Project button | Disabled until contract signed **and** client clicked PayPal link |
| File sharing | Locked until admin starts project |
| PayPal | Must be sandbox/test mode or payments fail |
| Auto-refresh | Dashboard, timeline, files refresh every 3–10s |
| Sample clients | Hover name for mock-user tooltip — don't mix with live demo client |

---

## Recommended Test Order

Minimize context-switching when recording or testing:

1. Admin login + settings snapshot (optional)
2. Client register + unlinked dashboard + sign out
3. Admin: accept → contract wizard → send
4. Client: login → view/sign contract → locked files
5. Admin: send deposit invoice
6. Client: PayPal deposit + success + timeline
7. Admin: confirm payment + start project
8. Client: upload files + notes
9. Admin: view/download + upload deliverable
10. Client: download admin file + timeline events
11. Admin: mark complete + send final invoice
12. Client: pay final invoice
13. Optional: clients list, notifications, skip/settings/calendar

---

## Route Reference

| Role | Route | Purpose |
|------|-------|---------|
| Client | `/portal/register` | Create portal account |
| Client | `/portal/login` | Sign in |
| Client | `/portal` | Dashboard |
| Client | `/portal/contracts/:id` | View & sign contract |
| Client | `/portal/timeline` | Project timeline |
| Client | `/portal/payment/success` | PayPal return |
| Admin | `/login` | Studio sign in |
| Admin | `/` | Dashboard |
| Admin | `/clients` | Client roster |
| Admin | `/clients/:id` | Client profile |
| Admin | `/clients/:id/contract` | Contract wizard |
| Admin | `/contracts` | All contracts |
| Admin | `/calendar` | Deadlines calendar |
| Admin | `/scheduler` | Weekly scheduler |
| Admin | `/settings` | Business & theme settings |
| Admin | `/profile` | Admin profile |
