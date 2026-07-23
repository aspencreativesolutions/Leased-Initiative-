import { generateId } from './notifications.js'
import { getDemoAsOfIso } from './demoClock.js'

export const PROPERTY_HOUSING_TYPES = [
  'Apartment',
  'Condominium (Condo)',
  'Single-Family Home',
  'Townhouse',
  'Duplex',
  'Triplex',
  'Fourplex',
  'Multi-Family Building',
  'Studio Apartment',
  'Loft',
  'Basement Apartment / Accessory Dwelling Unit',
  'Vacation Rental',
  'Other',
]

const LEGACY_PROPERTY_TYPE_MAP = {
  'Single-family home': 'Single-Family Home',
  'Multi-family home': 'Multi-Family Building',
  Condominium: 'Condominium (Condo)',
  Studio: 'Studio Apartment',
}

/** Default portfolio seeded when the store has no properties yet. */
export const DEFAULT_SEED_PROPERTIES = [
  {
    address: '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205',
    propertyType: 'Apartment',
    unitCount: 1,
    bedrooms: 2,
    maxTenants: 2,
    addressDetails: {
      street: '902 West Cedar Ridge Drive, Unit 4',
      city: 'Portland',
      state: 'OR',
      zip: '97205',
    },
  },
  {
    address: '56 East Market Street #210, Philadelphia, PA 19107',
    propertyType: 'Apartment',
    unitCount: 3,
    bedrooms: 1,
    maxTenants: 3,
    addressDetails: {
      street: '56 East Market Street #210',
      city: 'Philadelphia',
      state: 'PA',
      zip: '19107',
    },
  },
  {
    address: '3315 South Magnolia Avenue, Tampa, FL 33609',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 3,
    maxTenants: 4,
    addressDetails: {
      street: '3315 South Magnolia Avenue',
      city: 'Tampa',
      state: 'FL',
      zip: '33609',
    },
  },
  {
    address: '7748 Highland Park Lane, Austin, TX 78745',
    propertyType: 'Townhouse',
    unitCount: 1,
    bedrooms: 2,
    maxTenants: 3,
    addressDetails: {
      street: '7748 Highland Park Lane',
      city: 'Austin',
      state: 'TX',
      zip: '78745',
    },
  },
  {
    address: '2140 Barton Springs Road, Unit 2B, Austin, TX 78704',
    propertyType: 'Multi-Family Building',
    unitCount: 4,
    bedrooms: 2,
    maxTenants: 6,
    addressDetails: {
      street: '2140 Barton Springs Road, Unit 2B',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
    },
  },
  {
    address: '8901 North Lamar Boulevard, Unit 3C, Austin, TX 78753',
    propertyType: 'Condominium (Condo)',
    unitCount: 1,
    bedrooms: 3,
    maxTenants: 4,
    addressDetails: {
      street: '8901 North Lamar Boulevard, Unit 3C',
      city: 'Austin',
      state: 'TX',
      zip: '78753',
    },
  },
]

function normalizeAddress(address) {
  return String(address ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizePropertyType(value) {
  const trimmed = String(value ?? '').trim()
  if (PROPERTY_HOUSING_TYPES.includes(trimmed)) return trimmed
  return LEGACY_PROPERTY_TYPE_MAP[trimmed] ?? 'Other'
}

function normalizeMaxTenants(value, unitCount) {
  const n = Number(value)
  if (Number.isFinite(n) && n >= 1) return Math.floor(n)
  const units = Number(unitCount)
  if (Number.isFinite(units) && units >= 1) return Math.floor(units)
  return 1
}

function normalizeAddressDetails(raw) {
  if (!raw || typeof raw !== 'object') return undefined
  const details = {}
  for (const key of ['street', 'city', 'state', 'zip', 'country', 'placeId']) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) details[key] = value.trim()
  }
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  if (Number.isFinite(lat)) details.lat = lat
  if (Number.isFinite(lng)) details.lng = lng
  return Object.keys(details).length > 0 ? details : undefined
}

export function createPropertyRecord({
  address,
  propertyType,
  unitCount,
  bedrooms,
  maxTenants,
  createdAt,
  importedFromLeaseScan,
  addressDetails,
  addressConfirmed,
  units,
}) {
  const unitsCount = Number(unitCount)
  const beds = Number(bedrooms)
  const resolvedUnits = Number.isFinite(unitsCount) && unitsCount >= 1 ? Math.floor(unitsCount) : 1
  const record = {
    id: generateId(),
    address: String(address).trim(),
    propertyType: normalizePropertyType(propertyType),
    unitCount: resolvedUnits,
    bedrooms: Number.isFinite(beds) && beds >= 0 ? Math.floor(beds) : 0,
    maxTenants: normalizeMaxTenants(maxTenants, resolvedUnits),
    createdAt: createdAt || new Date().toISOString(),
  }
  if (importedFromLeaseScan === true) {
    record.importedFromLeaseScan = true
  }
  const details = normalizeAddressDetails(addressDetails)
  if (details) record.addressDetails = details
  if (addressConfirmed === true) record.addressConfirmed = true
  if (Array.isArray(units) && units.length > 0) {
    record.units = units
  }
  return record
}

