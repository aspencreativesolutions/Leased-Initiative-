import {
  activeTenantsAtProperty,
  findPropertyByAddress,
  normalizePropertyAddress,
} from '@/lib/properties'
import {
  ensurePropertyBedLayout,
  tenantShareForAssignedBed,
} from '@/lib/rentalBeds'
import type {
  Client,
  ContractData,
  Property,
  PropertyHousingType,
} from '@/types'

/** Configurable monthly rent ranges by rental type ($/month per rentable unit). */
export const MONTHLY_RENT_RANGES: Record<
  PropertyHousingType,
  { min: number; max: number }
> = {
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

export type PropertyRentInput = Pick<
  Property,
  'address' | 'propertyType' | 'bedrooms' | 'maxTenants' | 'unitCount'
> & {
  bathrooms?: number
  squareFeet?: number
  monthlyRent?: number
  addressDetails?: Property['addressDetails']
}

/** Format USD with commas (no cents for whole dollars). */
export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  const rounded = Math.round(amount)
  return `$${rounded.toLocaleString('en-US')}`
}

/** Extract unit label from an address (Unit A, Apt 11, #301, etc.). */
export function extractUnitLabel(address?: string): string | null {
  if (!address?.trim()) return null
  const patterns = [
    /\b(?:Unit|Apt\.?|Apartment|Suite)\s+([A-Za-z0-9-]+)\b/i,
    /\bSte\.\s*([A-Za-z0-9-]+)\b/i,
    /\s#\s*([A-Za-z0-9-]+)\b/,
  ]
  for (const pattern of patterns) {
    const match = address.match(pattern)
    if (match?.[1]) {
      const raw = match[1]
      if (/^(unit|apt|apartment|suite|ste)$/i.test(raw)) continue
      const prefix = match[0].match(/^(Unit|Apt\.?|Apartment|Suite|Ste\.)/i)?.[1]
      if (prefix) {
        return `${prefix.replace(/\.$/, '')} ${raw}`.replace(/^Apt$/i, 'Apt').trim()
      }
      if (/^[A-Za-z]$/.test(raw) || /^\d/.test(raw)) {
        return `Unit ${raw}`
      }
      return `Unit ${raw}`
    }
  }
  return null
}

/** Stable 32-bit hash so generated rents do not change across reloads. */
export function stableRentSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Round to clean listing increments ($25 / $50 / $100 by magnitude). */
export function roundToRealisticRent(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const increment = amount >= 2500 ? 100 : amount >= 1500 ? 50 : 25
  return Math.round(amount / increment) * increment
}

function rentRangeForType(type: PropertyHousingType): { min: number; max: number } {
  return MONTHLY_RENT_RANGES[type] ?? MONTHLY_RENT_RANGES.Apartment
}

/**
 * Deterministic monthly rent for a rentable unit/property from type + attributes.
 * Does not mutate; call ensurePropertyMonthlyRent to persist.
 */
