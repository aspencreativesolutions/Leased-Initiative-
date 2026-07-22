import { PLACEHOLDER_MARKER } from '@/lib/contractPlaceholders'
import type { Client, ContractData } from '@/types'

/** Common residential lease terms offered at tenant registration */
export const LEASE_LENGTH_OPTIONS = [6, 12, 18, 24] as const

export type LeaseLengthMonths = (typeof LEASE_LENGTH_OPTIONS)[number]

export const DEFAULT_LEASE_LENGTH_MONTHS: LeaseLengthMonths = 12

export function isLeaseLengthMonths(value: unknown): value is LeaseLengthMonths {
  const n = typeof value === 'string' ? Number(value) : value
  return (
    typeof n === 'number' &&
    Number.isFinite(n) &&
    (LEASE_LENGTH_OPTIONS as readonly number[]).includes(n)
  )
}

export function parseLeaseLengthMonths(
  value: unknown,
  fallback: LeaseLengthMonths = DEFAULT_LEASE_LENGTH_MONTHS
): LeaseLengthMonths {
  if (isLeaseLengthMonths(value)) {
    return Number(value) as LeaseLengthMonths
  }
  return fallback
}

export function formatLeaseLengthLabel(months: number): string {
  return months === 1 ? '1 month' : `${months} months`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatYmd(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isUsableLeaseDate(value?: string): value is string {
  if (!value?.trim()) return false
  if (value.includes(PLACEHOLDER_MARKER)) return false
  const parsed = value.includes('T') ? new Date(value) : parseYmd(value.slice(0, 10))
  return !Number.isNaN(parsed.getTime())
}

/** Lease start: 1st of this month if today is the 1st, otherwise 1st of next month */
export function computeLeaseStartDate(asOf: Date = new Date()): string {
  const y = asOf.getFullYear()
  const m = asOf.getMonth()
  if (asOf.getDate() === 1) return formatYmd(y, m, 1)
  const next = new Date(y, m + 1, 1)
  return formatYmd(next.getFullYear(), next.getMonth(), 1)
}

/** End date is the day before start + N months (e.g. Aug 1 + 12 mo → Jul 31) */
export function computeLeaseEndDate(startYmd: string, months: number): string {
  const start = parseYmd(startYmd)
  const endExclusive = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
  const end = new Date(endExclusive)
  end.setDate(end.getDate() - 1)
  return formatYmd(end.getFullYear(), end.getMonth(), end.getDate())
}

/** Monthly rent due dates on the 1st for each month of the lease */
export function listMonthlyRentDueDates(startYmd: string, endYmd: string): string[] {
  const start = parseYmd(startYmd)
  const end = parseYmd(endYmd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return []
  }

  let cursor =
    start.getDate() === 1
      ? new Date(start.getFullYear(), start.getMonth(), 1)
      : new Date(start.getFullYear(), start.getMonth() + 1, 1)

  const dues: string[] = []
  while (cursor <= end) {
    dues.push(formatYmd(cursor.getFullYear(), cursor.getMonth(), 1))
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return dues
}

/** Calendar days from asOf (local midnight) until dueYmd. Negative if overdue. */
export function getDaysUntilDate(dueYmd: string, asOf: Date = new Date()): number {
  const due = parseYmd(dueYmd.slice(0, 10))
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDaysRemainingLabel(days: number): string {
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  if (days > 1) return `${days} days left`
  if (days === -1) return '1 day overdue'
  return `${Math.abs(days)} days overdue`
}

export interface LeaseRentSchedule {
  leaseLengthMonths: number | null
  leaseStartDate: string | null
  leaseEndDate: string | null
  rentDueDates: string[]
  nextDueDate: string | null
  daysUntilNextDue: number | null
  finalDueDate: string | null
  overduePaymentCount: number
}

function resolveLeaseLengthMonths(
  client: Client,
  contract?: ContractData
): number | null {
  if (client.leaseLengthMonths && client.leaseLengthMonths > 0) {
    return client.leaseLengthMonths
  }
  const start = isUsableLeaseDate(contract?.startDate) ? contract!.startDate.slice(0, 10) : null
  const end = isUsableLeaseDate(contract?.completionDate)
    ? contract!.completionDate.slice(0, 10)
    : null
  if (start && end) {
    const startDate = parseYmd(start)
    const endDate = parseYmd(end)
    const months = Math.max(
      1,
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      )
    )
    return months
  }
  return null
}

/**
 * Prefer incomplete payment deadlines on the 1st; otherwise derive from lease dates.
 */
export function getLeaseRentSchedule(
  client: Client,
  contract?: ContractData,
  asOf: Date = new Date()
): LeaseRentSchedule {
  const leaseStartDate = isUsableLeaseDate(contract?.startDate)
    ? contract!.startDate.slice(0, 10)
    : null
  const leaseEndDate = isUsableLeaseDate(contract?.completionDate)
    ? contract!.completionDate.slice(0, 10)
    : null
  const leaseLengthMonths = resolveLeaseLengthMonths(client, contract)

  const incompleteDues = client.deadlines
    .filter((d) => d.type === 'payment' && !d.completed)
    .map((d) => d.date.slice(0, 10))
    .sort()

  const derivedDues =
    leaseStartDate && leaseEndDate
      ? listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
      : []

  const rentDueDates = derivedDues.length > 0 ? derivedDues : incompleteDues

  const todayYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const sourceForNext = incompleteDues.length > 0 ? incompleteDues : rentDueDates
  const upcoming = sourceForNext.filter((d) => d >= todayYmd)
  const nextDueDate =
    upcoming[0] ?? (sourceForNext.length > 0 ? sourceForNext[0] : null)

  const finalDueDate =
    derivedDues.length > 0
      ? derivedDues[derivedDues.length - 1]
      : incompleteDues.length > 0
        ? incompleteDues[incompleteDues.length - 1]
        : null

  return {
    leaseLengthMonths,
    leaseStartDate,
    leaseEndDate,
    rentDueDates,
    nextDueDate,
    daysUntilNextDue: nextDueDate != null ? getDaysUntilDate(nextDueDate, asOf) : null,
    finalDueDate,
    overduePaymentCount: countOverduePayments(sourceForNext, todayYmd, nextDueDate),
  }
}

/** Past-due incomplete payment dates; falls back to 1 when the next due is already overdue. */
function countOverduePayments(
  sourceForNext: string[],
  todayYmd: string,
  nextDueDate: string | null
): number {
  const pastDue = sourceForNext.filter((d) => d < todayYmd)
  if (pastDue.length > 0) return pastDue.length
  if (nextDueDate != null && nextDueDate < todayYmd) return 1
  return 0
}

export function buildMonthlyRentDeadlinePayloads(
  dueDates: string[],
  idFactory: () => string
): Array<{
  id: string
  type: 'payment'
  date: string
  label: string
  completed: false
}> {
  return dueDates.map((date, index) => {
    const monthLabel = parseYmd(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    return {
      id: idFactory(),
      type: 'payment' as const,
      date,
      label: index === 0 ? `First month rent due (${monthLabel})` : `Rent due — ${monthLabel}`,
      completed: false as const,
    }
  })
}
