/**
 * Deep-link from Rentals “View Applicants” to Dashboard Waiting / Pending,
 * scoped to a property so matching tiles/rows can flash briefly.
 */

export type RentalApplicantsFocusTarget = 'waiting' | 'pending'

export const RENTAL_APPLICANTS_PROPERTY_PARAM = 'applicants'
export const RENTAL_APPLICANTS_SECTION_PARAM = 'applicantsSection'

export function rentalApplicantsHref(
  propertyId: string,
  target: RentalApplicantsFocusTarget
): string {
  const params = new URLSearchParams()
  params.set(RENTAL_APPLICANTS_PROPERTY_PARAM, propertyId)
  if (target === 'pending') {
    params.set(RENTAL_APPLICANTS_SECTION_PARAM, 'pending')
  }
  const hash =
    target === 'waiting'
      ? 'tenants-waiting-connect'
      : 'dashboard-pending-tenants-list'
  return `/studio?${params.toString()}#${hash}`
}
