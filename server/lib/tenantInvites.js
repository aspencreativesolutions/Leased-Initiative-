import crypto from 'crypto'
import {
  addressesMatch,
  availableApplicantSlotsAtAddress,
  availablePropertyAddresses,
} from './rentalOccupancy.js'
import {
  buildFurnishedPlacementInventory,
  serializePlacementInventory,
} from './furnishedOccupancy.js'
import {
  isFutureLeaseStartDate,
  isLeaseLengthMonths,
  isPlainYmd,
  parseLeaseLengthMonths,
} from './leaseSchedule.js'

/** Sample agency always offered on tenant signup (demo / discovery). */
export const SAMPLE_AGENCY_NAME = 'JMC Development'

export const SAMPLE_AGENCY_PROPERTIES = [
  '211 East Main Street, St. Clairsville, OH 43950',
  '70090 Main Street, St. Clairsville, OH 43950',
  '71365 Center Street, St. Clairsville, OH 43950',
]

const INVITE_EXPIRY_DAYS = 30
const CUSTOM_CODE_MIN = 4
const CUSTOM_CODE_MAX = 24

export function getTenantDiscoveryMode(store) {
  const mode = store?.settings?.tenantDiscoveryMode
  return mode === 'invite_only' ? 'invite_only' : 'public'
}

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
    if (property?.offMarket === true) continue
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
 * Occupancy snapshot for a rental address (from landlord maxTenants metadata).
 * Sample / unlisted addresses get a demo-friendly default capacity.
 */
export function propertyOccupancyDetail(store, address) {
  const trimmed = String(address ?? '').trim()
  if (!trimmed) {
    return {
      address: '',
      maxTenants: 0,
      availableSpots: 0,
      occupied: 0,
      furnished: false,
      monthlyRent: null,
      costPerPersonAtMax: null,
      depositAmount: null,
      pricingStructure: null,
      utilitiesIncluded: false,
      entireHomeOnly: false,
      placementInventory: null,
    }
  }
  const { property, slots } = availableApplicantSlotsAtAddress(store, trimmed)
  if (property) {
    const maxTenants = Math.max(1, Number(property.maxTenants) || 1)
    const availableSpots = Math.max(0, slots)
    const monthlyRent =
      Number.isFinite(Number(property.monthlyRent)) && Number(property.monthlyRent) > 0
        ? Math.round(Number(property.monthlyRent))
        : null
    const depositAmount =
      Number.isFinite(Number(property.depositAmount)) && Number(property.depositAmount) > 0
        ? Math.round(Number(property.depositAmount))
        : null
    const furnished = property.furnished === true
    const utilitiesIncluded = property.utilitiesIncluded === true
    const entireHomeOnly = property.entireHomeOnly === true
    const occupants = (store.clients ?? []).filter(
      (client) =>
        client?.isOfficialClient &&
        addressesMatch(client.projectName, property.address ?? trimmed)
    )
    const inventory = furnished
      ? buildFurnishedPlacementInventory(property, occupants)
      : null
    const occupiedPeople = occupants.length
    return {
      address: property.address?.trim() || trimmed,
      maxTenants,
      availableSpots,
      occupied: occupiedPeople,
      furnished,
      monthlyRent,
      costPerPersonAtMax:
        monthlyRent != null ? Math.round((monthlyRent / maxTenants) * 100) / 100 : null,
      depositAmount,
      pricingStructure: property.pricingStructure ?? (furnished ? 'bed' : 'person'),
      utilitiesIncluded,
      entireHomeOnly,
      placementInventory: inventory ? serializePlacementInventory(inventory) : null,
    }
  }
  return {
    address: trimmed,
    maxTenants: 4,
    availableSpots: 4,
    occupied: 0,
    furnished: false,
    monthlyRent: null,
    costPerPersonAtMax: null,
    depositAmount: null,
    pricingStructure: 'person',
    utilitiesIncluded: false,
    entireHomeOnly: false,
    placementInventory: null,
  }
}

function withPropertyDetails(store, addresses) {
  return addresses.map((address) => propertyOccupancyDetail(store, address))
}

/**
 * Agencies available at tenant signup.
 * Invite-only landlords are omitted from the public discovery list.
 * When `availableOnly` is true, property lists are filtered to units with open capacity.
 */
