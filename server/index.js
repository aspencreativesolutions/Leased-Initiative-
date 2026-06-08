/**
 * Client Craft API server — auth, data sync, PayPal, and client portal.
 * Run: node server/index.js  (or npm run dev:server)
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'
import contractRoutes from './routes/contracts.js'
import portalRoutes from './routes/portal.js'
import filesRoutes from './routes/files.js'
import invoiceRoutes from './routes/invoices.js'
import {
  createPayPalOrder,
  capturePayPalOrder,
  isPayPalConfigured,
  getPayPalAccessToken,
  getPayPalApiBase,
} from './lib/paypal.js'
import { updateStore } from './db.js'
import { applyPaymentToStore } from './lib/payments.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const PORT = process.env.PORT || 3001
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const MODE = process.env.PAYPAL_MODE || 'sandbox'

const app = express()
app.use(
  cors({
    origin: [APP_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/portal', portalRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/invoices', invoiceRoutes)

app.get('/api/paypal/health', (_req, res) => {
  res.json({
    ok: isPayPalConfigured(),
    mode: MODE,
    clientIdConfigured: isPayPalConfigured(),
  })
})

app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { clientId, amount, currency = 'USD', description, returnPath, cancelPath } =
      req.body
    if (!clientId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'clientId and positive amount are required' })
    }
    const order = await createPayPalOrder({
      clientId,
      amount,
      currency,
      description,
      returnPath: returnPath ?? `/clients/${clientId}/payment/success`,
      cancelPath: cancelPath ?? `/clients/${clientId}?payment=cancelled`,
    })
    res.json({
      orderId: order.orderId,
      approvalUrl: order.approvalUrl,
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

    const result = await capturePayPalOrder(orderId)

    if (result.clientId) {
      updateStore((s) => applyPaymentToStore(s, result.clientId, result))
    }

    res.json(result)
  } catch (err) {
    console.error('capture-order', err)
    res.status(500).json({ error: err.message })
  }
})

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
  const token = await getPayPalAccessToken()
  const res = await fetch(`${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`, {
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
  console.log(
    `PayPal mode: ${MODE}`,
    isPayPalConfigured() ? '(credentials loaded)' : '(missing credentials)'
  )
})
