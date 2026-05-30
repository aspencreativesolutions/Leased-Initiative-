# PayPal integration guide — Client Craft

Client Craft uses a **small backend API** so your PayPal **Client Secret** never ships to the browser. The React app only receives your public **Client ID** and talks to your server to create and capture orders.

## Architecture

```
Browser (React)                    Your API (Node/Express)           PayPal
     │                                      │                          │
     │  VITE_PAYPAL_CLIENT_ID               │  PAYPAL_CLIENT_SECRET    │
     │  PayPal Buttons SDK                  │  (server .env only)      │
     ├──── POST /api/paypal/create-order ──►├──── OAuth + REST API ────►│
     ├──── POST /api/paypal/capture-order ─►│                          │
     │                                      │◄─── Webhook (optional) ───│
     └──── Updates localStorage client      │                          │
            payment status on success       │                          │
```

Each order stores the **client ID** in PayPal’s `custom_id` field so captures can be tied back to the right client.

---

## 1. Create a PayPal developer app

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. **Apps & Credentials** → **Sandbox** → **Create App**.
3. Copy **Client ID** and **Secret**.

For production, repeat under the **Live** tab and switch `PAYPAL_MODE=live`.

---

## 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Where it lives | Purpose |
|----------|----------------|---------|
| `PAYPAL_CLIENT_ID` | Server + `VITE_PAYPAL_CLIENT_ID` | Public ID (browser + server) |
| `PAYPAL_CLIENT_SECRET` | **Server only** | Never expose to frontend |
| `PAYPAL_MODE` | Server | `sandbox` or `live` |
| `APP_URL` | Server | Return URLs after checkout |
| `PORT` | Server | Default `3001` |
| `PAYPAL_WEBHOOK_ID` | Server (optional) | Verify webhook signatures |

**Security rules:**

- Add `.env` to `.gitignore` (already done).
- Do not prefix secrets with `VITE_` — Vite embeds those in the client bundle.
- In production, host the API on HTTPS and restrict CORS to your real domain.

---

## 3. Run the app with the API

```bash
npm install
npm run dev
```

This starts:

- Vite at `http://localhost:5173`
- PayPal API at `http://localhost:3001`

Vite proxies `/api/*` to the API server so the frontend can call `/api/paypal/...` without CORS issues.

Check health: `http://localhost:3001/api/paypal/health` → `{ "ok": true, "mode": "sandbox" }`.

---

## 4. Official client workflow

1. Set the client’s **contract status** to **Signed** or **Completed**.
2. On their profile, click **Mark as Official Client**.
3. The **PayPal Invoice & Checkout** section appears.
4. Enter amount/description (prefilled from contract if available).
5. Either:
   - **Generate Payment Link** — copy/send the PayPal approve URL, or
   - **Embedded PayPal Checkout** — client pays in the app.

When payment completes:

- `onApprove` captures the order via your API.
- Return URL `/clients/:id/payment/success?token=ORDER_ID` also captures (hosted checkout).
- Client **payment status** updates (`Deposit Paid`, `Partial`, `Paid`).
- A **Payment** note is added automatically.

---

## 5. Webhooks (recommended for production)

PayPal can notify your server when money moves, even if the user closes the browser before your app captures.

1. Developer Dashboard → **Webhooks** → Add webhook URL:  
   `https://your-domain.com/api/paypal/webhook`
2. Subscribe to **Payment capture completed**.
3. Copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`.

The sample handler logs events. For production you should:

- Verify signatures (already implemented when `PAYPAL_WEBHOOK_ID` is set).
- Persist payment events to a database.
- Push updates to the client app (WebSocket, polling, or email).

Because Client Craft stores data in **localStorage**, the webhook alone cannot update the UI — the browser flow (`capture-order` + success page) is the primary sync path unless you add a backend database.

---

## 6. Going live

1. Complete PayPal business verification.
2. Create a **Live** REST app; update `.env` with live credentials.
3. Set `PAYPAL_MODE=live`.
4. Deploy API + frontend over HTTPS.
5. Update `APP_URL` and PayPal app return URLs to your production domain.
6. Register production webhook URL.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “PayPal not configured” | Set `VITE_PAYPAL_CLIENT_ID` in `.env`, restart Vite |
| “API server not running” | Run `npm run dev` or `npm run dev:server` |
| 401 / auth errors | Check sandbox Client ID + Secret match the same app |
| Capture fails after approve | Ensure `create-order` ran on the same server instance (or use webhooks + DB in prod) |
| CORS errors | Use Vite proxy in dev; set `APP_URL` and server CORS in prod |

---

## API reference (local)

### `POST /api/paypal/create-order`

```json
{
  "clientId": "client-local-id",
  "amount": 2500,
  "currency": "USD",
  "description": "Bloom Botanicals — Deposit"
}
```

Response: `{ "orderId": "...", "approvalUrl": "https://..." }`

### `POST /api/paypal/capture-order`

```json
{ "orderId": "PAYPAL_ORDER_ID" }
```

Response: `{ "clientId", "captureId", "amount", "currency", "status" }`
