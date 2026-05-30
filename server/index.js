/**
 * PayPal API server — keeps CLIENT_SECRET off the browser.
 * Run: node server/index.js  (or npm run dev:server)
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const PORT = process.env.PORT || 3001
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const MODE = process.env.PAYPAL_MODE || 'sandbox'
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

const PAYPAL_API =
  MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

/** orderId -> { clientId, amount, currency, description } */
const pendingOrders = new Map()

let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PayPal credentials missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env')
  }
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'PayPal auth failed')
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000
  return cachedToken
}

async function paypalFetch(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.message || data.details?.[0]?.description || JSON.stringify(data)
    throw new Error(msg)
  }
  return data
}

const app = express()
app.use(
  cors({
    origin: [APP_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
)
app.use(express.json())

app.get('/api/paypal/health', (_req, res) => {
  res.json({
    ok: Boolean(CLIENT_ID && CLIENT_SECRET),
    mode: MODE,
    clientIdConfigured: Boolean(CLIENT_ID),
  })
})

app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { clientId, amount, currency = 'USD', description } = req.body
    if (!clientId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'clientId and positive amount are required' })
    }
    const value = Number(amount).toFixed(2)
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: clientId,
            custom_id: clientId,
            description: (description || 'Client Craft Invoice').slice(0, 127),
            amount: {
              currency_code: currency,
              value,
            },
          },
        ],
        application_context: {
          brand_name: 'Client Craft',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${APP_URL}/clients/${clientId}/payment/success`,
          cancel_url: `${APP_URL}/clients/${clientId}?payment=cancelled`,
        },
      }),
    })

    const approvalLink = order.links?.find((l) => l.rel === 'approve')?.href
    pendingOrders.set(order.id, {
      clientId,
      amount: value,
      currency,
      description: description || '',
    })

    res.json({
      orderId: order.id,
      approvalUrl: approvalLink,
    })
  } catch (err) {
    console.error('create-order', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })

    const capture = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
    })

    const unit = capture.purchase_units?.[0]
    const clientId = unit?.payments?.captures?.[0]?.custom_id || unit?.custom_id || pendingOrders.get(orderId)?.clientId
    const payment = unit?.payments?.captures?.[0]
    const meta = pendingOrders.get(orderId)

    pendingOrders.delete(orderId)

    res.json({
      orderId: capture.id,
      captureId: payment?.id,
      clientId,
      amount: payment?.amount?.value || meta?.amount,
      currency: payment?.amount?.currency_code || meta?.currency || 'USD',
      status: capture.status,
    })
  } catch (err) {
    console.error('capture-order', err)
    res.status(500).json({ error: err.message })
  }
})

/** PayPal sends webhook events when payments complete (backup to onApprove) */
app.post('/api/paypal/webhook', async (req, res) => {
  try {
    if (!WEBHOOK_ID) {
      console.warn('PAYPAL_WEBHOOK_ID not set — webhook received but verification skipped in dev')
      return res.sendStatus(200)
    }

    const verified = await verifyWebhook(req)
    if (!verified) return res.sendStatus(401)

    const event = req.body
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource
      const clientId = capture?.custom_id
      console.log('Webhook: payment completed for client', clientId, capture?.id)
    }
    res.sendStatus(200)
  } catch (err) {
    console.error('webhook', err)
    res.sendStatus(500)
  }
})

async function verifyWebhook(req) {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: req.headers['paypal-auth-algo'],
      cert_url: req.headers['paypal-cert-url'],
      transmission_id: req.headers['paypal-transmission-id'],
      transmission_sig: req.headers['paypal-transmission-sig'],
      transmission_time: req.headers['paypal-transmission-time'],
      webhook_id: WEBHOOK_ID,
      webhook_event: req.body,
    }),
  })
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}

app.listen(PORT, () => {
  console.log(`Client Craft API → http://localhost:${PORT}`)
  console.log(`PayPal mode: ${MODE}`, CLIENT_ID ? '(credentials loaded)' : '(missing credentials)')
})
