/**
 * Optional Twilio SMS. Without credentials, logs the message (dev / demo mode).
 *
 * Env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER  (E.164, e.g. +15551234567)
 */

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (String(phone).trim().startsWith('+') && digits.length >= 10) {
    return `+${digits}`
  }
  return null
}

export function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim()
  )
}

export function buildOverdueRentSms({ name, amountLabel, overdueCount, businessName }) {
  const who = name?.trim() || 'there'
  const landlord = businessName?.trim() || 'your landlord'
  const countPart =
    overdueCount > 1
      ? `${overdueCount} rent payments are overdue`
      : 'your rent payment is overdue'
  const amountPart = amountLabel ? ` (${amountLabel})` : ''
  return `Hi ${who}, this is an automated reminder from ${landlord}: ${countPart}${amountPart}. Please pay as soon as possible. Reply STOP to opt out.`
}

/**
 * @returns {{ sent: boolean, devMode?: boolean, to?: string, body?: string, sid?: string, error?: string }}
 */
export async function sendSms({ to, body }) {
  const normalized = normalizePhone(to)
  if (!normalized) {
    return { sent: false, error: 'Tenant phone number is missing or invalid.' }
  }

  if (!isSmsConfigured()) {
    console.log('[dev] SMS not configured — overdue ping would send:')
    console.log(`  To: ${normalized}`)
    console.log(`  Body: ${body}`)
    return { sent: true, devMode: true, to: normalized, body }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID.trim()
  const token = process.env.TWILIO_AUTH_TOKEN.trim()
  const from = process.env.TWILIO_FROM_NUMBER.trim()
  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const params = new URLSearchParams({ To: normalized, From: from, Body: body })

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = data.message || data.error_message || res.statusText || 'SMS failed'
      console.error('Twilio SMS failed:', message)
      return { sent: false, error: message, to: normalized, body }
    }
    return { sent: true, to: normalized, body, sid: data.sid }
  } catch (err) {
    console.error('Twilio SMS error:', err.message)
    return { sent: false, error: err.message || 'SMS failed', to: normalized, body }
  }
}

export async function sendOverdueRentSms({
  phone,
  name,
  amountLabel,
  overdueCount,
  businessName,
}) {
  const body = buildOverdueRentSms({ name, amountLabel, overdueCount, businessName })
  return sendSms({ to: phone, body })
}
