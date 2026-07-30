import { generateId } from './notifications.js'
import { getDemoAsOfIso } from './demoClock.js'
import {
  ensurePropertyMonthlyRent,
  resolvePropertyMonthlyRent,
} from './rentalRent.js'
import {
  ensurePropertyBedLayout,
  isCompleteBedroomsLayout,
  maxOccupancyFromLayout,
  normalizeBedroomsLayout,
} from './rentalBeds.js'
import { resolveRentalCategory } from './rentalCategory.js'

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
    rentalCategory: 'student_housing',
    unitCount: 1,
    bedrooms: 3,
    bathrooms: 2,
    maxTenants: 4,
    /** Shared by two active demo roommates — $1,200 each */
    monthlyRent: 2400,
    furnished: true,
    pricingStructure: 'person',
    depositAmount: 2400,
    utilitiesIncluded: true,
    addressDetails: {
      street: '523 Juanita Street',
      city: 'Steubenville',
      state: 'OH',
      zip: '43952',
      lat: 40.3712,
      lng: -80.6358,
    },
  },
  {
    address: '201 Heights Street, Weirton, WV 26062',
    propertyType: 'Single-Family Home',
    rentalCategory: 'student_housing',
    unitCount: 1,
    bedrooms: 3,
    bathrooms: 2,
    maxTenants: 4,
    monthlyRent: 2150,
    furnished: true,
    pricingStructure: 'room',
    depositAmount: 2150,
    utilitiesIncluded: false,
    addressDetails: {
      street: '201 Heights Street',
      city: 'Weirton',
      state: 'WV',
      zip: '26062',
      lat: 40.4211,
      lng: -80.5912,
    },
  },
  {
    address: '77 Maryland Street, Wheeling, WV 26003',
    propertyType: 'Single-Family Home',
    rentalCategory: 'student_housing',
    unitCount: 1,
    bedrooms: 3,
    bathrooms: 2,
    maxTenants: 4,
    monthlyRent: 2200,
    furnished: true,
    pricingStructure: 'bed',
    depositAmount: 2200,
    utilitiesIncluded: true,
    addressDetails: {
      street: '77 Maryland Street',
      city: 'Wheeling',
      state: 'WV',
      zip: '26003',
      lat: 40.0664,
      lng: -80.7218,
    },
  },
  {
    address: '211 Donnell Street, Weirton, WV 26062',
    propertyType: 'Single-Family Home',
    rentalCategory: 'student_housing',
    unitCount: 1,
    bedrooms: 4,
    bathrooms: 2.5,
    maxTenants: 5,
    monthlyRent: 2850,
    furnished: false,
    pricingStructure: 'person',
    depositAmount: 1425,
    utilitiesIncluded: false,
    addressDetails: {
      street: '211 Donnell Street',
      city: 'Weirton',
      state: 'WV',
      zip: '26062',
      lat: 40.4165,
      lng: -80.5871,
    },
  },
  {
    address: '107 Broad Street, St. Clairsville, OH 43950',
    propertyType: 'Single-Family Home',
    rentalCategory: 'student_housing',
    unitCount: 1,
    bedrooms: 5,
    bathrooms: 3,
    maxTenants: 10,
    monthlyRent: 3200,
    furnished: true,
    pricingStructure: 'bed',
    depositAmount: 3200,
    utilitiesIncluded: true,
    addressDetails: {
      street: '107 Broad Street',
      city: 'St. Clairsville',
      state: 'OH',
      zip: '43950',
      lat: 40.0798,
      lng: -80.9004,
    },
  },
  {
    address: '285 Bethany Pike, Wellsburg, WV 26070',
    propertyType: 'Single-Family Home',
    rentalCategory: 'standard_rental',
    unitCount: 1,
    bedrooms: 2,
    bathrooms: 1.5,
    maxTenants: 3,
    monthlyRent: 1850,
    furnished: true,
    pricingStructure: 'person',
    entireHomeOnly: true,
    depositAmount: 1850,
    utilitiesIncluded: false,
    addressDetails: {
      street: '285 Bethany Pike',
      city: 'Wellsburg',
      state: 'WV',
      zip: '26070',
      lat: 40.2736,
      lng: -80.6105,
    },
  },
  {
    address: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
    propertyType: 'Townhouse',
    rentalCategory: 'standard_rental',
    unitCount: 1,
    bedrooms: 2,
    bathrooms: 1.5,
    maxTenants: 3,
    monthlyRent: 1750,
    furnished: false,
    pricingStructure: 'person',
    depositAmount: 875,
    utilitiesIncluded: true,
    addressDetails: {
      street: '4610 Scioto Drive, Unit A',
      city: 'Steubenville',
      state: 'OH',
      zip: '43953',
      lat: 40.3589,
      lng: -80.6482,
    },
  },
  {
    address: '430 Canton Road, Unit 11, Wintersville, OH 43953',
    propertyType: 'Apartment',
    rentalCategory: 'standard_rental',
    unitCount: 1,
    bedrooms: 2,
    bathrooms: 1,
    maxTenants: 3,
    monthlyRent: 1450,
    furnished: true,
    pricingStructure: 'person',
    depositAmount: 1450,
    utilitiesIncluded: true,
    addressDetails: {
      street: '430 Canton Road, Unit 11',
      city: 'Wintersville',
      state: 'OH',
      zip: '43953',
      lat: 40.3798,
      lng: -80.7041,
    },
  },
  {
    address: '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
    propertyType: 'Duplex',
    rentalCategory: 'standard_rental',
    unitCount: 1,
    bedrooms: 1,
    bathrooms: 1,
    maxTenants: 2,
    monthlyRent: 1350,
    furnished: false,
    pricingStructure: 'person',
    depositAmount: 1350,
    utilitiesIncluded: false,
    addressDetails: {
      street: '1430 Ridge Avenue, Unit A',
      city: 'Steubenville',
      state: 'OH',
      zip: '43952',
      lat: 40.3755,
      lng: -80.6288,
    },
  },
  {
    address: '1430 Ridge Avenue, Unit B, Steubenville, OH 43952',
    propertyType: 'Duplex',
    rentalCategory: 'standard_rental',
    unitCount: 1,
    bedrooms: 1,
    bathrooms: 1,
    maxTenants: 2,
    /** Vacant duplex side — unit rent still shown on Rentals */
    monthlyRent: 1400,
    furnished: false,
    pricingStructure: 'person',
    depositAmount: 1400,
    utilitiesIncluded: false,
    addressDetails: {
      street: '1430 Ridge Avenue, Unit B',
      city: 'Steubenville',
      state: 'OH',
      zip: '43952',
      lat: 40.3759,
      lng: -80.6282,
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

/** Room/person always; bed only when furnished. Defaults to person (or bed if furnished). */
function normalizePricingStructure(value, furnished) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'room') return 'room'
  if (raw === 'bed' && furnished) return 'bed'
  if (raw === 'person') return 'person'
  return furnished ? 'bed' : 'person'
}