export function buildLandlordAgencies(store, options = {}) {
  const forPublicDiscovery = options.forPublicDiscovery !== false
  const availableOnly = options.availableOnly === true
  const allProperties = availableOnly
    ? availablePropertyAddresses(store)
    : collectPropertyAddresses(store)
  const agencies = []
  const seen = new Set()

  const businessName = store.settings?.businessName?.trim()
  const discoveryMode = getTenantDiscoveryMode(store)
  if (businessName && !(forPublicDiscovery && discoveryMode === 'invite_only')) {
    seen.add(businessName.toLowerCase())
    const properties =
      allProperties.length > 0 ? allProperties : [...SAMPLE_AGENCY_PROPERTIES]
    agencies.push({
      name: businessName,
      properties,
      propertyDetails: withPropertyDetails(store, properties),
      discoveryMode,
    })
  }

  if (!seen.has(SAMPLE_AGENCY_NAME.toLowerCase())) {
    const properties = [...SAMPLE_AGENCY_PROPERTIES, ...allProperties].filter(
      (address, index, list) => list.indexOf(address) === index
    )
    agencies.push({
      name: SAMPLE_AGENCY_NAME,
      properties,
      propertyDetails: withPropertyDetails(store, properties),
      discoveryMode: 'public',
    })
  }

  return agencies.sort((a, b) => a.name.localeCompare(b.name))
}

/** Agency payload for an invite (includes vacant-only properties when invite-only). */
export function buildAgencyForInvite(store, invite) {
  const company = invite?.landlordCompany?.trim()
  if (!company) return null
  const discoveryMode = getTenantDiscoveryMode(store)
  const availableOnly = discoveryMode === 'invite_only'
  const properties = availableOnly
    ? availablePropertyAddresses(store)
    : collectPropertyAddresses(store)

  if (invite.propertyAddress) {
    const locked = invite.propertyAddress.trim()
    const list = locked ? [locked] : []
    return {
      name: company,
      properties: list,
      propertyDetails: withPropertyDetails(store, list),
      discoveryMode,
    }
  }

  const list = properties.length > 0 ? properties : [...SAMPLE_AGENCY_PROPERTIES]
  return {
    name: company,
    properties: list,
    propertyDetails: withPropertyDetails(store, list),
    discoveryMode,
  }
}

export function createTenantInviteToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function normalizeConnectionCode(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function isValidCustomConnectionCode(code) {
  const normalized = normalizeConnectionCode(code)
  if (normalized.length < CUSTOM_CODE_MIN || normalized.length > CUSTOM_CODE_MAX) {
    return false
  }
  return /^[A-Z0-9-]+$/.test(normalized)
}

export function connectionCodeTaken(store, code, exceptInviteId = null) {
  const normalized = normalizeConnectionCode(code)
  if (!normalized) return false
  return (store.tenantInvites ?? []).some((invite) => {
    if (exceptInviteId && invite.id === exceptInviteId) return false
    if (invite.usedAt) return false
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return false
    return normalizeConnectionCode(invite.connectionCode) === normalized
  })
}

export function createConnectionCode(store) {
  const existing = new Set(
    (store.tenantInvites ?? [])
      .map((invite) => normalizeConnectionCode(invite.connectionCode))
      .filter(Boolean)
  )
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    if (!existing.has(code)) return code
  }
  return crypto.randomBytes(6).toString('hex').toUpperCase()
}

export function buildTenantInviteUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}/invite/${encodeURIComponent(token)}`
}

/** Registration page with invite prefill — Register redirects to claim when signup is open. */
export function buildRoommateInviteRegisterUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}/register?invite=${encodeURIComponent(token)}`
}

export function buildInviteSmsBody({ landlordCompany, inviteUrl, connectionCode }) {
  const who = landlordCompany?.trim() || 'your landlord'
  const codePart = connectionCode
    ? ` Or enter code ${connectionCode} on the invite page.`
    : ''
  return `${who} invited you to join their rental portal. Open this link to confirm your lease details (no account signup needed): ${inviteUrl}${codePart}`
}

export function buildRoommateInviteSmsBody({
  inviterName,
  propertyAddress,
  inviteUrl,
  connectionCode,
  delivery = 'solo',
  groupSize,
}) {
  const who = inviterName?.trim() || 'A housemate'
  const where = propertyAddress?.trim() ? ` at ${propertyAddress.trim()}` : ''
  const codePart = connectionCode
    ? ` Or enter code ${connectionCode} on the registration page.`
    : ''
  if (delivery === 'group' && Number(groupSize) > 1) {
    return `${who} invited you to a roommate group${where} (${groupSize} people). Open this registration link to join the group: ${inviteUrl}${codePart}`
  }
  return `${who} invited you to join as a roommate${where}. Open this registration link to get started (account signup opens at launch): ${inviteUrl}${codePart}`
}

/**
 * @param {object} store
 * @param {object} [options]
 * @returns {{ invite?: object, error?: string }}
 */