export function generateMonthlyRent(property: PropertyRentInput): number {
  const range = rentRangeForType(property.propertyType)
  const beds = Math.max(0, Math.floor(Number(property.bedrooms) || 0))
  const baths = Math.max(0, Number(property.bathrooms) || beds * 0.75)
  const maxTenants = Math.max(1, Math.floor(Number(property.maxTenants) || 1))
  const unitCount = Math.max(1, Math.floor(Number(property.unitCount) || 1))
  const sqft = Number(property.squareFeet)
  const state = property.addressDetails?.state?.toUpperCase() ?? ''

  const seed = stableRentSeed(
    [
      normalizePropertyAddress(property.address),
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

  // Position within range from beds / baths / occupancy / size
  let factor = 0.28
  factor += Math.min(beds, 5) * 0.1
  factor += Math.min(baths, 4) * 0.05
  factor += Math.min(maxTenants, 8) * 0.025
  if (Number.isFinite(sqft) && sqft > 0) {
    factor += clamp((sqft - 700) / 2500, -0.08, 0.18)
  }
  // Multi-unit building entries priced per unit — slight discount vs whole-home
  if (unitCount > 1) factor -= 0.04
  // Mild regional nudge (OH/WV demo corridor vs higher-cost labels)
  if (state === 'NY' || state === 'CA' || state === 'NJ') factor += 0.12
  else if (state === 'OH' || state === 'WV' || state === 'PA') factor -= 0.04

  factor = clamp(factor + (jitter - 0.5) * 0.12, 0.05, 0.95)
  const raw = range.min + (range.max - range.min) * factor
  return roundToRealisticRent(clamp(raw, range.min, range.max))
}

/** Prefer stored monthlyRent; otherwise generate a stable amount. */
export function resolvePropertyMonthlyRent(property: PropertyRentInput): number {
  const stored = Number(property.monthlyRent)
  if (Number.isFinite(stored) && stored > 0) {
    return roundToRealisticRent(stored)
  }
  return generateMonthlyRent(property)
}

/** Return a property copy with monthlyRent set (stable across calls). */
export function ensurePropertyMonthlyRent<T extends PropertyRentInput>(property: T): T & {
  monthlyRent: number
} {
  const monthlyRent = resolvePropertyMonthlyRent(property)
  if (property.monthlyRent === monthlyRent) {
    return property as T & { monthlyRent: number }
  }
  return { ...property, monthlyRent }
}

/**
 * Equal-split tenant share of unit rent, unless a custom share is set.
 * Uses actual assigned active tenants — never max occupancy as the divisor.
 */
export function tenantMonthlyShare(options: {
  unitMonthlyRent: number
  activeTenantCount: number
  customShareAmount?: number | null
}): number | null {
  const unit = Number(options.unitMonthlyRent)
  if (!Number.isFinite(unit) || unit <= 0) return null

  const custom = Number(options.customShareAmount)
  if (Number.isFinite(custom) && custom > 0) {
    return Math.round(custom * 100) / 100
  }

  const count = Math.max(0, Math.floor(Number(options.activeTenantCount) || 0))
  if (count <= 0) return null
  return Math.round((unit / count) * 100) / 100
}

export interface RentalPricingSummary {
  unitMonthlyRent: number
  currentOccupancy: number
  maxOccupancy: number
  tenantShare: number | null
  unitLabel: string | null
  isOccupied: boolean
  isShared: boolean
}

/** Pricing + occupancy snapshot for Rentals tiles / spreadsheet. */
export function buildRentalPricingSummary(
  property: Property,
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined
): RentalPricingSummary {
  const ensured = ensurePropertyBedLayout(property)
  const unitMonthlyRent = resolvePropertyMonthlyRent(ensured)
  const active = activeTenantsAtProperty(ensured, clients, getContract)
  const currentOccupancy = active.length

  let tenantShare: number | null = null
  if (currentOccupancy > 0) {
    const shares = active.map((tenant) => {
      const onSameBed = active.filter(
        (t) => t.bedId && tenant.bedId && t.bedId === tenant.bedId
      )
      return tenantShareForAssignedBed(
        ensured,
        tenant,
        onSameBed.length > 0 ? onSameBed : [tenant]
      )
    })
    const valid = shares.filter((n): n is number => n != null && Number.isFinite(n))
    if (valid.length > 0) {
      tenantShare =
        Math.round((valid.reduce((sum, n) => sum + n, 0) / valid.length) * 100) / 100
    } else {
      tenantShare = tenantMonthlyShare({
        unitMonthlyRent,
        activeTenantCount: currentOccupancy,
      })
    }
  }

  return {
    unitMonthlyRent,
    currentOccupancy,
    maxOccupancy: ensured.maxTenants,
    tenantShare,
    unitLabel: extractUnitLabel(ensured.address),
    isOccupied: currentOccupancy > 0,
    isShared: currentOccupancy > 1,
  }
}

export interface TenantRentResponsibility {
  property: Property | undefined
  unitMonthlyRent: number | null
  tenantShare: number | null
  unitLabel: string | null
  activeTenantCount: number
  amountPaidTowardPeriod: number
  remainingBalance: number | null
}

/**
 * Resolve a tenant’s payment responsibility from their assigned rental unit.
 * Shared source of truth with Rentals (`Property.monthlyRent`).
 */
export function resolveTenantRentResponsibility(
  client: Client,
  contract: ContractData | undefined,
  properties: Property[],
  clients: Client[],
  getContract: (clientId: string) => ContractData | undefined,
  options?: {
    /** Display status used to infer paid-in-full for the current period */
    periodFullyPaid?: boolean
    /** Overdue amount already computed from share × overdue months */
    overdueAmount?: number | null
  }
): TenantRentResponsibility {
  const address =
    (contract?.clientAddress?.trim() || client.projectName?.trim() || '') || undefined
  const property = findPropertyByAddress(properties, address)
  const unitLabel = extractUnitLabel(address) ?? (property ? extractUnitLabel(property.address) : null)

  if (!property) {
    return {
      property: undefined,
      unitMonthlyRent: null,
      tenantShare: null,
      unitLabel,
      activeTenantCount: 0,
      amountPaidTowardPeriod: Number(client.currentPeriodAmountPaid) || 0,
      remainingBalance: null,
    }
  }

  const unitMonthlyRent = resolvePropertyMonthlyRent(property)
  const active = activeTenantsAtProperty(property, clients, getContract)
  // Include this tenant when they are official but not yet “in term” (upcoming lease)
  const cohort = active.some((t) => t.id === client.id)
    ? active
    : client.isOfficialClient
      ? [...active, client]
      : active
  const activeTenantCount = Math.max(1, cohort.length)
  const ensured = ensurePropertyBedLayout(property)
  const onSameBed =
    client.bedId != null
      ? cohort.filter((t) => t.bedId === client.bedId)
      : [client]
  const tenantShare = tenantShareForAssignedBed(
    ensured,
    client,
    onSameBed.length > 0 ? onSameBed : [client]
  ) ?? tenantMonthlyShare({
    unitMonthlyRent,
    activeTenantCount,
    customShareAmount: client.rentShareAmount,
  })

  const explicitPaid = Number(client.currentPeriodAmountPaid)
  let amountPaidTowardPeriod = Number.isFinite(explicitPaid) && explicitPaid >= 0 ? explicitPaid : 0

  if (options?.periodFullyPaid && tenantShare != null) {
    amountPaidTowardPeriod = tenantShare
  }

  let remainingBalance: number | null = null
  if (tenantShare != null) {
    if (options?.overdueAmount != null && options.overdueAmount > 0) {
      remainingBalance =
        Math.round(Math.max(0, options.overdueAmount - amountPaidTowardPeriod) * 100) / 100
    } else {
      remainingBalance =
        Math.round(Math.max(0, tenantShare - amountPaidTowardPeriod) * 100) / 100
    }
  }

  return {
    property,
    unitMonthlyRent,
    tenantShare,
    unitLabel,
    activeTenantCount,
    amountPaidTowardPeriod,
    remainingBalance,
  }
}
