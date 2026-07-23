import { PLACEHOLDER_MARKER } from '@/lib/contractPlaceholders'
import { getDemoAsOfDate } from '@/lib/demoClock'
import { isPublicDemoSession } from '@/lib/publicDemo'
import type { Client, ContractData, PortalRentPayment, PortalRentPaymentStatus } from '@/types'

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

/** Wall clock, or Demo Mode July date when a public demo session is active. */
export function resolveScheduleAsOf(asOf?: Date): Date {
  if (asOf) return asOf
  if (typeof window !== 'undefined' && isPublicDemoSession()) {
    return getDemoAsOfDate()
  }
  return new Date()
}

/**
 * Next seasonal lease start on or after asOf:
 * January 1 → December 31, or August 1 → July 31 (with a matching term length).
 */
export function computeLeaseStartDate(asOf: Date = new Date()): string {
  const y = asOf.getFullYear()
  const asOfYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const janThis = formatYmd(y, 0, 1)
  const augThis = formatYmd(y, 7, 1)
  const janNext = formatYmd(y + 1, 0, 1)

  if (asOfYmd <= janThis) return janThis
  if (asOfYmd <= augThis) return augThis
  return janNext
}

export type SeasonalLeaseStartMonth = 'january' | 'august'

export interface SeasonalLeaseStartOption {
  month: SeasonalLeaseStartMonth
  date: string
  label: string
}

/**
 * Next January 1 and August 1 on or after asOf (for Add Tenant lease start picker).
 */
export function listUpcomingSeasonalLeaseStarts(
  asOf: Date = new Date()
): SeasonalLeaseStartOption[] {
  const y = asOf.getFullYear()
  const asOfYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const candidates: Array<{ month: SeasonalLeaseStartMonth; date: string }> = [
    { month: 'january', date: formatYmd(y, 0, 1) },
    { month: 'august', date: formatYmd(y, 7, 1) },
    { month: 'january', date: formatYmd(y + 1, 0, 1) },
    { month: 'august', date: formatYmd(y + 1, 7, 1) },
  ]
  const nextJanuary = candidates.find(
    (c) => c.month === 'january' && c.date >= asOfYmd
  )
  const nextAugust = candidates.find((c) => c.month === 'august' && c.date >= asOfYmd)
  return [nextJanuary, nextAugust]
    .filter((c): c is { month: SeasonalLeaseStartMonth; date: string } => Boolean(c))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({
      ...c,
      label:
        c.month === 'january'
          ? `January 1, ${c.date.slice(0, 4)}`
          : `August 1, ${c.date.slice(0, 4)}`,
    }))
}

/** End date is the day before start + N months (e.g. Aug 1 + 12 mo → Jul 31) */
export function computeLeaseEndDate(startYmd: string, months: number): string {
  const start = parseYmd(startYmd)
  const endExclusive = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
  const end = new Date(endExclusive)
  end.setDate(end.getDate() - 1)
  return formatYmd(end.getFullYear(), end.getMonth(), end.getDate())
}

function isPlainYmd(value?: string | null): value is string {
  if (!value?.trim()) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return false
  const parsed = parseYmd(value.slice(0, 10))
  return !Number.isNaN(parsed.getTime())
}

/** Inclusive month span for a lease term (Jan 1–Dec 31 → 12). */
export function monthsBetweenLeaseDates(startYmd: string, endYmd: string): number {
  const start = parseYmd(startYmd.slice(0, 10))
  const end = parseYmd(endYmd.slice(0, 10))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return DEFAULT_LEASE_LENGTH_MONTHS
  }
  const endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
  const months =
    (endExclusive.getFullYear() - start.getFullYear()) * 12 +
    (endExclusive.getMonth() - start.getMonth())
  return Math.max(1, months)
}

export interface DefaultLeaseDatePrefs {
  customDefaultLeaseDates?: boolean
  defaultLeaseStartDate?: string
  defaultLeaseEndDate?: string
}

export interface ResolvedDefaultLeaseDates {
  leaseStartDate: string
  leaseEndDate: string
  leaseLengthMonths: number
  /** True when landlord custom calendar dates were applied. */
  usedCustomDates: boolean
}

/**
 * Resolve start/end for newly generated leases.
 * Seasonal Jan 1 / Aug 1 defaults unless the landlord enabled custom calendar dates.
 * Existing leases are never rewritten by this helper.
 */
