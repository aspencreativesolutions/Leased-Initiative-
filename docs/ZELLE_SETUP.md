# Zelle setup (guided bank transfer)

Zelle does **not** provide a public merchant checkout API (no hosted payment links, webhooks, or app-initiated recurring pulls). Leased Initiative supports Zelle as a **guided P2P rail**:

1. Landlord enrolls an email or US mobile number with Zelle through their bank.
2. In **Company Profile → Receive Zelle**, enter that handle twice to confirm and save.
3. Set a lease’s **Invoice Provider** to Zelle (or accept a tenant who preferred Zelle at registration).
4. Deposit / rent / final invoices get a **portal pay page** link (`/portal/pay/zelle/...`) with amount, memo, and copy buttons.
5. Tenant pays in their bank app, then taps **I sent the payment**.
6. Landlord confirms funds in **Payments** / Official Tenants (same confirm flow as manual PayPal verify).

## Automatic vs manual

- **Manual:** due-date reminders include the Zelle pay link; tenant pays each month.
- **Automatic:** tenant completes an in-app checklist to schedule recurring Zelle in their **bank app** (authorization of intent only — the app cannot pull funds).

## Security notes

- The Zelle handle is stored on business settings, not in `.env`.
- It is shown only on authenticated portal pay pages and landlord previews — never on public invite pages.
- Status updates when the tenant marks paid and the landlord confirms (not via Zelle webhooks).
