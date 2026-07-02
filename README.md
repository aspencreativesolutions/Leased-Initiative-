# Client Craft

A clean, modern client management web app for freelance web designers and developers. Manage clients, projects, contracts, deadlines, and notes in one place.

## Features

- **Dashboard** — Summary metrics, client overview table, upcoming deadlines
- **Client profiles** — Contact info, project/contract/payment status, notes, deadlines
- **Add clients** — Simple modal form
- **Contracts** — Multi-step contract builder with PDF generation and email flow
- **Calendar** — All deadlines and follow-ups in one view
- **Settings** — Business info used in generated contracts
- **Official clients** — Mark signed-contract clients as official; unlocks PayPal
- **PayPal payments** — Payment links + embedded checkout (requires API server)
- **Client portal** — Clients register, review contracts, and confirm electronically
- **Secure auth** — Admin studio login + separate client accounts with role-based access
- **Search & filters** — Find clients by status, payment, deadlines, and official status

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

Open [http://localhost:5173](http://localhost:5173). **Clients:** sign up or sign in at `/register` and `/login`. **Aspen team:** use `/studio/register` and `/studio/login` with your work email (`firstname@aspencreativesolutions.com`).

`npm run dev` starts the Vite app **and** the API server on port 3001 (auth, data sync, PayPal).

### Merged with portfolio site

The Aspen Creative marketing site lives in `portfolio/`. Run everything together:

```bash
npm run dev:all
```

Open [http://localhost:3010](http://localhost:3010) — portfolio at `/`, Client Craft studio at `/studio`, client portal at `/portal` and `/login`. Set `APP_URL=http://localhost:3010` in `.env` when using the merged site (payment redirects and email links).

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
