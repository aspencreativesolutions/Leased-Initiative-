/**
 * Server-side occupancy checks for tenant registration / invites.
 * Mirrors applicant-slot logic used by Waiting to Connect badges.
 */
import { ensurePropertyBedLayout } from './rentalBeds.js'
import { hasEntireHomeTenant } from './furnishedOccupancy.js'

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

/**
 * Available applicant slots at an address (maxTenants − official tenants).
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
  const current = officialTenantsAtAddress(store, address).length
  const slots = Math.max(0, (ensured.maxTenants ?? 1) - current)
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
