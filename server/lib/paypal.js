import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const MODE = process.env.PAYPAL_MODE || 'sandbox'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

const PAYPAL_API =
  MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

let cachedToken = null
let tokenExpiresAt = 0

/** orderId -> { clientId, amount, currency, description } */
const pendingOrders = new Map()

const PLACEHOLDER_VALUES = new Set([
  'your_sandbox_client_id',
  'your_sandbox_client_secret',
  '',
])

export function isPayPalConfigured() {
  return Boolean(
    CLIENT_ID &&
      CLIENT_SECRET &&
      !PLACEHOLDER_VALUES.has(CLIENT_ID.trim()) &&
      !PLACEHOLDER_VALUES.has(CLIENT_SECRET.trim())
  )
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'PayPal credentials missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env'
    )
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

async function paypalFetch(apiPath, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API}${apiPath}`, {
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

export async function createPayPalOrder({
  clientId,
  amount,
  currency = 'USD',
  description,
  returnPath = `/portal/payment/success`,
  cancelPath = '/portal?payment=cancelled',
}) {
  const value = Number(amount).toFixed(2)
  const order = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: clientId,
          custom_id: clientId,
          description: (description || 'Leased Invoice').slice(0, 127),
          amount: {
            currency_code: currency,
            value,
          },
        },
      ],
      application_context: {
        brand_name: 'Leased',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${APP_URL}${returnPath}`,
        cancel_url: `${APP_URL}${cancelPath}`,
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

  return {
    orderId: order.id,
    approvalUrl: approvalLink,
  }
}

export function getPayPalApiBase() {
  return PAYPAL_API
}

export async function getPayPalAccessToken() {
  return getAccessToken()
}

export async function capturePayPalOrder(orderId) {
  const capture = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
  })

  const unit = capture.purchase_units?.[0]
  const clientId =
    unit?.payments?.captures?.[0]?.custom_id ||
    unit?.custom_id ||
    pendingOrders.get(orderId)?.clientId
  const payment = unit?.payments?.captures?.[0]
  const meta = pendingOrders.get(orderId)

  pendingOrders.delete(orderId)

  return {
    orderId: capture.id,
    captureId: payment?.id,
    clientId,
    amount: payment?.amount?.value || meta?.amount,
    currency: payment?.amount?.currency_code || meta?.currency || 'USD',
    status: capture.status,
  }
}
