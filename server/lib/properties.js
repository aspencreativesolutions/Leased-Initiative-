import { generateId } from './notifications.js'
import { getDemoAsOfIso } from './demoClock.js'
import {
  ensurePropertyMonthlyRent,
  resolvePropertyMonthlyRent,
} from './rentalRent.js'

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
]

const LEGACY_PROPERTY_TYPE_MAP = {
  'Single-family home': 'Single-Family Home',
  'Multi-family home': 'Multi-Family Building',
  Condominium: 'Condominium (Condo)',
  Studio: 'Studio Apartment',
  Other: 'Single-Family Home',
}

/**
 * Curated landlord portfolio — real addresses within ~40 miles of Steubenville, OH.
 * Types and bedroom counts match the actual properties (apartment, single-family,
 * townhouse, duplex). Duplex units include unit letters.
 */
export const DEFAULT_SEED_PROPERTIES = [
  {
    address: '523 Juanita Street, Steubenville, OH 43952',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 3,
    bathrooms: 2,
    maxTenants: 4,
    /** Shared by two active demo roommates — $1,200 each */
    monthlyRent: 2400,
    addressDetails: {
      street: '523 Juanita Street',
      city: 'Steubenville',
      state: 'OH',
      zip: '43952',
    },
  },
  {
    address: '201 Heights Street, Weirton, WV 26062',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 3,
    bathrooms: 2,
    maxTenants: 4,
    monthlyRent: 2150,
    addressDetails: {
      street: '201 Heights Street',
      city: 'Weirton',
      state: 'WV',
      zip: '26062',
    },
  },
  {
    address: '77 Maryland Street, Wheeling, WV 26003',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 3,
    bathrooms: 2,
    maxTenants: 4,
    monthlyRent: 2200,
    addressDetails: {
      street: '77 Maryland Street',
      city: 'Wheeling',
      state: 'WV',
      zip: '26003',
    },
  },
  {
    address: '211 Donnell Street, Weirton, WV 26062',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 4,
    bathrooms: 2.5,
    maxTenants: 5,
    monthlyRent: 2850,
    addressDetails: {
      street: '211 Donnell Street',
      city: 'Weirton',
      state: 'WV',
      zip: '26062',
    },
  },
  {
    address: '107 Broad Street, St. Clairsville, OH 43950',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 5,
    bathrooms: 3,
    maxTenants: 6,
    monthlyRent: 3200,
    addressDetails: {
      street: '107 Broad Street',
      city: 'St. Clairsville',
      state: 'OH',
      zip: '43950',
    },
  },
  {
    address: '285 Bethany Pike, Wellsburg, WV 26070',
    propertyType: 'Single-Family Home',
    unitCount: 1,
    bedrooms: 2,
    bathrooms: 1.5,
    maxTenants: 3,
    monthlyRent: 1850,
    addressDetails: {
      street: '285 Bethany Pike',
      city: 'Wellsburg',
      state: 'WV',
      zip: '26070',
    },
  },
  {
    address: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
    propertyType: 'Townhouse',
    unitCount: 1,
    bedrooms: 2,
    bathrooms: 1.5,
    maxTenants: 3,
    monthlyRent: 1750,
    addressDetails: {
      street: '4610 Scioto Drive, Unit A',
      city: 'Steubenville',
      state: 'OH',
      zip: '43953',
    },
  },
  {
    address: '430 Canton Road, Unit 11, Wintersville, OH 43953',
    propertyType: 'Apartment',
    unitCount: 1,
    bedrooms: 2,
    bathrooms: 1,
    maxTenants: 3,
    monthlyRent: 1450,
    addressDetails: {
      street: '430 Canton Road, Unit 11',
      city: 'Wintersville',
      state: 'OH',
      zip: '43953',
    },
  },
  {
    address: '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
    propertyType: 'Duplex',
    unitCount: 1,
    bedrooms: 1,
    bathrooms: 1,
    maxTenants: 2,
    monthlyRent: 1350,
    addressDetails: {
      street: '1430 Ridge Avenue, Unit A',
      city: 'Steubenville',
      state: 'OH',
      zip: '43952',
    },
  },
  {
    address: '1430 Ridge Avenue, Unit B, Steubenville, OH 43952',
    propertyType: 'Duplex',
    unitCount: 1,
    bedrooms: 1,
    bathrooms: 1,
    maxTenants: 2,
    /** Vacant duplex side — unit rent still shown on Rentals */
    monthlyRent: 1400,
    addressDetails: {
      street: '1430 Ridge Avenue, Unit B',
      city: 'Steubenville',
      state: 'OH',
      zip: '43952',
    },
  },
]

