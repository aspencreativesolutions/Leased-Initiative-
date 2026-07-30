/**
 * Guided Zelle helpers — no merchant API; destination handle lives on BusinessSettings.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** US phone: 10 digits, optional leading 1 / formatting */
const PHONE_DIGITS_RE = /^1?(\d{10})$/

export function normalizeZelleHandle(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase()
  }
  const digits = trimmed.replace(/\D/g, '')
  const match = digits.match(PHONE_DIGITS_RE)
  if (!match) return trimmed
  const ten = match[1]
  return `+1 (${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

export function isValidZelleHandle(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return false
  if (trimmed.includes('@')) return EMAIL_RE.test(trimmed.toLowerCase())
  const digits = trimmed.replace(/\D/g, '')
  return PHONE_DIGITS_RE.test(digits)
}

export function isZelleConfigured(settings) {
  return isValidZelleHandle(settings?.zelleHandle)
}

export function getZelleHandle(settings) {
  if (!isZelleConfigured(settings)) return null
  return normalizeZelleHandle(settings.zelleHandle)
}

export function buildZelleMemo({ clientId, invoiceType = 'rent', dueDate }) {
  const short = String(clientId ?? 'tenant')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase() || 'TENANT'
  const typeCode =
    invoiceType === 'deposit' ? 'DEP' : invoiceType === 'final' ? 'BAL' : 'RENT'
  const period = dueDate
    ? String(dueDate).slice(0, 7).replace('-', '')
    : new Date().toISOString().slice(0, 7).replace('-', '')
  return `LS-${short}-${typeCode}-${period}`
}

export function zellePortalPayPath(invoiceType = 'rent') {
  const type =
    invoiceType === 'deposit' || invoiceType === 'final' ? invoiceType : 'rent'
  return `/portal/pay/zelle/${type}`
}

export function zellePaymentLink(invoiceType = 'rent') {
  const base = (process.env.APP_URL || 'http://localhost:3021').replace(/\/$/, '')
  return `${base}${zellePortalPayPath(invoiceType)}`
}
