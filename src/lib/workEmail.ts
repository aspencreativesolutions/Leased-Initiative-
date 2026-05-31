export const WORK_EMAIL_DOMAIN = 'aspencreativesolutions.com'

function firstNameSlug(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? ''
  return first
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function expectedWorkEmail(name: string) {
  const local = firstNameSlug(name)
  if (!local) return null
  return `${local}@${WORK_EMAIL_DOMAIN}`
}

export function isWorkEmailDomain(email: string) {
  return email.trim().toLowerCase().endsWith(`@${WORK_EMAIL_DOMAIN}`)
}

export function isWorkAdminEmail(email: string, name: string) {
  const expected = expectedWorkEmail(name)
  if (!expected) return false
  return email.trim().toLowerCase() === expected
}