/** Backfill propertyType / maxTenants on legacy store records. */
export function normalizeStoredProperty(property) {
  if (!property || typeof property !== 'object') return property
  const units = Math.max(1, Math.floor(Number(property.unitCount) || 1))
  const next = {
    ...property,
    address: String(property.address ?? '').trim(),
    propertyType: normalizePropertyType(property.propertyType),
    unitCount: units,
    bedrooms: Math.max(0, Math.floor(Number(property.bedrooms) || 0)),
    maxTenants: normalizeMaxTenants(property.maxTenants, units),
  }
  const details = normalizeAddressDetails(property.addressDetails)
  if (details) next.addressDetails = details
  else delete next.addressDetails
  return next
}

/** Remove properties created by lease import (used by Admin Mode reseed). */
export function purgeImportedLeaseProperties(store) {
  const existing = store.properties ?? []
  const next = existing.filter((property) => property?.importedFromLeaseScan !== true)
  if (next.length === existing.length) {
    return { store, changed: false, removed: 0 }
  }
  return {
    store: { ...store, properties: next },
    changed: true,
    removed: existing.length - next.length,
  }
}

/**
 * Ensure the store has a curated property portfolio. Idempotent — only fills
 * when empty, and merges any missing demo addresses without wiping landlord adds.
 */
export function ensureStoreProperties(store) {
  const existing = Array.isArray(store.properties) ? [...store.properties] : []
  const now = getDemoAsOfIso()
  let changed = false
  let properties = existing.map((property) => {
    const next = normalizeStoredProperty(property)
    if (
      next.propertyType !== property.propertyType ||
      next.maxTenants !== property.maxTenants ||
      next.unitCount !== property.unitCount ||
      next.bedrooms !== property.bedrooms
    ) {
      changed = true
    }
    return next
  })

  if (properties.length === 0) {
    properties = DEFAULT_SEED_PROPERTIES.map((entry) =>
      createPropertyRecord({ ...entry, createdAt: now })
    )
    changed = true
  } else {
    const byAddress = new Map(
      properties.map((property, index) => [normalizeAddress(property.address), index])
    )
    for (const entry of DEFAULT_SEED_PROPERTIES) {
      const key = normalizeAddress(entry.address)
      const index = byAddress.get(key)
      if (index == null) {
        properties = [
          ...properties,
          createPropertyRecord({ ...entry, createdAt: now }),
        ]
        byAddress.set(key, properties.length - 1)
        changed = true
        continue
      }

      const current = properties[index]
      const seedDetails = normalizeAddressDetails(entry.addressDetails)
      if (!current.addressDetails && seedDetails) {
        properties[index] = { ...current, addressDetails: seedDetails }
        changed = true
      }
    }
  }

  if (!changed) return { store, changed: false }
  return { store: { ...store, properties }, changed: true }
}

export function validatePropertyInput(body) {
  const address = String(body?.address ?? '').trim()
  if (!address) return { error: 'Address is required' }
  if (!/\d/.test(address)) {
    return { error: 'Enter a full street address including a number' }
  }

  const importedFromLeaseScan = body?.importedFromLeaseScan === true
  const addressConfirmed = body?.addressConfirmed === true || importedFromLeaseScan
  if (!addressConfirmed) {
    return { error: 'Select or confirm a valid address from the suggestions' }
  }

  const propertyType = String(body?.propertyType ?? '').trim()
  if (!propertyType) return { error: 'Rental type is required' }
  if (!PROPERTY_HOUSING_TYPES.includes(propertyType)) {
    return { error: 'Select a valid rental type' }
  }

  const bedrooms = Number(body?.bedrooms)
  if (!Number.isFinite(bedrooms) || bedrooms < 0 || bedrooms > 50 || !Number.isInteger(bedrooms)) {
    return { error: 'Bedrooms must be a whole number 0 or greater' }
  }

  const maxTenants = Number(body?.maxTenants)
  if (
    !Number.isFinite(maxTenants) ||
    maxTenants < 1 ||
    maxTenants > 500 ||
    !Number.isInteger(maxTenants)
  ) {
    return { error: 'Maximum tenants allowed must be a whole number of at least 1' }
  }

  // Optional unit count for openings / lease import; default one unit per address
  let unitCount = Number(body?.unitCount)
  if (!Number.isFinite(unitCount) || unitCount < 1) {
    unitCount = 1
  }
  if (unitCount > 500 || !Number.isInteger(unitCount)) {
    return { error: 'Number of units must be between 1 and 500' }
  }

  return {
    address,
    propertyType,
    unitCount: Math.floor(unitCount),
    bedrooms: Math.floor(bedrooms),
    maxTenants: Math.floor(maxTenants),
    addressConfirmed: true,
    addressDetails: normalizeAddressDetails(body?.addressDetails),
    ...(importedFromLeaseScan ? { importedFromLeaseScan: true } : {}),
  }
}
