# ClientCraft Demo Video — Screen Recording Checklist

Use this as a shot list when recording a full walkthrough of ClientCraft. Record in **story order** (client registers first, then switch to admin, then back to client). Use two browser profiles: **Studio Admin** and **Demo Client**.

---

## Before You Record

- [ ] **Environment:** App running locally (or staging) with PayPal sandbox configured — see [PAYPAL_SETUP.md](./PAYPAL_SETUP.md)
- [ ] **Admin account:** Work email format (`firstname@aspencreativesolutions.com`) or existing admin login
- [ ] **Demo client email:** Use a real inbox you control (contract + PayPal emails may reference it)
- [ ] **Prep assets for file-sharing demo:** 1 PDF, 1 PNG/JPG logo, 1 DOC/DOCX — keep them on desktop for drag-and-drop
- [ ] **Settings pre-filled** (optional opening shot): `/settings` — business name, owner name, email, phone, contract defaults
- [ ] **Clear notifications:** Start fresh or note you'll dismiss old alerts on dashboard

**Routes reference:** `src/App.tsx`

---

## Act 1 — Client Creates a Portal Account

**URL:** `/portal/register` · `PortalRegisterPage`

- [ ] Show landing: logo, **"Create an account"**, subtitle about Aspen work email vs client registration
- [ ] *(Optional)* Click **Choose Style** → pick a theme in `PortalStyleModal` (13 themes; default is Ocean Office)
- [ ] Fill **Full name** (e.g. demo client name)
- [ ] Fill **Email** — use the email your designer will recognize; show hint: *"Clients: use the email your designer has on file"*
- [ ] Fill **Password** (≥8 chars) + **Confirm password**
- [ ] Click **Create account**
- [ ] Land on **`/portal`** — unlinked welcome state

**Unlinked dashboard shots** · `PortalDashboardPage`

