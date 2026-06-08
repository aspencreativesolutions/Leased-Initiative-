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

Open [http://localhost:5173](http://localhost:5173). **Admin access:** register at `/register` with your Aspen work email (`firstname@aspencreativesolutions.com`, matching your first name). **Clients:** register at `/portal/register`.

`npm run dev` starts the Vite app **and** the API server on port 3001 (auth, data sync, PayPal).

**PayPal setup:** see [docs/PAYPAL_SETUP.md](docs/PAYPAL_SETUP.md).

**Demo video checklist:** see [docs/DEMO_VIDEO_CHECKLIST.md](docs/DEMO_VIDEO_CHECKLIST.md) — full screen-recording shot list for a ClientCraft walkthrough.

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
3. Click **Send Contract to Client** → **Client portal** (client must register at `/portal/register` with the same email).
4. The client reviews and confirms in their portal; status updates on your admin dashboard.

## Future Ideas

- E-signatures, invoices, payment tracking
- Client portal, maintenance plans
- Task boards, automated email reminders
