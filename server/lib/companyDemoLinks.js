import crypto from 'crypto'

const DEFAULT_EXPIRY_DAYS = 14

export function getCompanyDemoLinkExpiryDays() {
  const raw = process.env.COMPANY_DEMO_LINK_EXPIRY_DAYS
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 365) return parsed
  return DEFAULT_EXPIRY_DAYS
}

export function normalizeCompanyName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function companyNamesMatch(a, b) {
  return normalizeCompanyName(a).toLowerCase() === normalizeCompanyName(b).toLowerCase()
}

export function createCompanyDemoLinkToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function buildCompanyDemoLinkUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:3021'
  return `${base.replace(/\/$/, '')}/demo/company/${encodeURIComponent(token)}`
}

export function isCompanyDemoLinkExpired(link, now = new Date()) {
  if (!link?.expiresAt) return true
  return new Date(link.expiresAt) < now
}

export function findValidCompanyDemoLink(store, token) {
  if (!token || typeof token !== 'string') return null
  const links = store.companyDemoLinks ?? []
  const link = links.find((entry) => entry.token === token)
  if (!link) return null
  if (isCompanyDemoLinkExpired(link)) return null
  return link
}

/**
 * Create (or replace) a unique demo access link for a company.
 * One active link per company name — regenerating invalidates the previous token.
 */
export function createCompanyDemoLink(store, companyNameInput) {
  const companyName = normalizeCompanyName(companyNameInput)
  if (!companyName) {
    return { error: 'Enter a company name' }
  }
  if (companyName.length < 2 || companyName.length > 120) {
    return { error: 'Company name must be between 2 and 120 characters' }
  }

  const now = new Date()
  const expiryDays = getCompanyDemoLinkExpiryDays()
  const expiresAt = new Date(
    now.getTime() + expiryDays * 24 * 60 * 60 * 1000
  ).toISOString()
  const token = createCompanyDemoLinkToken()
  const link = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    token,
    companyName,
    createdAt: now.toISOString(),
    expiresAt,
  }

  const previous = (store.companyDemoLinks ?? []).filter(
    (entry) => !companyNamesMatch(entry.companyName, companyName)
  )

  return {
    link,
    url: buildCompanyDemoLinkUrl(token),
    expiryDays,
    store: {
      ...store,
      companyDemoLinks: [...previous, link],
    },
  }
}

/** Active (non-expired) company demo links, newest first. */
export function listActiveCompanyDemoLinks(store, now = new Date()) {
  return (store.companyDemoLinks ?? [])
    .filter((link) => !isCompanyDemoLinkExpired(link, now))
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

/** Distinct company names from prior links — for admin select suggestions. */
export function listKnownCompanyDemoNames(store) {
  const seen = new Set()
  const names = []
  for (const link of store.companyDemoLinks ?? []) {
    const name = normalizeCompanyName(link.companyName)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names.sort((a, b) => a.localeCompare(b))
}
