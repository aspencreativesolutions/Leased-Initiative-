/** Aspen Creative Solutions work email domain — admins use firstname@aspencreativesolutions.com */
export const WORK_EMAIL_DOMAIN = 'aspencreativesolutions.com'

function firstNameSlug(name) {
  const first = name.trim().split(/\s+/)[0] ?? ''
  return first
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function expectedWorkEmail(name) {
  const local = firstNameSlug(name)
  if (!local) return null
  return `${local}@${WORK_EMAIL_DOMAIN}`
}

export function isWorkEmailDomain(email) {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${WORK_EMAIL_DOMAIN}`)
}

/** True when email is firstname@aspencreativesolutions.com matching the registrant's first name */
export function isWorkAdminEmail(email, name) {
  const expected = expectedWorkEmail(name)
  if (!expected) return false
  return email.trim().toLowerCase() === expected
}