export function createPropertyRecord({
  address,
  propertyType,
  rentalCategory,
  unitCount,
  bedrooms,
  bathrooms,
  squareFeet,
  maxTenants,
  monthlyRent,
  furnished,
  pricingStructure,
  depositAmount,
  utilitiesIncluded,
  entireHomeOnly,
  bedroomsLayout,
  createdAt,
  importedFromLeaseScan,
  addressDetails,
  addressConfirmed,
  units,
  defaultLeaseOptionId,
  conditionReportRequired,
  offMarket,
  offMarketReason,
  offMarketAt,
}) {
  const unitsCount = Number(unitCount)
  const beds = Number(bedrooms)
  const resolvedUnits = Number.isFinite(unitsCount) && unitsCount >= 1 ? Math.floor(unitsCount) : 1
  const layout = normalizeBedroomsLayout(
    bedroomsLayout,
    Number.isFinite(beds) && beds >= 0 ? Math.floor(beds) : 1
  )
  const derivedMax = Math.max(1, maxOccupancyFromLayout(layout))
  const isFurnished = furnished === true
  const pricing = normalizePricingStructure(pricingStructure, isFurnished)
  const record = {
    id: generateId(),
    address: String(address).trim(),
    propertyType: normalizePropertyType(propertyType),
    rentalCategory: resolveRentalCategory(rentalCategory),
    unitCount: resolvedUnits,
    bedrooms: layout.length,
    bedroomsLayout: layout,
    maxTenants: derivedMax,
    furnished: isFurnished,
    pricingStructure: pricing,
    utilitiesIncluded: utilitiesIncluded === true,
    entireHomeOnly: entireHomeOnly === true,
    createdAt: createdAt || new Date().toISOString(),
  }
  if (offMarket === true) {
    record.offMarket = true
    const reason = String(offMarketReason ?? '').trim()
    if (reason) record.offMarketReason = reason
    const at = String(offMarketAt ?? '').trim()
    record.offMarketAt = at || new Date().toISOString()
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
  const leaseOption =
    typeof defaultLeaseOptionId === 'string' ? defaultLeaseOptionId.trim() : ''
  if (leaseOption) record.defaultLeaseOptionId = leaseOption
  if (conditionReportRequired === true) record.conditionReportRequired = true
  else if (conditionReportRequired === false) record.conditionReportRequired = false
  const explicitRent = normalizeOptionalPositiveNumber(monthlyRent)
  record.monthlyRent =
    explicitRent != null
      ? Math.round(explicitRent)
      : resolvePropertyMonthlyRent(record)
  const deposit = normalizeOptionalPositiveNumber(depositAmount)
  if (deposit != null) record.depositAmount = Math.round(deposit)
  // Preserve explicit maxTenants only when no layout was provided and value is valid
  if (
    !bedroomsLayout &&
    Number.isFinite(Number(maxTenants)) &&
    Number(maxTenants) >= 1
  ) {
    // Still prefer derived from migrated layout
    record.maxTenants = derivedMax
  }
  return record
}

/** Backfill propertyType / maxTenants / monthlyRent / bedroomsLayout on legacy store records. */
export function normalizeStoredProperty(property) {
  if (!property || typeof property !== 'object') return property
  const units = Math.max(1, Math.floor(Number(property.unitCount) || 1))
  const furnished = property.furnished === true
  let next = {
    ...property,
    address: String(property.address ?? '').trim(),
    propertyType: normalizePropertyType(property.propertyType),
    rentalCategory: resolveRentalCategory(property.rentalCategory),
    unitCount: units,
    bedrooms: Math.max(0, Math.floor(Number(property.bedrooms) || 0)),
    maxTenants: normalizeMaxTenants(property.maxTenants, units),
    furnished,
    pricingStructure: normalizePricingStructure(property.pricingStructure, furnished),
    utilitiesIncluded: property.utilitiesIncluded === true,
    entireHomeOnly: property.entireHomeOnly === true,
  }
  const baths = normalizeOptionalPositiveNumber(property.bathrooms)
  if (baths != null) next.bathrooms = baths
  else delete next.bathrooms
  const sqft = normalizeOptionalPositiveNumber(property.squareFeet)
  if (sqft != null) next.squareFeet = Math.floor(sqft)
  else delete next.squareFeet
  const deposit = normalizeOptionalPositiveNumber(property.depositAmount)
  if (deposit != null) next.depositAmount = Math.round(deposit)
  else delete next.depositAmount
  const details = normalizeAddressDetails(property.addressDetails)
  if (details) next.addressDetails = details
  else delete next.addressDetails
  if (property.offMarket === true) {
    next.offMarket = true
    const reason = String(property.offMarketReason ?? '').trim()
    if (reason) next.offMarketReason = reason
    else delete next.offMarketReason
    const at = String(property.offMarketAt ?? '').trim()
    if (at) next.offMarketAt = at
    else delete next.offMarketAt
  } else {
    delete next.offMarket
    delete next.offMarketReason
    delete next.offMarketAt
  }
  next = ensurePropertyBedLayout(next)
  return ensurePropertyMonthlyRent(next)
}

export function updatePropertyRecord(existing, updates) {
  const merged = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
  }
  if (updates.bedroomsLayout != null || updates.bedrooms != null) {
    const layout = normalizeBedroomsLayout(
      updates.bedroomsLayout ?? existing.bedroomsLayout,
      updates.bedrooms ?? existing.bedrooms
    )
    merged.bedroomsLayout = layout
    merged.bedrooms = layout.length
    merged.maxTenants = Math.max(1, maxOccupancyFromLayout(layout))
  }
  if (updates.address != null) merged.address = String(updates.address).trim()
  if (updates.propertyType != null) {
    merged.propertyType = normalizePropertyType(updates.propertyType)
  }
  if (updates.rentalCategory !== undefined) {
    merged.rentalCategory = resolveRentalCategory(updates.rentalCategory)
  }
  if (updates.unitCount != null) {
    merged.unitCount = Math.max(1, Math.floor(Number(updates.unitCount) || 1))
  }
  if (updates.monthlyRent != null) {
    const rent = normalizeOptionalPositiveNumber(updates.monthlyRent)
    if (rent != null) merged.monthlyRent = Math.round(rent)
  }
  if (updates.furnished !== undefined) {
    merged.furnished = updates.furnished === true
  }
  if (updates.pricingStructure !== undefined || updates.furnished !== undefined) {
    merged.pricingStructure = normalizePricingStructure(
      updates.pricingStructure ?? existing.pricingStructure,
      merged.furnished === true
    )
  }
  if (updates.depositAmount !== undefined) {
    if (updates.depositAmount === null || updates.depositAmount === '') {
      delete merged.depositAmount
    } else {
      const deposit = normalizeOptionalPositiveNumber(updates.depositAmount)
      if (deposit != null) merged.depositAmount = Math.round(deposit)
      else delete merged.depositAmount
    }
  }
  if (updates.utilitiesIncluded !== undefined) {
    merged.utilitiesIncluded = updates.utilitiesIncluded === true
  }
  if (updates.entireHomeOnly !== undefined) {
    merged.entireHomeOnly = updates.entireHomeOnly === true
  }
  if (updates.defaultLeaseOptionId !== undefined) {
    if (updates.defaultLeaseOptionId === null || updates.defaultLeaseOptionId === '') {
      delete merged.defaultLeaseOptionId
    } else {
      const optionId = String(updates.defaultLeaseOptionId).trim()
      if (optionId) merged.defaultLeaseOptionId = optionId
      else delete merged.defaultLeaseOptionId
    }
  }
  if (updates.conditionReportRequired !== undefined) {
    if (updates.conditionReportRequired === true) {
      merged.conditionReportRequired = true
    } else if (updates.conditionReportRequired === false) {
      merged.conditionReportRequired = false
    } else {
      delete merged.conditionReportRequired
    }
  }
  if (updates.addressDetails !== undefined) {
    const details = normalizeAddressDetails(updates.addressDetails)
    if (details) merged.addressDetails = details
    else delete merged.addressDetails
  }
  if (updates.addressConfirmed === true) merged.addressConfirmed = true
  if (updates.offMarket !== undefined) {
    if (updates.offMarket === true) {
      merged.offMarket = true
      if (updates.offMarketReason !== undefined) {
        const reason = String(updates.offMarketReason ?? '').trim()
        if (reason) merged.offMarketReason = reason
        else delete merged.offMarketReason
      }
      if (updates.offMarketAt !== undefined) {
        const at = String(updates.offMarketAt ?? '').trim()
        if (at) merged.offMarketAt = at
        else if (!merged.offMarketAt) merged.offMarketAt = new Date().toISOString()
      } else if (!merged.offMarketAt) {
        merged.offMarketAt = new Date().toISOString()
      }
    } else {
      delete merged.offMarket
      delete merged.offMarketReason
      delete merged.offMarketAt
    }
  } else if (updates.offMarketReason !== undefined || updates.offMarketAt !== undefined) {
    if (merged.offMarket === true) {
      if (updates.offMarketReason !== undefined) {
        const reason = String(updates.offMarketReason ?? '').trim()
        if (reason) merged.offMarketReason = reason
        else delete merged.offMarketReason
      }
      if (updates.offMarketAt !== undefined) {
        const at = String(updates.offMarketAt ?? '').trim()
        if (at) merged.offMarketAt = at
        else delete merged.offMarketAt
      }
    }
  }
  return ensurePropertyMonthlyRent(ensurePropertyBedLayout(merged))
}