/** Old seed / demo addresses → Steubenville-area replacements. */
export const SEED_PROPERTY_ADDRESS_MIGRATIONS = {
  '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205':
    '523 Juanita Street, Steubenville, OH 43952',
  '56 East Market Street #210, Philadelphia, PA 19107':
    '201 Heights Street, Weirton, WV 26062',
  '3315 South Magnolia Avenue, Tampa, FL 33609':
    '77 Maryland Street, Wheeling, WV 26003',
  '7748 Highland Park Lane, Austin, TX 78745':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '2140 Barton Springs Road, Unit 2B, Austin, TX 78704':
    '211 Donnell Street, Weirton, WV 26062',
  '8901 North Lamar Boulevard, Unit 3C, Austin, TX 78753':
    '107 Broad Street, St. Clairsville, OH 43950',
  '4821 Westheimer Road, Suite 210, Houston, TX 77056':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '1200 Congress Avenue, Suite 400, Austin, TX 78701':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '1847 North Whispering Pines Boulevard, Apartment 12B, Charlotte, NC 28202':
    '285 Bethany Pike, Wellsburg, WV 26070',
  '2100 Congress Avenue, Suite 100, Austin, TX 78701':
    '211 East Main Street, St. Clairsville, OH 43950',
  '4500 South Lamar Boulevard, Unit 8, Austin, TX 78745':
    '70090 Main Street, St. Clairsville, OH 43950',
  '8800 North MoPac Expressway, Floor 3, Austin, TX 78759':
    '71365 Center Street, St. Clairsville, OH 43950',
  // Prior Steubenville-area seeds with incorrect housing types
  '261 East Main Street, St. Clairsville, OH 43950':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '150 Orchard Street, Wintersville, OH 43953':
    '430 Canton Road, Unit 11, Wintersville, OH 43953',
  '903 Logan Avenue, Mingo Junction, OH 43938':
    '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
  '4610A Scioto Drive, Steubenville, OH 43953':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
}

