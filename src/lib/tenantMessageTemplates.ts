/** Tokens and templates for landlord → tenant overdue SMS drafts. */

export interface TenantMessageVars {
  tenantName: string
  address: string
  landlordName: string
}

export interface TenantMessageTemplate {
  id: string
  label: string
  /** Short preview shown on the template chip */
  summary: string
  build: (vars: TenantMessageVars) => string
}

function fill(vars: TenantMessageVars) {
  const tenantName = vars.tenantName.trim() || 'there'
  const address = vars.address.trim() || 'your property'
  const landlordName = vars.landlordName.trim() || 'your landlord'
  return { tenantName, address, landlordName }
}

export const TENANT_MESSAGE_TEMPLATES: TenantMessageTemplate[] = [
  {
    id: 'friendly-reminder',
    label: 'Friendly reminder',
    summary: 'Polite overdue rent nudge',
    build: (vars) => {
      const { tenantName, address, landlordName } = fill(vars)
      return `Hi ${tenantName}, this is ${landlordName}. Just a friendly reminder that rent for ${address} is past due. Please send payment at your earliest convenience. Thank you!`
    },
  },
  {
    id: 'formal-notice',
    label: 'Formal notice',
    summary: 'Clear past-due notice',
    build: (vars) => {
      const { tenantName, address, landlordName } = fill(vars)
      return `Hello ${tenantName}, this is ${landlordName} regarding ${address}. Our records show your rent payment is overdue. Please remit the outstanding balance promptly to avoid further action. Reply to this message if you have questions.`
    },
  },
  {
    id: 'payment-plan',
    label: 'Payment plan',
    summary: 'Offer to work out a plan',
    build: (vars) => {
      const { tenantName, address, landlordName } = fill(vars)
      return `Hi ${tenantName}, this is ${landlordName}. Rent for ${address} is past due. If you need to set up a short payment plan, reply here and we can work something out. Otherwise, please pay as soon as you can.`
    },
  },
]

/** Normalize a phone for sms: links (E.164-ish when possible). */
export function normalizeSmsPhone(phone: string): string | null {
  const raw = phone.trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`
  if (digits.length >= 10) return `+${digits}`
  return null
}

/**
 * Open the device Messages app with a prefilled draft so the conversation
 * (including tenant replies) lives on the landlord’s personal phone.
 */
export function buildSmsComposeHref(phone: string, body: string): string | null {
  const normalized = normalizeSmsPhone(phone)
  if (!normalized) return null
  return `sms:${normalized}?body=${encodeURIComponent(body)}`
}

export function openSmsCompose(phone: string, body: string): boolean {
  const href = buildSmsComposeHref(phone, body)
  if (!href) return false
  window.location.href = href
  return true
}
