/**
 * Server twin of src/lib/rentalRent.ts — monthly rent generation + tenant share.
 * Keep algorithms in sync with the client module.
 */

const MONTHLY_RENT_RANGES = {
  'Single-Family Home': { min: 1500, max: 4500 },
  Townhouse: { min: 1300, max: 3500 },
  Duplex: { min: 1100, max: 2800 },
  Apartment: { min: 850, max: 3000 },
  'Condominium (Condo)': { min: 900, max: 3200 },
  Triplex: { min: 1000, max: 2600 },
  Fourplex: { min: 950, max: 2500 },
  'Multi-Family Building': { min: 850, max: 2400 },
  'Studio Apartment': { min: 700, max: 1800 },
  Loft: { min: 1100, max: 3200 },
  'Basement Apartment / Accessory Dwelling Unit': { min: 750, max: 2000 },
  'Vacation Rental': { min: 1200, max: 4500 },
}

function normalizeAddress(address) {
  return String(address ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function stableRentSeed(input) {
  let hash = 2166136261
  const str = String(input ?? '')
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function roundToRealisticRent(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const increment = amount >= 2500 ? 100 : amount >= 1500 ? 50 : 25
  return Math.round(amount / increment) * increment
}

function rentRangeForType(type) {
  return MONTHLY_RENT_RANGES[type] ?? MONTHLY_RENT_RANGES.Apartment
}

export function generateMonthlyRent(property) {
  const range = rentRangeForType(property.propertyType)
  const beds = Math.max(0, Math.floor(Number(property.bedrooms) || 0))
  const baths = Math.max(0, Number(property.bathrooms) || beds * 0.75)
  const maxTenants = Math.max(1, Math.floor(Number(property.maxTenants) || 1))
  const unitCount = Math.max(1, Math.floor(Number(property.unitCount) || 1))
  const sqft = Number(property.squareFeet)
  const state = property.addressDetails?.state?.toUpperCase?.() ?? ''

  const seed = stableRentSeed(
    [
      normalizeAddress(property.address),
      property.propertyType,
      beds,
      baths,
      maxTenants,
      unitCount,
      Number.isFinite(sqft) ? Math.floor(sqft) : '',
      state,
    ].join('|')
  )
  const jitter = (seed % 1000) / 1000

  let factor = 0.28
  factor += Math.min(beds, 5) * 0.1
  factor += Math.min(baths, 4) * 0.05
  factor += Math.min(maxTenants, 8) * 0.025
  if (Number.isFinite(sqft) && sqft > 0) {
    factor += clamp((sqft - 700) / 2500, -0.08, 0.18)
  }
  if (unitCount > 1) factor -= 0.04
  if (state === 'NY' || state === 'CA' || state === 'NJ') factor += 0.12
  else if (state === 'OH' || state === 'WV' || state === 'PA') factor -= 0.04

  factor = clamp(factor + (jitter - 0.5) * 0.12, 0.05, 0.95)
  const raw = range.min + (range.max - range.min) * factor
  return roundToRealisticRent(clamp(raw, range.min, range.max))
}

export function resolvePropertyMonthlyRent(property) {
  const stored = Number(property?.monthlyRent)
  if (Number.isFinite(stored) && stored > 0) {
    return roundToRealisticRent(stored)
  }
  return generateMonthlyRent(property)
}

export function ensurePropertyMonthlyRent(property) {
  if (!property || typeof property !== 'object') return property
  const monthlyRent = resolvePropertyMonthlyRent(property)
  if (property.monthlyRent === monthlyRent) return property
  return { ...property, monthlyRent }
}

export function tenantMonthlyShare({
  unitMonthlyRent,
  activeTenantCount,
  customShareAmount,
}) {
  const unit = Number(unitMonthlyRent)
  if (!Number.isFinite(unit) || unit <= 0) return null

  const custom = Number(customShareAmount)
  if (Number.isFinite(custom) && custom > 0) {
    return Math.round(custom * 100) / 100
  }

  const count = Math.max(0, Math.floor(Number(activeTenantCount) || 0))
  if (count <= 0) return null
  return Math.round((unit / count) * 100) / 100
}

export { MONTHLY_RENT_RANGES }
