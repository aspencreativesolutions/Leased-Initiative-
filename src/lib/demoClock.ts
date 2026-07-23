/**
 * Shared Demo Mode “current date” — July of the demo year.
 * Keep in sync with server/lib/demoClock.js.
 */
export const DEMO_YEAR = 2026
/** 0-indexed month: July = 6 */
export const DEMO_MONTH_INDEX = 6
export const DEMO_DAY = 22

/** Fixed Demo Mode “today”: July 22, 2026 (local calendar). */
export function getDemoAsOfDate(): Date {
  return new Date(DEMO_YEAR, DEMO_MONTH_INDEX, DEMO_DAY)
}

export function getDemoAsOfYmd(): string {
  return `${DEMO_YEAR}-07-${String(DEMO_DAY).padStart(2, '0')}`
}

export function getDemoAsOfIso(): string {
  return getDemoAsOfDate().toISOString()
}

/** January 1 or August 1 of a given year (Demo Mode lease starts only). */
export function demoLeaseStartYmd(
  month: 'january' | 'august',
  year: number = DEMO_YEAR
): string {
  const m = month === 'august' ? '08' : '01'
  return `${year}-${m}-01`
}
