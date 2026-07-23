import crypto from 'crypto'

/** Sample agency always offered on tenant signup (demo / discovery). */
export const SAMPLE_AGENCY_NAME = 'JMC Development'

export const SAMPLE_AGENCY_PROPERTIES = [
  '211 East Main Street, St. Clairsville, OH 43950',
  '70090 Main Street, St. Clairsville, OH 43950',
  '71365 Center Street, St. Clairsville, OH 43950',
]

const INVITE_EXPIRY_DAYS = 30

export function collectPropertyAddresses(store) {
  const addresses = new Set()
  const add = (value) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    // Skip non-address project titles (e.g. "John Smith Project")
    if (!/\d/.test(trimmed)) return
    addresses.add(trimmed)
  }
  for (const property of store.properties ?? []) {
    add(property.address)
  }
  for (const client of store.clients ?? []) {
    add(client.projectName)
  }
  for (const contract of store.contracts ?? []) {
    add(contract.clientAddress)
  }
  add(store.settings?.address)
  return [...addresses].sort((a, b) => a.localeCompare(b))
}

/**
 * Agencies available at tenant signup: live landlord business name + sample JMC.
 * Properties list every known address (availability is not filtered).
 */
export function buildLandlordAgencies(store) {
  const allProperties = collectPropertyAddresses(store)
  const agencies = []
  const seen = new Set()

  const businessName = store.settings?.businessName?.trim()
  if (businessName) {
    seen.add(businessName.toLowerCase())
    agencies.push({
      name: businessName,
      properties: allProperties.length > 0 ? allProperties : [...SAMPLE_AGENCY_PROPERTIES],
    })
  }

  if (!seen.has(SAMPLE_AGENCY_NAME.toLowerCase())) {
    agencies.push({
      name: SAMPLE_AGENCY_NAME,
      properties: [...SAMPLE_AGENCY_PROPERTIES, ...allProperties].filter(
        (address, index, list) => list.indexOf(address) === index
      ),
    })
  }

  return agencies.sort((a, b) => a.name.localeCompare(b.name))
}

export function createTenantInviteToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function buildTenantInviteUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}/register?invite=${encodeURIComponent(token)}`
}

export function createTenantInvite(store, options = {}) {
  const landlordCompany =
    store.settings?.businessName?.trim() || SAMPLE_AGENCY_NAME
  const propertyAddress =
    typeof options.propertyAddress === 'string' && options.propertyAddress.trim()
      ? options.propertyAddress.trim()
      : null
  const token = createTenantInviteToken()
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const invite = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    token,
    landlordCompany,
    propertyAddress,
    source: options.source === 'lease-import' ? 'lease-import' : 'manual',
    clientId: typeof options.clientId === 'string' ? options.clientId : null,
    deliveryMethod: null,
    deliveryDestination: null,
    deliveredAt: null,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt,
    usedAt: null,
    usedByUserId: null,
  }
  return invite
}

/** Clear lease-import invites (and their delivery state) on Admin Mode reseed. */
export function purgeLeaseImportInvites(store) {
  const existing = store.tenantInvites ?? []
  const next = existing.filter((invite) => invite?.source !== 'lease-import')
  if (next.length === existing.length) {
    return { store, changed: false, removed: 0 }
  }
  return {
    store: { ...store, tenantInvites: next },
    changed: true,
    removed: existing.length - next.length,
  }
}

export function markTenantInviteDelivered(store, inviteId, delivery) {
  const invites = store.tenantInvites ?? []
  const method = delivery?.method === 'sms' ? 'sms' : 'email'
  const destination =
    typeof delivery?.destination === 'string' ? delivery.destination.trim() : ''
  const deliveredAt = new Date().toISOString()
  return {
    ...store,
    tenantInvites: invites.map((invite) =>
      invite.id === inviteId
        ? {
            ...invite,
            deliveryMethod: method,
            deliveryDestination: destination || null,
            deliveredAt,
            status: 'pending',
          }
        : invite
    ),
  }
}

export function findValidTenantInvite(store, token) {
  if (!token || typeof token !== 'string') return null
  const invites = store.tenantInvites ?? []
  const invite = invites.find((entry) => entry.token === token)
  if (!invite) return null
  if (invite.usedAt) return null
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return null
  return invite
}

export function markTenantInviteUsed(store, token, userId) {
  const invites = store.tenantInvites ?? []
  return {
    ...store,
    tenantInvites: invites.map((invite) =>
      invite.token === token
        ? {
            ...invite,
            usedAt: new Date().toISOString(),
            usedByUserId: userId,
            status: 'accepted',
          }
        : invite
    ),
  }
}
