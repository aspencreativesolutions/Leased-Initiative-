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
cp .env.example .env   # add PayPal sandbox credentials for payments
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

`npm run dev` starts the Vite app **and** the PayPal API server on port 3001.

**PayPal setup:** see [docs/PAYPAL_SETUP.md](docs/PAYPAL_SETUP.md).

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

Data is stored in the browser's localStorage. Sample clients load on first visit.

## Future Ideas

- E-signatures, invoices, payment tracking
- Client portal, maintenance plans
- Task boards, automated email reminders