/** Apply curated seed fields onto a matching portfolio rental. */
function applySeedFields(property, seedEntry) {
  if (!seedEntry) return property
  const seedDetails = normalizeAddressDetails(seedEntry.addressDetails)
  const next = {
    ...property,
    propertyType: normalizePropertyType(seedEntry.propertyType),
    rentalCategory: resolveRentalCategory(seedEntry.rentalCategory ?? property.rentalCategory),
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
  if (seedEntry.furnished === true || seedEntry.furnished === false) {
    next.furnished = seedEntry.furnished === true
  }
  if (seedEntry.pricingStructure != null) {
    next.pricingStructure = normalizePricingStructure(
      seedEntry.pricingStructure,
      next.furnished === true
    )
  }
  const seedDeposit = normalizeOptionalPositiveNumber(seedEntry.depositAmount)
  if (seedDeposit != null) next.depositAmount = Math.round(seedDeposit)
  if (seedEntry.utilitiesIncluded === true || seedEntry.utilitiesIncluded === false) {
    next.utilitiesIncluded = seedEntry.utilitiesIncluded === true
  }
  if (seedEntry.entireHomeOnly === true || seedEntry.entireHomeOnly === false) {
    next.entireHomeOnly = seedEntry.entireHomeOnly === true
  }
  if (Array.isArray(seedEntry.bedroomsLayout) && seedEntry.bedroomsLayout.length > 0) {
    next.bedroomsLayout = seedEntry.bedroomsLayout
  }
  if (seedDetails) {
    // Merge so seed street/city updates keep existing map pins when the seed
    // omits lat/lng, and seed coordinates backfill onto older store records.
    const existing = normalizeAddressDetails(property.addressDetails) ?? {}
    next.addressDetails = { ...existing, ...seedDetails }
  }
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
      withSeed.rentalCategory !== base.rentalCategory ||
      withSeed.maxTenants !== base.maxTenants ||
      withSeed.unitCount !== base.unitCount ||
      withSeed.bedrooms !== base.bedrooms ||
      withSeed.monthlyRent !== base.monthlyRent ||
      withSeed.furnished !== base.furnished ||
      withSeed.utilitiesIncluded !== base.utilitiesIncluded ||
      withSeed.bathrooms !== base.bathrooms ||
      withSeed.addressDetails !== base.addressDetails ||
      withSeed.addressConfirmed !== base.addressConfirmed
    ) {
      changed = true
    }

    const next = normalizeStoredProperty(withSeed)
    if (
      next.propertyType !== withSeed.propertyType ||
      next.rentalCategory !== withSeed.rentalCategory ||
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
        normalizedSynced.rentalCategory !== current.rentalCategory ||
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

  let bedroomsLayout
  if (body?.bedroomsLayout != null) {
    if (!Array.isArray(body.bedroomsLayout)) {
      return { error: 'Bedroom configuration is invalid' }
    }
    bedroomsLayout = normalizeBedroomsLayout(body.bedroomsLayout, bedrooms)
    if (!isCompleteBedroomsLayout(bedroomsLayout)) {
      return { error: 'Configure at least one bed with a size for every bedroom' }
    }
  } else if (!body?.importedFromLeaseScan) {
    // New landlord-created rentals should include layout; lease import may omit it
    bedroomsLayout = normalizeBedroomsLayout(undefined, bedrooms)
  }

  const derivedMax = bedroomsLayout
    ? Math.max(1, maxOccupancyFromLayout(bedroomsLayout))
    : null

  const maxTenantsRaw = Number(body?.maxTenants)
  const maxTenants =
    derivedMax != null
      ? derivedMax
      : Number.isFinite(maxTenantsRaw) && maxTenantsRaw >= 1 && Number.isInteger(maxTenantsRaw)
        ? maxTenantsRaw
        : null
  if (maxTenants == null || maxTenants < 1 || maxTenants > 500) {
    return { error: 'Maximum occupancy could not be determined from bed configuration' }
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
  if (!importedFromLeaseScan && monthlyRent == null) {
    return { error: 'Enter the total monthly rent' }
  }

  const furnished = body?.furnished === true
  let pricingStructure = normalizePricingStructure(body?.pricingStructure, furnished)
  if (String(body?.pricingStructure ?? '').trim().toLowerCase() === 'bed' && !furnished) {
    return { error: 'Pricing by bed is only available for furnished rentals' }
  }

  let depositAmount
  if (body?.depositAmount === null || body?.depositAmount === '') {
    depositAmount = null
  } else if (body?.depositAmount != null && body?.depositAmount !== undefined) {
    const depositRaw = Number(body.depositAmount)
    if (!Number.isFinite(depositRaw) || depositRaw <= 0) {
      return { error: 'Enter a valid deposit amount, or leave deposit blank' }
    }
    depositAmount = Math.round(depositRaw)
  }

  if (
    !importedFromLeaseScan &&
    body?.utilitiesIncluded !== true &&
    body?.utilitiesIncluded !== false
  ) {
    return { error: 'Choose whether utilities are included in rent' }
  }
  const utilitiesIncluded = body?.utilitiesIncluded === true
  const entireHomeOnly = body?.entireHomeOnly === true
  const defaultLeaseOptionRaw =
    body?.defaultLeaseOptionId == null ? '' : String(body.defaultLeaseOptionId).trim()
  const defaultLeaseOptionId = defaultLeaseOptionRaw || null

  let conditionReportRequired
  if (body?.conditionReportRequired === true) conditionReportRequired = true
  else if (body?.conditionReportRequired === false) conditionReportRequired = false
  else if (body?.conditionReportRequired === null || body?.conditionReportRequired === '') {
    conditionReportRequired = null
  }

  const offMarket = body?.offMarket === true
  let offMarketReason = null
  let offMarketAt = null
  if (body?.offMarketReason !== undefined) {
    const reason = String(body.offMarketReason ?? '').trim()
    offMarketReason = reason || null
  }
  if (body?.offMarketAt !== undefined) {
    const at = String(body.offMarketAt ?? '').trim()
    offMarketAt = at || null
  } else if (offMarket) {
    offMarketAt = new Date().toISOString()
  }

  return {
    address,
    propertyType,
    rentalCategory: resolveRentalCategory(body?.rentalCategory),
    unitCount: Math.floor(unitCount),
    bedrooms: bedroomsLayout ? bedroomsLayout.length : Math.floor(bedrooms),
    maxTenants: Math.floor(maxTenants),
    furnished,
    pricingStructure,
    utilitiesIncluded,
    entireHomeOnly,
    ...(bedroomsLayout ? { bedroomsLayout } : {}),
    ...(monthlyRent != null ? { monthlyRent } : {}),
    ...(depositAmount !== undefined ? { depositAmount } : {}),
    ...(body?.defaultLeaseOptionId !== undefined ? { defaultLeaseOptionId } : {}),
    ...(body?.conditionReportRequired !== undefined ? { conditionReportRequired } : {}),
    addressConfirmed: true,
    addressDetails: normalizeAddressDetails(body?.addressDetails),
    ...(importedFromLeaseScan ? { importedFromLeaseScan: true } : {}),
    ...(body?.offMarket !== undefined ? { offMarket } : {}),
    ...(body?.offMarketReason !== undefined ? { offMarketReason } : {}),
    ...(body?.offMarketAt !== undefined || body?.offMarket === true
      ? { offMarketAt }
      : {}),
  }
}