- [ ] **"Welcome"** header, **"Client Portal"** subtitle
- [ ] **Current Contracts** empty state: *"No contracts yet"* / *"Your designer will accept your registration…"*
- [ ] Waiting message: *"Your account is waiting to be accepted by your designer…"*
- [ ] Show navbar: Dashboard, Timeline, Choose Style, Sign out
- [ ] *(Optional)* Visit **`/portal/timeline`** — *"Your profile is not linked yet"*
- [ ] **Sign out** (you'll log back in later)

---

## Act 2 — Admin Signs In and Sees the Registration

**URL:** `/login` · `LoginPage`

- [ ] **"Sign in to Client Craft"** / *"Admin studio dashboard"*
- [ ] Enter admin email + password → **Sign in**
- [ ] Land on **`/`** dashboard · `DashboardPage`

**Dashboard — new registration alert**

- [ ] `AdminNotificationBanner`: **"New portal registration"** with client name/email
- [ ] **"View New Registers"** button (badge count on `NewRegistrationsModal`)
- [ ] Summary cards: Clients, Pending Clients, Active Projects, Pending Contracts, Upcoming Deadlines

**Accept the client**

- [ ] Open **New Registrations** modal — title **"New Registrations"**
- [ ] Show row: name, email, *"Registered {date}"*
- [ ] Click **Accept User and Start Contract Draft**
- [ ] Auto-navigate to **`/clients/:id/contract`**

---

## Act 3 — Admin Drafts the Contract (6-Step Wizard)

**URL:** `/clients/:id/contract` · `ContractPage` + `ContractForm`

Show each step tab and fill key fields (don't skip steps — this is core demo content):

### Step 1 — Client Details

- [ ] Client Name, Business Name, Email, Phone, Client Address

### Step 2 — Project Scope

- [ ] **Service Tier** (Launch / Studio / Summit)
- [ ] Project Title, Project Scope, Services Included, Services Not Included
- [ ] Project Deliverables, Start Date, Estimated Completion

### Step 3 — Payment Terms

- [ ] Total Project Cost, Deposit Amount, Remaining Balance
- [ ] Payment Schedule, Accepted Payment Methods, Late Payment Policy

### Step 4 — Revisions & Responsibilities

- [ ] Included Revisions, Extra Revision Fee, Revision Timeline/Limits
- [ ] Client Responsibilities, Preferred Communication, Expected Response Time, Meeting/Call Expectations

### Step 5 — Termination & Signatures

- [ ] Ownership Terms, Portfolio Rights, Termination Conditions
- [ ] Designer Signature (typed), Designer Sign Date

### Step 6 — Review & Generate PDF

- [ ] Review summary (business, project, total/deposit/tier)
- [ ] Click **Generate Contract PDF** → PDF downloads; status → **Generated**
- [ ] Show **Download Again** option

**Along the way:**

- [ ] Click **Save Draft** at least once (status → Draft in Progress)
- [ ] Use **Back** / **Next** between steps

---

## Act 4 — Admin Sends Contract to Client

**Modal:** `SendContractModal`

- [ ] Click **Send Contract to Client**
- [ ] Show mode tabs: **Client portal** | **Email (fallback)**
- [ ] **Portal mode:** read-only client email, explanation about matching portal email
- [ ] Click **Send to client account** → success message
- [ ] Note: contract status → **Sent**, project status → **Contract Sent**

**Quick profile check** · **`/clients/:id`** · `ClientProfilePage`

- [ ] `ClientStatusOverview`: Project / Contract / Payment badges
- [ ] Contract progress stepper: Not started → Draft → Generated → **Sent**
- [ ] `ProjectTimeline`: **Contract Sent** step completed/active
- [ ] `MarkOfficialClientCard`: still **Pending Client** (*"Becomes official after contract is signed"*)

---

## Act 5 — Client Reviews and Signs the Contract

**Switch to client browser profile**

**URL:** `/portal/login` → sign in → **`/portal`**

- [ ] **Current Contracts** table · `PortalCurrentContracts`
- [ ] Columns: Contract, Date sent, Status (**Pending Review**), Actions
- [ ] Click **View** → **`/portal/contracts/:contractId`**

**Contract page** · `PortalContractPage`

- [ ] **Back to Current Contracts** link
- [ ] Header: project title, *"Contract from {business}"*, status badge (**Viewed** on first open)
- [ ] Scroll **Contract summary**: Total, Deposit, Tier
- [ ] Scroll sections: Project scope, Services included/not included, Deliverables, dates, payment schedule, revisions, responsibilities, ownership, portfolio, termination, designer signature

**Signing**

- [ ] **Confirm & sign** card
- [ ] Type full name in **Your full name (electronic signature)**
- [ ] Check: *"I have read and agree to all terms…"*
- [ ] Click **Accept contract**
- [ ] Success card: **"Contract accepted"** + signed date + **Back to dashboard**

**Locked files state (important)** · back on **`/portal`**

- [ ] `PortalProjectFilesSection`: **Project Files** still locked
- [ ] Message: *"File sharing unlocks once your designer starts the project. Sign your contract, open the PayPal invoice link…"*
- [ ] Click **Assistance** → skim `PortalAssistanceModal` project steps

---

## Act 6 — Admin Notified; Sends Deposit Invoice

**Switch back to admin**

- [ ] Dashboard banner: **"Contract signed"** notification · `AdminNotificationBanner`
- [ ] Go to **`/clients/:id`**
- [ ] **Official Client** badge now shown · `MarkOfficialClientCard`: *"Client since {date}"*
- [ ] Timeline: **Contract Signed** complete

**Deposit invoice** · `ClientInvoiceCard`

- [ ] Section **"Deposit Invoice"** — auto-generated on sign
- [ ] Show amount + services description
- [ ] Click **Send Invoice Link** (or **Generate deposit invoice** if not yet created)
- [ ] *(Optional)* **Preview PayPal link**

---

## Act 7 — Client Pays Deposit via PayPal

**Switch to client** · **`/portal`**

- [ ] **Deposit Invoice** section · `PortalInvoiceSection`
- [ ] **"Down payment due"**, amount, issued date
- [ ] Click **Pay with PayPal** (opens PayPal sandbox in new tab)
- [ ] Complete PayPal checkout
- [ ] Return to **`/portal/payment/success`** · `PortalPaymentSuccessPage`
- [ ] **"Confirming payment…"** → **"Payment successful"** → **Back to dashboard**
- [ ] Dashboard shows **"Down payment received"** with amount + date

**Portal timeline (mid-flow)** · **`/portal/timeline`** · `PortalTimelinePage`

- [ ] **Project Timeline**: Contract Sent → Contract Signed → Deposit Invoice Sent → PayPal Link Clicked (and beyond as steps complete)
- [ ] Show step labels, *"Up next"*, completion dates

---

## Act 8 — Admin Confirms Payment and Starts Project

**Switch to admin**

- [ ] Dashboard banner: **payment link clicked** → **View client**
- [ ] **`/clients/:id`** timeline: **PayPal Link Clicked** step
- [ ] Click **Confirm Payment on PayPal** on **Payment Confirmed** step (if shown)
- [ ] Go to **`/clients`** or dashboard `ClientTable`
- [ ] **Start Project** button (requires signed contract + pay link clicked)
- [ ] Click **Start Project** → row shows **Active** badge; project status → In Progress

---

## Act 9 — Bidirectional File Sharing (Core Detail Section)

### Client uploads first

**Switch to client** · **`/portal`**

- [ ] **"Your project is active"** banner with start date
- [ ] **Project Files** section now **unlocked**
- [ ] Read intro: accepted types (PDF, DOC/DOCX, JPG, PNG, SVG, WEBP) + notes explanation
- [ ] Fill **Note for your upload (optional)** — e.g. *"Brand logos and homepage copy"*
- [ ] **Drag and drop** files onto drop zone *(or click **Choose files**)*
- [ ] Show upload progress / file appears in list with *(you)* as uploader
- [ ] Click **Add Note** on a file → type context → **Save note**
- [ ] Click **Download** on a file (sanity check)

### Admin sees client uploads in real time

**Switch to admin** · **`/clients/:id#project-files`** · `ProjectFilesSection`

- [ ] Scroll to **Project Files** — subtitle: *"Client portal uploads appear here in real time"*
- [ ] Client-uploaded files visible with uploader label, date, client notes
- [ ] Click **Download** on client file

### Admin uploads back to client

- [ ] Click **Upload File** (or **Upload first file** if empty)
- [ ] Upload a deliverable (e.g. PDF mockup)
- [ ] Show file in list with admin as uploader

### Client sees admin upload

**Switch to client** · refresh or wait for auto-refresh (~10s)

- [ ] New file from *(designer)* in list
- [ ] **Download** it

### Timeline reflects file activity

- [ ] Admin **`/clients/:id`** timeline: **File Uploads / Notes Added** step with sub-events
- [ ] Client **`/portal/timeline`**: file upload / note added sub-events with filename snippets

---

## Act 10 — Admin Notes, Follow-Ups, and Project Completion

**Admin client profile extras worth a quick pass:**

- [ ] **Add Note** · `AddNoteModal`: category (General, Payment, Contract, Project, Follow-Up) + note text
- [ ] **Send Email** (opens mailto)
- [ ] **Edit Client** · fields: name, business, contact, project status, etc.

**Complete the project**

- [ ] On timeline, click **Mark Project Completed** (on **Project Completed** step)
- [ ] `ClientFinalInvoiceCard` appears: **"Final Invoice"**
- [ ] Click **Send Final Invoice** → **Preview PayPal link** *(optional)*

**Client final payment**

- [ ] **`/portal`**: **Final Invoice** section — **"Final balance due"**
- [ ] **Pay with PayPal** → success page → **"Final balance received"** banner

**Timeline end state**

- [ ] Both sides: all 8 steps complete:

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

## Act 11 — Optional Power-User / Secondary Features

Include if video length allows:

### Clients list management · **`/clients`** · `ClientsPage`

- [ ] Search, filters (Project Status, Contract Status, Payment, Deadlines, Clients vs Pending)
- [ ] Inline **Service Tier** edit · `EditableServiceTierCell` + tier-change confirmation modal
- [ ] Sample client tooltip on hover: *"THIS IS A MOCK USER."*

### Timeline skip (admin-only advanced feature)

- [ ] Hover pending step → tooltip *"Click to skip to this step"*
- [ ] `TimelineSkipModal`: confirm skip + optional note
- [ ] Skip note appears in dashboard **Timeline Updates** feed · `TimelineSkipNotesFeed`

### Contracts overview · **`/contracts`**

- [ ] All clients' contract statuses → **Open Contract**

### Calendar & Scheduler · **`/calendar`**, **`/scheduler`**

- [ ] Deadlines list, urgency labels
- [ ] Weekly grid, **Regenerate Week**, scheduler notes sidebar

### Settings · **`/settings`**

- [ ] App Style theme picker
- [ ] Business Information + Contract Defaults → **Save Settings**

### Admin profile · **`/profile`**

- [ ] Display name, change password, **My clients** table

### Portal polish

- [ ] **Choose Style** — switch theme mid-demo; show it persists
- [ ] Footer: *"Need help? Contact your designer…"*

---

## Suggested Recording Order (Practical)

Record in this order to minimize tab-switching during editing:

1. Admin login + settings snapshot (if opening with studio setup)
2. Client register + unlinked dashboard + sign out
3. Admin: accept registration → full contract wizard → send
4. Client: login → view/sign contract → locked files
5. Admin: send deposit invoice
6. Client: PayPal deposit + payment success + timeline
7. Admin: confirm payment + start project
8. Client: upload files + notes (have files ready)
9. Admin: view/download client files + upload deliverable
10. Client: download admin file + timeline file events
11. Admin: mark complete + send final invoice
12. Client: pay final invoice
13. B-roll: clients list, dashboard notifications, optional skip/settings/calendar

---

## Demo Pitfalls to Avoid on Camera

- Deposit invoice does **not** appear on portal until admin clicks **Send Invoice Link** (auto-generated on sign, not auto-sent)
- **Start Project** stays disabled until contract is signed **and** client clicked the PayPal link
- File sharing stays **locked** until admin starts the project
- PayPal must be in sandbox/test mode or payment steps will fail on recording
- Dashboard/timeline/files **auto-refresh** (3–10s) — pause briefly or narrate "it updates automatically"
- If using seed/sample clients, hover name for mock-user tooltip; don't confuse them with your live demo client

---

## Minimum Viable Demo (If You Need a Shorter Cut)

Must-include beats only:

1. Client registers → admin accepts
2. Contract wizard (at least skim all 6 steps) → generate PDF → send via portal
3. Client signs contract
4. Admin sends deposit invoice → client pays PayPal
5. Admin starts project
6. Client uploads files with note → admin sees + uploads back
7. Admin marks project complete → final invoice → client pays

Everything in Act 11 is optional B-roll.

---

## Quick Reference — Key Routes

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
| Admin | `/settings` | Business & theme settings |
