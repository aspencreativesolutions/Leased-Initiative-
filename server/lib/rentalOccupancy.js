/**
 * Server-side occupancy checks for tenant registration / invites.
 * Mirrors applicant-slot logic used by Waiting to Connect badges.
 */
import { ensurePropertyBedLayout } from './rentalBeds.js'
import { hasEntireHomeTenant, normalizeOccupancyMode } from './furnishedOccupancy.js'

export function normalizePropertyAddress(address) {
  return String(address ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function addressesMatch(a, b) {
  const left = normalizePropertyAddress(a)
  const right = normalizePropertyAddress(b)
  return Boolean(left && right && left === right)
}

function officialTenantsAtAddress(store, address) {
  return (store.clients ?? []).filter((client) => {
    if (!client?.isOfficialClient) return false
    return addressesMatch(client.projectName, address)
  })
}

export function findPropertyByAddress(store, address) {
  if (!address?.trim()) return null
  return (
    (store.properties ?? []).find((property) =>
      addressesMatch(property.address, address)
    ) ?? null
  )
}

function flattenBeds(layout) {
  if (!Array.isArray(layout)) return []
  return layout.flatMap((room) => room.beds ?? [])
}

/**
 * Open household slots (beds). Couple-capacity beds are one slot each —
 * a solo claim fills the bed; a second unrelated applicant cannot take the remainder.
 */
function availableHouseholdSlots(property, official) {
  const ensured = ensurePropertyBedLayout(property)
  if (ensured.entireHomeOnly === true) {
    return official.length > 0 ? 0 : 1
  }
  const wholeUnit = official.some((client) => {
    if (client.occupancyArrangement === 'entire_home') return true
    return normalizeOccupancyMode(client.preferredOccupancyMode) === 'entire_home'
  })
  if (wholeUnit) return 0

  const beds = flattenBeds(ensured.bedroomsLayout)
  if (beds.length === 0) {
    return Math.max(0, (ensured.maxTenants ?? 1) - official.length)
  }

  const bedIds = new Set(beds.map((bed) => bed.id))
  const occupiedBedIds = new Set(
    official.map((tenant) => tenant.bedId).filter((id) => id && bedIds.has(id))
  )
  let openBeds = beds.filter((bed) => !occupiedBedIds.has(bed.id)).length
  const unassigned = official.filter(
    (tenant) => !tenant.bedId || !bedIds.has(tenant.bedId)
  ).length
  return Math.max(0, openBeds - unassigned)
}

/**
 * Available applicant household slots at an address (open beds).
 * Entire-home tenants close the rental to additional applicants.
 * Returns null property when the address is not in the portfolio.
 */
export function availableApplicantSlotsAtAddress(store, address) {
  const property = findPropertyByAddress(store, address)
  if (!property) {
    return { property: null, slots: 0, available: false }
  }
  const ensured = ensurePropertyBedLayout(property)
  if (hasEntireHomeTenant(store, address, addressesMatch)) {
    return { property: ensured, slots: 0, available: false }
  }
  const official = officialTenantsAtAddress(store, address)
  const slots = availableHouseholdSlots(ensured, official)
  return { property: ensured, slots, available: slots > 0 }
}

/** Addresses from the portfolio that still have applicant capacity. */
export function availablePropertyAddresses(store) {
  const addresses = []
  for (const property of store.properties ?? []) {
    const address = property?.address?.trim()
    if (!address) continue
    const { available } = availableApplicantSlotsAtAddress(store, address)
    if (available) addresses.push(address)
  }
  return addresses.sort((a, b) => a.localeCompare(b))
}
