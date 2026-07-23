import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_ID = process.env.SQUARE_LOCATION_ID
const WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
const ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const API_VERSION = '2026-05-20'

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_sandbox_location_id',
  'your_webhook_signature_key',
])

const API_BASE =
  ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'

export function isSquareConfigured() {
  const token = ACCESS_TOKEN?.trim()
  const locationId = LOCATION_ID?.trim()
  return Boolean(
    token &&
      locationId &&
      !PLACEHOLDER_VALUES.has(token) &&
      !PLACEHOLDER_VALUES.has(locationId)
  )
}

async function squareFetch(apiPath, options = {}) {
  if (!ACCESS_TOKEN?.trim()) {
    throw new Error(
      'Square credentials missing. Set SQUARE_ACCESS_TOKEN in .env (Sandbox token from developer.squareup.com/apps).'
    )
  }
  const res = await fetch(`${API_BASE}${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': API_VERSION,
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.errors?.[0]?.detail || data.errors?.[0]?.code || JSON.stringify(data)
    throw new Error(detail)
  }
  return data
}

export async function createSquarePaymentLink({
  clientId,
  amount,
  currency = 'USD',
  description,
  invoiceType = 'deposit',
  returnPath = '/portal/payment/success',
}) {
  if (!LOCATION_ID?.trim() || PLACEHOLDER_VALUES.has(LOCATION_ID.trim())) {
    throw new Error(
      'Square location missing. Set SQUARE_LOCATION_ID in .env (Developer Dashboard → your app → Locations).'
    )
  }

  const label = (description || 'Leased Initiative Invoice').slice(0, 255)
  const data = await squareFetch('/v2/online-checkout/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      description: label,
      order: {
        location_id: LOCATION_ID,
        reference_id: clientId.slice(0, 40),
        metadata: {
          clientId,
          invoiceType,
        },
        line_items: [
          {
            name: label,
            quantity: '1',
            base_price_money: {
              amount: Math.round(Number(amount) * 100),
              currency,
            },
          },
        ],
      },
      checkout_options: {
        redirect_url: `${APP_URL}${returnPath}?square=1`,
      },
      payment_note: `Leased Initiative ${invoiceType} for ${clientId}`,
    }),
  })

  const link = data.payment_link
  if (!link?.url) {
    throw new Error('Square did not return a payment link URL')
  }

  return {
    paymentLinkId: link.id,
    orderId: link.order_id,
    paymentLink: link.url,
  }
}

export async function retrieveSquareOrder(orderId) {
  const data = await squareFetch(`/v2/orders/${orderId}`)
  return data.order
}

export async function listPaymentsForOrder(orderId) {
  const data = await squareFetch('/v2/payments/search', {
    method: 'POST',
    body: JSON.stringify({
      query: {
        filter: {
          order_filter: {
            order_id: orderId,
          },
        },
      },
    }),
  })
  return data.payments ?? []
}

export function captureFromSquarePayment(payment, order) {
  if (payment.status !== 'COMPLETED') {
    throw new Error('Square payment is not completed')
  }

  const clientId = order?.metadata?.clientId || order?.reference_id
  if (!clientId) {
    throw new Error('Square order missing clientId metadata')
  }

  const amountMoney = payment.amount_money ?? payment.total_money
  return {
    clientId,
    amount: (Number(amountMoney?.amount ?? 0) / 100).toFixed(2),
    currency: (amountMoney?.currency || 'USD').toUpperCase(),
    orderId: payment.order_id || order?.id,
    captureId: payment.id,
    provider: 'square',
    status: payment.status,
  }
}

export async function verifySquareOrderPayment(orderId) {
  const order = await retrieveSquareOrder(orderId)
  const payments = await listPaymentsForOrder(orderId)
  const completed = payments.find((payment) => payment.status === 'COMPLETED')
  if (!completed) {
    throw new Error('No completed Square payment found for this order yet')
  }
  return captureFromSquarePayment(completed, order)
}

export function verifySquareWebhookSignature(body, signatureHeader, notificationUrl) {
  if (!WEBHOOK_SIGNATURE_KEY || PLACEHOLDER_VALUES.has(WEBHOOK_SIGNATURE_KEY.trim())) {
    throw new Error('SQUARE_WEBHOOK_SIGNATURE_KEY is not set')
  }
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.trim().split('=')
      return [key, value]
    })
  )
  const signature = parts.v1
  if (!signature) return false

  const payload = `${notificationUrl}${body}`
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
    .update(payload)
    .digest('base64')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function getSquareEnvironment() {
  return ENVIRONMENT
}
