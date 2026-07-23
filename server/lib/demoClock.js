/**
 * Shared Demo Mode “current date” — July of the demo year.
 * All mock leases, payment timelines, and overdue math agree on this instant.
 */
export const DEMO_YEAR = 2026
/** 0-indexed month: June = 5, July = 6 */
export const DEMO_MONTH_INDEX = 6
export const DEMO_DAY = 22

/** Fixed Demo Mode “today”: July 22, 2026 (local calendar). */
export function getDemoAsOfDate() {
  return new Date(DEMO_YEAR, DEMO_MONTH_INDEX, DEMO_DAY)
}

export function getDemoAsOfYmd() {
  return `${DEMO_YEAR}-07-${String(DEMO_DAY).padStart(2, '0')}`
}

export function getDemoAsOfIso() {
  return getDemoAsOfDate().toISOString()
}

/** January 1 or August 1 of a given year (Demo Mode lease starts only). */
export function demoLeaseStartYmd(month /* 'january' | 'august' */, year = DEMO_YEAR) {
  const m = month === 'august' ? '08' : '01'
  return `${year}-${m}-01`
}
