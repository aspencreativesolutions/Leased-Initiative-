/**
 * Student Housing vs Standard Rental (properties) and student vs standard renters (users).
 */
import type { RentalCategory, RenterCategory } from '@/types'

export type { RentalCategory, RenterCategory }

export const RENTAL_CATEGORIES: RentalCategory[] = ['student_housing', 'standard_rental']

export const RENTAL_CATEGORY_LABELS: Record<RentalCategory, string> = {
  student_housing: 'Student Housing',
  standard_rental: 'Standard Rental',
}

export const RENTER_CATEGORY_LABELS: Record<RenterCategory, string> = {
  student: 'Student',
  standard: 'Standard',
}

export function normalizeRentalCategory(value: unknown): RentalCategory | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (
    raw === 'student_housing' ||
    raw === 'student' ||
    raw === 'studenthousing'
  ) {
    return 'student_housing'
  }
  if (
    raw === 'standard_rental' ||
    raw === 'standard' ||
    raw === 'standardrental'
  ) {
    return 'standard_rental'
  }
  return null
}

/** Defaults missing/legacy values to Standard Rental so every rental is categorized. */
export function resolveRentalCategory(value: unknown): RentalCategory {
  return normalizeRentalCategory(value) ?? 'standard_rental'
}

export function rentalCategoryLabel(
  value: RentalCategory | string | null | undefined
): string | null {
  const canonical = normalizeRentalCategory(value)
  return canonical ? RENTAL_CATEGORY_LABELS[canonical] : null
}

export function normalizeRenterCategory(value: unknown): RenterCategory | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (
    raw === 'student' ||
    raw === 'student_housing' ||
    raw === 'student_renter' ||
    raw === 'studentrenter'
  ) {
    return 'student'
  }
  if (
    raw === 'standard' ||
    raw === 'standard_rental' ||
    raw === 'standard_renter' ||
    raw === 'standardrenter'
  ) {
    return 'standard'
  }
  return null
}

export function renterCategoryLabel(
  value: RenterCategory | string | null | undefined
): string | null {
  const canonical = normalizeRenterCategory(value)
  return canonical ? RENTER_CATEGORY_LABELS[canonical] : null
}

/** Map a rental category to the matching renter category. */
export function renterCategoryFromRental(
  value: RentalCategory | string | null | undefined
): RenterCategory | null {
  const rental = normalizeRentalCategory(value)
  if (rental === 'student_housing') return 'student'
  if (rental === 'standard_rental') return 'standard'
  return null
}

/** Map a renter category to the matching rental category. */
export function rentalCategoryFromRenter(
  value: RenterCategory | string | null | undefined
): RentalCategory | null {
  const renter = normalizeRenterCategory(value)
  if (renter === 'student') return 'student_housing'
  if (renter === 'standard') return 'standard_rental'
  return null
}
