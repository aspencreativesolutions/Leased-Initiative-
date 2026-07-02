/**
 * Client Craft API server — auth, data sync, PayPal, Stripe, and client portal.
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
import e2eRoutes from './routes/e2e.js'
import {
  createPayPalOrder,
  capturePayPalOrder,
  isPayPalConfigured,
  getPayPalAccessToken,
  getPayPalApiBase,
} from './lib/paypal.js'
import {
  isStripeConfigured,
  retrieveStripeCheckoutSession,
  constructStripeWebhookEvent,
} from './lib/stripe.js'
import {
  isSquareConfigured,
  verifySquareOrderPayment,
  captureFromSquarePayment,
  verifySquareWebhookSignature,
  retrieveSquareOrder,
  getSquareEnvironment,
} from './lib/square.js'
import { readStore, updateStore, writeStore } from './db.js'
import { ensureSamplePortalUsers } from './lib/samplePortalUsers.js'
import { ensureSampleClientContracts } from './lib/sampleClientContracts.js'
import { applyPaymentToStore } from './lib/payments.js'
import { isEmailConfigured, verifySmtpConnection } from './lib/email.js'
import { startAutomationScheduler } from './lib/clientAutomation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const PORT = process.env.PORT || 3001
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const MODE = process.env.PAYPAL_MODE || 'sandbox'

const app = express()
app.use(
  cors({
    origin: [
      APP_URL,
      'http://localhost:3010',
      'http://127.0.0.1:3010',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  })
)

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature']
    if (!signature) return res.sendStatus(400)

    const event = constructStripeWebhookEvent(req.body, signature)
    if (event.type === 'checkout.session.completed') {
      const capture = await retrieveStripeCheckoutSession(event.data.object.id)
      if (capture.clientId) {
        updateStore((s) => applyPaymentToStore(s, capture.clientId, capture))
      }
    }
    res.sendStatus(200)
  } catch (err) {
    console.error('stripe webhook', err)
    res.sendStatus(400)
  }
})

app.post('/api/square/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-square-hmacsha256-signature']
    const webhookKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    const body = req.body.toString()
    const webhookBase =
      process.env.WEBHOOK_BASE_URL?.replace(/\/$/, '') ||
      process.env.APP_URL?.replace(/\/$/, '') ||
      `http://localhost:${PORT}`
    const notificationUrl = `${webhookBase}/api/square/webhook`

    if (webhookKey && webhookKey !== 'your_webhook_signature_key') {
      const verified = verifySquareWebhookSignature(body, signature, notificationUrl)
      if (!verified) return res.sendStatus(401)
    } else {
      console.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not set — webhook verification skipped in dev')
    }

    const event = JSON.parse(body)
    if (event.type === 'payment.updated') {
      const payment = event.data?.object?.payment
      if (payment?.status === 'COMPLETED' && payment.order_id) {
        const order = await retrieveSquareOrder(payment.order_id)
        const capture = captureFromSquarePayment(payment, order)
        if (capture.clientId) {
          updateStore((s) => applyPaymentToStore(s, capture.clientId, capture))
        }
      }
    }
    res.sendStatus(200)
  } catch (err) {
    console.error('square webhook', err)
    res.sendStatus(400)
  }
})

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/smtp/health', async (_req, res) => {
  const configured = isEmailConfigured()
  if (!configured) {
    return res.json({ ok: false, configured: false, error: 'SMTP not configured in .env' })
  }
  const result = await verifySmtpConnection()
  res.json({ configured: true, ...result })
})

app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/portal', portalRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/invoices', invoiceRoutes)
if (process.env.E2E_TEST === '1') {
  app.use('/api/e2e', e2eRoutes)
}

app.get('/api/paypal/health', (_req, res) => {
  res.json({
    ok: isPayPalConfigured(),
    mode: MODE,
    clientIdConfigured: isPayPalConfigured(),
  })
})

app.get('/api/stripe/health', (_req, res) => {
  res.json({
    ok: isStripeConfigured(),
    mode: process.env.STRIPE_MODE || 'test',
  })
})

app.get('/api/square/health', (_req, res) => {
  res.json({
    ok: isSquareConfigured(),
    mode: getSquareEnvironment(),
    locationConfigured: Boolean(process.env.SQUARE_LOCATION_ID?.trim()),
  })
})

app.post('/api/square/verify-order', async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })

    const result = await verifySquareOrderPayment(orderId)
    if (result.clientId) {
      updateStore((s) => applyPaymentToStore(s, result.clientId, result))
    }
    res.json(result)
  } catch (err) {
    console.error('square verify-order', err)
    res.status(500).json({ error: err.message })
  }
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
      returnPath: returnPath ?? `/studio/clients/${clientId}/payment/success`,
      cancelPath: cancelPath ?? `/studio/clients/${clientId}?payment=cancelled`,
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
      updateStore((s) => applyPaymentToStore(s, result.clientId, { ...result, provider: 'paypal' }))
    }

    res.json(result)
  } catch (err) {
    console.error('capture-order', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/stripe/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

    const result = await retrieveStripeCheckoutSession(sessionId)

    if (result.clientId) {
      updateStore((s) => applyPaymentToStore(s, result.clientId, result))
    }

    res.json(result)
  } catch (err) {
    console.error('verify-session', err)
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

async function bootstrapSamplePortalUsers() {
  try {
    let store = readStore()
    const portalResult = await ensureSamplePortalUsers(store)
    if (portalResult.changed) {
      store = portalResult.store
    }

    const contractResult = ensureSampleClientContracts(store)
    if (contractResult.changed) {
      store = contractResult.store
    }

    if (portalResult.changed || contractResult.changed) {
      writeStore(store)
    }

    if (portalResult.createdUsers > 0 || portalResult.restoredClients > 0) {
      console.log(
        `Sample portal users: ${portalResult.createdUsers} account(s) created` +
          (portalResult.restoredClients > 0 ? `, ${portalResult.restoredClients} mock client(s) restored` : '') +
          '. Demo password → same as email'
      )
    }
    if (contractResult.created > 0 || contractResult.repaired > 0) {
      console.log(
        `Sample client contracts: ${contractResult.created} created, ${contractResult.repaired ?? 0} repaired for portal sync.`
      )
    }
  } catch (err) {
    console.error('sample portal user bootstrap', err)
  }
}

app.listen(PORT, async () => {
  if (process.env.E2E_TEST !== '1') {
    await bootstrapSamplePortalUsers()
  }
  startAutomationScheduler()
  console.log(`Client Craft API → http://localhost:${PORT}`)
  console.log(
    `PayPal mode: ${MODE}`,
    isPayPalConfigured() ? '(credentials loaded)' : '(missing credentials)'
  )
  console.log(
    `Stripe mode: ${process.env.STRIPE_MODE || 'test'}`,
    isStripeConfigured() ? '(credentials loaded)' : '(missing credentials)'
  )
  console.log(
    `Square mode: ${getSquareEnvironment()}`,
    isSquareConfigured() ? '(credentials loaded)' : '(missing credentials)'
  )
})
