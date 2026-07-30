/**
 * Student Housing vs Standard Rental (properties) and student vs standard renters (users).
 */

export const RENTAL_CATEGORIES = ['student_housing', 'standard_rental']

export const RENTAL_CATEGORY_LABELS = {
  student_housing: 'Student Housing',
  standard_rental: 'Standard Rental',
}

export const RENTER_CATEGORY_LABELS = {
  student: 'Student',
  standard: 'Standard',
}

export function normalizeRentalCategory(value) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (raw === 'student_housing' || raw === 'student' || raw === 'studenthousing') {
    return 'student_housing'
  }
  if (raw === 'standard_rental' || raw === 'standard' || raw === 'standardrental') {
    return 'standard_rental'
  }
  return null
}

/** Defaults missing/legacy values to Standard Rental so every rental is categorized. */
export function resolveRentalCategory(value) {
  return normalizeRentalCategory(value) ?? 'standard_rental'
}

export function rentalCategoryLabel(value) {
  const canonical = normalizeRentalCategory(value)
  return canonical ? RENTAL_CATEGORY_LABELS[canonical] : null
}

export function normalizeRenterCategory(value) {
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

export function renterCategoryLabel(value) {
  const canonical = normalizeRenterCategory(value)
  return canonical ? RENTER_CATEGORY_LABELS[canonical] : null
}

export function renterCategoryFromRental(value) {
  const rental = normalizeRentalCategory(value)
  if (rental === 'student_housing') return 'student'
  if (rental === 'standard_rental') return 'standard'
  return null
}

export function rentalCategoryFromRenter(value) {
  const renter = normalizeRenterCategory(value)
  if (renter === 'student') return 'student_housing'
  if (renter === 'standard') return 'standard_rental'
  return null
}
