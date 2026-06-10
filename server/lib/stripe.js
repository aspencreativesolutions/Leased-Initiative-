import Stripe from 'stripe'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const SECRET_KEY = process.env.STRIPE_SECRET_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

const PLACEHOLDER_VALUES = new Set(['', 'sk_test_...', 'sk_test_placeholder'])

let stripeClient = null

function getStripe() {
  if (!isStripeConfigured()) {
    throw new Error(
      'Stripe credentials missing. Set STRIPE_SECRET_KEY in .env (test key from dashboard.stripe.com/test/apikeys).'
    )
  }
  if (!stripeClient) {
    stripeClient = new Stripe(SECRET_KEY)
  }
  return stripeClient
}

export function isStripeConfigured() {
  const key = SECRET_KEY?.trim()
  return Boolean(key && !PLACEHOLDER_VALUES.has(key))
}

export async function createStripeCheckoutSession({
  clientId,
  amount,
  currency = 'USD',
  description,
  invoiceType = 'deposit',
  returnPath = '/portal/payment/success',
  cancelPath = '/portal?payment=cancelled',
}) {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(Number(amount) * 100),
          product_data: {
            name: (description || 'Client Craft Invoice').slice(0, 127),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      clientId,
      invoiceType,
    },
    success_url: `${APP_URL}${returnPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}${cancelPath}`,
  })

  return {
    sessionId: session.id,
    paymentLink: session.url,
  }
}

export function captureFromStripeSession(session) {
  if (session.payment_status !== 'paid') {
    throw new Error('Stripe checkout session is not paid')
  }
  const clientId = session.metadata?.clientId
  if (!clientId) {
    throw new Error('Stripe session missing clientId metadata')
  }
  return {
    clientId,
    amount: (session.amount_total / 100).toFixed(2),
    currency: (session.currency || 'usd').toUpperCase(),
    orderId: session.id,
    captureId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    provider: 'stripe',
    status: 'COMPLETED',
  }
}

export async function retrieveStripeCheckoutSession(sessionId) {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return captureFromStripeSession(session)
}

export function constructStripeWebhookEvent(payload, signature) {
  if (!WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET)
}
