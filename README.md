# Leased Initiative

Lease management for landlords and tenants. Approve tenant sign-ups, send lease contracts, and activate tenants once they sign.

## Features

- **Role selection** — Tenants and landlords enter through dedicated sign-in paths
- **Dashboard** — Summary metrics, tenant overview, upcoming deadlines
- **Tenant profiles** — Contact info, lease/payment status, notes, deadlines
- **Lease contracts** — Multi-step contract builder with PDF generation and email flow
- **Calendar** — All deadlines and follow-ups in one view
- **Settings** — Business info used in generated contracts
- **Active tenants** — Tenants become active after signing their lease
- **PayPal payments** — Payment links + embedded checkout (requires API server)
- **Tenant portal** — Tenants register, await landlord approval, review leases, and sign
- **Secure auth** — Landlord and tenant accounts with role-based access
- **Search & filters** — Find tenants by status, payment, deadlines, and active status

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- jsPDF for contract PDFs
- LocalStorage for data persistence

## Getting Started

```bash
npm install
cp .env.example .env   # set JWT_SECRET and PayPal credentials
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Choose **I'm a Tenant** or **I'm a Landlord** on the home screen. Both roles sign up with a standard email address.

`npm run dev` starts the Vite app **and** the API server on port 3001 (auth, data sync, PayPal).

### Merged with portfolio site

A marketing site lives in `portfolio/`. Run everything together:

```bash
npm run dev:all
```

Open [http://localhost:3010](http://localhost:3010) — portfolio at `/`, landlord portal at `/studio`, tenant portal at `/portal` and `/login`. Set `APP_URL=http://localhost:3010` in `.env` when using the merged site (payment redirects and email links).

**PayPal setup:** see [docs/PAYPAL_SETUP.md](docs/PAYPAL_SETUP.md).

**E2E test plan:** see [docs/E2E_TEST_PLAN.md](docs/E2E_TEST_PLAN.md) — full manual walkthrough, demo recording checklist, and QA reference.

**Automated E2E (Playwright):**

```bash
npm run test:e2e:install   # first time only — downloads Chromium
npm run test:e2e           # runs 11 serial lifecycle tests (~30s)
```

**Use on your Mac (Dock, no App Store):** see [docs/DESKTOP-APP.md](docs/DESKTOP-APP.md) — run `npm run desktop`.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  components/     # Reusable UI, layout, feature components
  context/        # App state & localStorage
  data/           # Seed data
  lib/            # PDF, storage, utilities
  pages/          # Route pages
  types/          # TypeScript types
```

Data is stored server-side in `server/data/store.json` when signed in as admin. The browser keeps a local cache; existing localStorage data migrates automatically on first admin login.

## Client portal & contracts

1. Add a client in the studio with their email.
2. Build the contract and generate the PDF.
3. Click **Send Contract to Client** → **Client portal** (client must register at `/register` with the same email).
4. The client reviews and confirms in their portal; status updates on your admin dashboard.

## Future Ideas

- E-signatures, invoices, payment tracking
- Client portal, maintenance plans
- Task boards, automated email reminders