function normalizeAddress(address) {
  return String(address ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizePropertyType(value) {
  const trimmed = String(value ?? '').trim()
  if (PROPERTY_HOUSING_TYPES.includes(trimmed)) return trimmed
  return LEGACY_PROPERTY_TYPE_MAP[trimmed] ?? 'Single-Family Home'
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

function normalizeOptionalPositiveNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

export function createPropertyRecord({
  address,
  propertyType,
  unitCount,
  bedrooms,
  bathrooms,
  squareFeet,
  maxTenants,
  monthlyRent,
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
  const baths = normalizeOptionalPositiveNumber(bathrooms)
  if (baths != null) record.bathrooms = baths
  const sqft = normalizeOptionalPositiveNumber(squareFeet)
  if (sqft != null) record.squareFeet = Math.floor(sqft)
  if (importedFromLeaseScan === true) {
    record.importedFromLeaseScan = true
  }
  const details = normalizeAddressDetails(addressDetails)
  if (details) record.addressDetails = details
  if (addressConfirmed === true) record.addressConfirmed = true
  if (Array.isArray(units) && units.length > 0) {
    record.units = units
  }
  const explicitRent = normalizeOptionalPositiveNumber(monthlyRent)
  record.monthlyRent =
    explicitRent != null
      ? Math.round(explicitRent)
      : resolvePropertyMonthlyRent(record)
  return record
}

/** Backfill propertyType / maxTenants / monthlyRent on legacy store records. */
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
  const baths = normalizeOptionalPositiveNumber(property.bathrooms)
  if (baths != null) next.bathrooms = baths
  else delete next.bathrooms
  const sqft = normalizeOptionalPositiveNumber(property.squareFeet)
  if (sqft != null) next.squareFeet = Math.floor(sqft)
  else delete next.squareFeet
  const details = normalizeAddressDetails(property.addressDetails)
  if (details) next.addressDetails = details
  else delete next.addressDetails
  return ensurePropertyMonthlyRent(next)
}

/** Apply curated seed fields onto a matching portfolio rental. */
function applySeedFields(property, seedEntry) {
  if (!seedEntry) return property
  const seedDetails = normalizeAddressDetails(seedEntry.addressDetails)
  const next = {
    ...property,
    propertyType: normalizePropertyType(seedEntry.propertyType),
    unitCount: Math.max(1, Math.floor(Number(seedEntry.unitCount) || 1)),
    bedrooms: Math.max(0, Math.floor(Number(seedEntry.bedrooms) || 0)),
    maxTenants: normalizeMaxTenants(seedEntry.maxTenants, seedEntry.unitCount),
  }
  const baths = normalizeOptionalPositiveNumber(seedEntry.bathrooms)
  if (baths != null) next.bathrooms = baths
  const sqft = normalizeOptionalPositiveNumber(seedEntry.squareFeet)
  if (sqft != null) next.squareFeet = Math.floor(sqft)
  const seedRent = normalizeOptionalPositiveNumber(seedEntry.monthlyRent)
  if (seedRent != null) next.monthlyRent = Math.round(seedRent)
  if (seedDetails) next.addressDetails = seedDetails
  if (property.addressConfirmed !== true) next.addressConfirmed = true
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
    const migratedAddress =
      SEED_PROPERTY_ADDRESS_MIGRATIONS[String(property.address ?? '').trim()]
    const base = migratedAddress ? { ...property, address: migratedAddress } : property
    if (migratedAddress) changed = true

    const seedEntry = DEFAULT_SEED_PROPERTIES.find(
      (entry) => normalizeAddress(entry.address) === normalizeAddress(base.address)
    )
    const withSeed = seedEntry ? applySeedFields(base, seedEntry) : base
    if (
      withSeed.propertyType !== base.propertyType ||
      withSeed.maxTenants !== base.maxTenants ||
      withSeed.unitCount !== base.unitCount ||
      withSeed.bedrooms !== base.bedrooms ||
      withSeed.monthlyRent !== base.monthlyRent ||
      withSeed.bathrooms !== base.bathrooms ||
      withSeed.addressDetails !== base.addressDetails ||
      withSeed.addressConfirmed !== base.addressConfirmed
    ) {
      changed = true
    }

    const next = normalizeStoredProperty(withSeed)
    if (
      next.propertyType !== withSeed.propertyType ||
      next.maxTenants !== withSeed.maxTenants ||
      next.unitCount !== withSeed.unitCount ||
      next.bedrooms !== withSeed.bedrooms ||
      next.monthlyRent !== withSeed.monthlyRent
    ) {
      changed = true
    }
    return next
  })

  // Collapse duplicates created when an old seed address migrates onto an
  // address that already exists in the portfolio.
  const seenAddresses = new Set()
  const deduped = []
  for (const property of properties) {
    const key = normalizeAddress(property.address)
    if (seenAddresses.has(key)) {
      changed = true
      continue
    }
    seenAddresses.add(key)
    deduped.push(property)
  }
  properties = deduped

  if (properties.length === 0) {
    properties = DEFAULT_SEED_PROPERTIES.map((entry) =>
      createPropertyRecord({ ...entry, createdAt: now, addressConfirmed: true })
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
          createPropertyRecord({ ...entry, createdAt: now, addressConfirmed: true }),
        ]
        byAddress.set(key, properties.length - 1)
        changed = true
        continue
      }

      const current = properties[index]
      const synced = applySeedFields(current, entry)
      const normalizedSynced = normalizeStoredProperty(synced)
      if (
        normalizedSynced.propertyType !== current.propertyType ||
        normalizedSynced.maxTenants !== current.maxTenants ||
        normalizedSynced.unitCount !== current.unitCount ||
        normalizedSynced.bedrooms !== current.bedrooms ||
        normalizedSynced.monthlyRent !== current.monthlyRent ||
        JSON.stringify(normalizedSynced.addressDetails) !==
          JSON.stringify(current.addressDetails)
      ) {
        properties[index] = normalizedSynced
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

  const monthlyRentRaw = Number(body?.monthlyRent)
  const monthlyRent =
    Number.isFinite(monthlyRentRaw) && monthlyRentRaw > 0
      ? Math.round(monthlyRentRaw)
      : undefined

  return {
    address,
    propertyType,
    unitCount: Math.floor(unitCount),
    bedrooms: Math.floor(bedrooms),
    maxTenants: Math.floor(maxTenants),
    ...(monthlyRent != null ? { monthlyRent } : {}),
    addressConfirmed: true,
    addressDetails: normalizeAddressDetails(body?.addressDetails),
    ...(importedFromLeaseScan ? { importedFromLeaseScan: true } : {}),
  }
}