export function createTenantInvite(store, options = {}) {
  const landlordCompany =
    (typeof options.landlordCompany === 'string' && options.landlordCompany.trim()) ||
    store.settings?.businessName?.trim() ||
    SAMPLE_AGENCY_NAME
  const propertyAddress =
    typeof options.propertyAddress === 'string' && options.propertyAddress.trim()
      ? options.propertyAddress.trim()
      : null

  let leaseStartDate = null
  if (typeof options.leaseStartDate === 'string' && options.leaseStartDate.trim()) {
    const start = options.leaseStartDate.trim().slice(0, 10)
    if (!isPlainYmd(start)) {
      return { error: 'Lease start date must be a valid calendar date.' }
    }
    if (!isFutureLeaseStartDate(start)) {
      return { error: 'Lease start date must be a future date.' }
    }
    leaseStartDate = start
  }

  const flexibleLeaseLength = options.flexibleLeaseLength === true
  let leaseLengthMonths = null
  if (options.leaseLengthMonths != null && options.leaseLengthMonths !== '') {
    if (flexibleLeaseLength) {
      const n = Number(options.leaseLengthMonths)
      if (!Number.isFinite(n) || n < 1 || n > 36) {
        return { error: 'Lease duration must be between 1 and 36 months.' }
      }
      leaseLengthMonths = Math.floor(n)
    } else if (!isLeaseLengthMonths(options.leaseLengthMonths)) {
      return { error: 'Lease duration must be 6, 12, 18, or 24 months.' }
    } else {
      leaseLengthMonths = parseLeaseLengthMonths(options.leaseLengthMonths)
    }
  }

  let leaseEndDate = null
  if (typeof options.leaseEndDate === 'string' && options.leaseEndDate.trim()) {
    const end = options.leaseEndDate.trim().slice(0, 10)
    if (!isPlainYmd(end)) {
      return { error: 'Lease end date must be a valid calendar date.' }
    }
    leaseEndDate = end
  }

  let connectionCode
  const customCode =
    typeof options.connectionCode === 'string' ? options.connectionCode.trim() : ''
  if (customCode) {
    if (!isValidCustomConnectionCode(customCode)) {
      return {
        error: `Invite code must be ${CUSTOM_CODE_MIN}–${CUSTOM_CODE_MAX} letters, numbers, or hyphens.`,
      }
    }
    connectionCode = normalizeConnectionCode(customCode)
    if (connectionCodeTaken(store, connectionCode)) {
      return { error: 'That invite code is already in use. Choose another.' }
    }
  } else {
    connectionCode = createConnectionCode(store)
  }

  const phone =
    typeof options.phone === 'string' && options.phone.trim() ? options.phone.trim() : null

  const source =
    options.source === 'lease-import'
      ? 'lease-import'
      : options.source === 'roommate'
        ? 'roommate'
        : 'manual'

  const token = createTenantInviteToken()
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const invite = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    token,
    connectionCode,
    landlordCompany,
    propertyAddress,
    leaseStartDate,
    leaseLengthMonths,
    leaseEndDate,
    phone,
    source,
    clientId: typeof options.clientId === 'string' ? options.clientId : null,
    invitedByClientId:
      typeof options.invitedByClientId === 'string' ? options.invitedByClientId : null,
    roommateStartOption:
      options.roommateStartOption === 'next_month' ||
      options.roommateStartOption === 'next_lease_cycle'
        ? options.roommateStartOption
        : null,
    rentalCategory:
      options.rentalCategory === 'student_housing' ||
      options.rentalCategory === 'standard_rental'
        ? options.rentalCategory
        : null,
    deliveryMethod: null,
    deliveryDestination: null,
    deliveredAt: null,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt,
    usedAt: null,
    usedByUserId: null,
  }
  return { invite }
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

function inviteStillValid(invite) {
  if (!invite) return false
  if (invite.usedAt) return false
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return false
  return true
}

export function findValidTenantInvite(store, token) {
  if (!token || typeof token !== 'string') return null
  const invites = store.tenantInvites ?? []
  const invite = invites.find((entry) => entry.token === token)
  return inviteStillValid(invite) ? invite : null
}

export function findValidTenantInviteByCode(store, code) {
  const normalized = normalizeConnectionCode(code)
  if (!normalized) return null
  const invites = store.tenantInvites ?? []
  const invite = invites.find(
    (entry) => normalizeConnectionCode(entry.connectionCode) === normalized
  )
  return inviteStillValid(invite) ? invite : null
}

export function publicInvitePayload(store, invite) {
  const agency = buildAgencyForInvite(store, invite)
  return {
    inviteToken: invite.token,
    landlordCompany: invite.landlordCompany,
    propertyAddress: invite.propertyAddress ?? null,
    leaseStartDate: invite.leaseStartDate ?? null,
    leaseLengthMonths: invite.leaseLengthMonths ?? null,
    connectionCode: invite.connectionCode ?? null,
    rentalCategory:
      invite.rentalCategory === 'student_housing' ||
      invite.rentalCategory === 'standard_rental'
        ? invite.rentalCategory
        : null,
    agency,
    discoveryMode: getTenantDiscoveryMode(store),
  }
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