export function resolveDefaultLeaseDates(
  prefs: DefaultLeaseDatePrefs | null | undefined,
  leaseLengthMonths: number = DEFAULT_LEASE_LENGTH_MONTHS,
  asOf: Date = new Date()
): ResolvedDefaultLeaseDates {
  const months = parseLeaseLengthMonths(leaseLengthMonths)

  if (
    prefs?.customDefaultLeaseDates &&
    isPlainYmd(prefs.defaultLeaseStartDate) &&
    isPlainYmd(prefs.defaultLeaseEndDate)
  ) {
    const leaseStartDate = prefs.defaultLeaseStartDate.slice(0, 10)
    const leaseEndDate = prefs.defaultLeaseEndDate.slice(0, 10)
    if (leaseEndDate >= leaseStartDate) {
      return {
        leaseStartDate,
        leaseEndDate,
        leaseLengthMonths: monthsBetweenLeaseDates(leaseStartDate, leaseEndDate),
        usedCustomDates: true,
      }
    }
  }

  const leaseStartDate = computeLeaseStartDate(asOf)
  return {
    leaseStartDate,
    leaseEndDate: computeLeaseEndDate(leaseStartDate, months),
    leaseLengthMonths: months,
    usedCustomDates: false,
  }
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

export function resolveCompletedPaymentStatus(
  dueYmd: string,
  paidAtYmd?: string
): Extract<PortalRentPaymentStatus, 'paid' | 'paid_early' | 'paid_late'> {
  if (!paidAtYmd) return 'paid'
  const paid = paidAtYmd.slice(0, 10)
  const due = dueYmd.slice(0, 10)
  if (paid < due) return 'paid_early'
  if (paid > due) return 'paid_late'
  return 'paid'
}

export function buildEarlyPaymentEventLabel(dueYmd: string, paidAtYmd: string): string {
  const month = parseYmd(dueYmd).toLocaleDateString('en-US', { month: 'long' })
  const paid = parseYmd(paidAtYmd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  return `${month} rent paid early on ${paid}`
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
  payments: PortalRentPayment[]
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
  asOf?: Date
): LeaseRentSchedule {
  const effectiveAsOf = resolveScheduleAsOf(asOf)
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

  const completedByDue = new Map(
    client.deadlines
      .filter((d) => d.type === 'payment' && d.completed)
      .map((d) => [d.date.slice(0, 10), d])
  )

  const derivedDues =
    leaseStartDate && leaseEndDate
      ? listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
      : []

  const rentDueDates = derivedDues.length > 0 ? derivedDues : incompleteDues

  const todayYmd = formatYmd(
    effectiveAsOf.getFullYear(),
    effectiveAsOf.getMonth(),
    effectiveAsOf.getDate()
  )

  // Only unpaid obligations drive next/overdue — never re-open completed dues.
  const unpaidDues =
    derivedDues.length > 0
      ? derivedDues.filter((d) => !completedByDue.has(d))
      : incompleteDues
  const pastDue = unpaidDues.filter((d) => d < todayYmd)
  const upcoming = unpaidDues.filter((d) => d >= todayYmd)
  // Oldest overdue first so landlord/tenant countdown agrees on past-due rent
  const nextDueDate = pastDue[0] ?? upcoming[0] ?? null

  const finalDueDate =
    rentDueDates.length > 0 ? rentDueDates[rentDueDates.length - 1] : null

  const payments: PortalRentPayment[] = rentDueDates.map((dueDate, index) => {
    const monthLabel = parseYmd(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    const completed = completedByDue.get(dueDate)
    let status: PortalRentPaymentStatus = 'upcoming'
    let paidAt: string | undefined
    let eventLabel: string | undefined

    if (completed) {
      paidAt = completed.paidAt?.slice(0, 10)
      eventLabel = completed.eventLabel
      status = resolveCompletedPaymentStatus(dueDate, paidAt)
      if (!eventLabel && status === 'paid_early' && paidAt) {
        eventLabel = buildEarlyPaymentEventLabel(dueDate, paidAt)
      }
    } else if (dueDate < todayYmd) {
      status = 'overdue'
    } else if (dueDate === nextDueDate && getDaysUntilDate(dueDate, effectiveAsOf) <= 0) {
      status = 'due'
    }

    return {
      dueDate,
      label: index === 0 ? `Month 1 · ${monthLabel}` : `Month ${index + 1} · ${monthLabel}`,
      status,
      paidAt,
      eventLabel,
    }
  })

  return {
    leaseLengthMonths,
    leaseStartDate,
    leaseEndDate,
    rentDueDates,
    nextDueDate,
    daysUntilNextDue: nextDueDate != null ? getDaysUntilDate(nextDueDate, effectiveAsOf) : null,
    finalDueDate,
    overduePaymentCount: pastDue.length,
    payments,
  }
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
