import { formatUsd } from '@/lib/rentalRent'

/** Fields used to describe a rental in tenant address pickers. */
export type PropertyListingDetail = {
  furnished?: boolean
  monthlyRent?: number | null
  costPerPersonAtMax?: number | null
  utilitiesIncluded?: boolean
}

/**
 * Compact one-line description under a Desired Address option:
 * Furnished · $X total · $Y/person at full occupancy · Utilities included|not included
 */
export function formatPropertyListingDescription(detail: PropertyListingDetail): string {
  const parts: string[] = [detail.furnished ? 'Furnished' : 'Unfurnished']
  if (detail.monthlyRent != null && detail.monthlyRent > 0) {
    parts.push(`${formatUsd(detail.monthlyRent)} total`)
  }
  if (detail.costPerPersonAtMax != null && detail.costPerPersonAtMax > 0) {
    parts.push(`${formatUsd(detail.costPerPersonAtMax)}/person at full occupancy`)
  }
  parts.push(detail.utilitiesIncluded === true ? 'Utilities included' : 'Utilities not included')
  return parts.join(' · ')
}

export function utilitiesIncludedLabel(utilitiesIncluded: boolean | undefined): string {
  return utilitiesIncluded === true ? 'Utilities included' : 'Utilities not included'
}
