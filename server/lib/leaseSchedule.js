import { resolveServerScheduleAsOf } from './scheduleAsOf.js'

/** Common residential lease terms offered at tenant registration */
export const LEASE_LENGTH_OPTIONS = [6, 12, 18, 24]

export const DEFAULT_LEASE_LENGTH_MONTHS = 12

export function isLeaseLengthMonths(value) {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) && LEASE_LENGTH_OPTIONS.includes(n)
}

export function parseLeaseLengthMonths(value, fallback = DEFAULT_LEASE_LENGTH_MONTHS) {
  return isLeaseLengthMonths(value) ? Number(value) : fallback
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function formatYmd(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

export function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Next seasonal lease start on or after asOf:
 * January 1 → December 31, or August 1 → July 31 (with a matching term length).
 */
export function computeLeaseStartDate(asOf = new Date()) {
  const y = asOf.getFullYear()
  const asOfYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const janThis = formatYmd(y, 0, 1)
  const augThis = formatYmd(y, 7, 1)
  const janNext = formatYmd(y + 1, 0, 1)

  if (asOfYmd <= janThis) return janThis
  if (asOfYmd <= augThis) return augThis
  return janNext
}

/** End date is the day before start + N months */
export function computeLeaseEndDate(startYmd, months) {
  const start = parseYmd(startYmd)
  const endExclusive = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
  const end = new Date(endExclusive)
  end.setDate(end.getDate() - 1)
  return formatYmd(end.getFullYear(), end.getMonth(), end.getDate())
}

function isPlainYmd(value) {
  if (!value || typeof value !== 'string' || !value.trim()) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return false
  const parsed = parseYmd(value.slice(0, 10))
  return !Number.isNaN(parsed.getTime())
}

export { isPlainYmd }

/** Lease start must be strictly after asOf’s calendar day (future dates only). */
export function isFutureLeaseStartDate(ymd, asOf = new Date()) {
  if (!isPlainYmd(ymd)) return false
  const asOfYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return ymd.slice(0, 10) > asOfYmd
}

/** Inclusive month span for a lease term (Jan 1–Dec 31 → 12). */
export function monthsBetweenLeaseDates(startYmd, endYmd) {
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

/**
 * Normalize eras from settings, migrating a legacy single custom start/end pair
 * into the eras array when present.
 */
export function normalizeCustomLeaseEras(prefs) {
  const eras = Array.isArray(prefs?.customLeaseEras)
    ? prefs.customLeaseEras.filter(
        (era) =>
          era &&
          typeof era.id === 'string' &&
          isPlainYmd(era.startDate) &&
          isPlainYmd(era.endDate) &&
          era.endDate.slice(0, 10) >= era.startDate.slice(0, 10)
      )
    : []

  if (
    eras.length === 0 &&
    prefs?.customDefaultLeaseDates &&
    isPlainYmd(prefs.defaultLeaseStartDate) &&
    isPlainYmd(prefs.defaultLeaseEndDate) &&
    prefs.defaultLeaseEndDate.slice(0, 10) >= prefs.defaultLeaseStartDate.slice(0, 10)
  ) {
    return [
      {
        id: 'legacy-custom-default',
        startDate: prefs.defaultLeaseStartDate.slice(0, 10),
        endDate: prefs.defaultLeaseEndDate.slice(0, 10),
        label: 'Custom lease era',
      },
    ]
  }

  return eras.map((era) => ({
    id: era.id,
    startDate: era.startDate.slice(0, 10),
    endDate: era.endDate.slice(0, 10),
    label: typeof era.label === 'string' && era.label.trim() ? era.label.trim() : undefined,
  }))
}

export function seasonalLeaseOptionId(months) {
  return `seasonal-${months}`
}

export function formatCustomLeaseEraLabel(era) {
  if (era?.label && String(era.label).trim()) return String(era.label).trim()
  const months = monthsBetweenLeaseDates(era.startDate, era.endDate)
  return `${era.startDate.slice(0, 10)} – ${era.endDate.slice(0, 10)} (${formatLeaseLengthLabel(months)})`
}

/**
 * Seasonal length options (6/12/18/24) plus landlord custom lease eras.
 */
export function listDefaultLeaseOptions(prefs, asOf = new Date()) {
  const seasonalStart = computeLeaseStartDate(asOf)
  const seasonal = LEASE_LENGTH_OPTIONS.map((months) => {
    const leaseEndDate = computeLeaseEndDate(seasonalStart, months)
    return {
      id: seasonalLeaseOptionId(months),
      kind: 'seasonal',
      label: formatLeaseLengthLabel(months),
      detail: `${seasonalStart} – ${leaseEndDate}`,
      leaseStartDate: seasonalStart,
      leaseEndDate,
      leaseLengthMonths: months,
    }
  })

  const custom = normalizeCustomLeaseEras(prefs).map((era) => {
    const leaseStartDate = era.startDate.slice(0, 10)
    const leaseEndDate = era.endDate.slice(0, 10)
    const leaseLengthMonths = monthsBetweenLeaseDates(leaseStartDate, leaseEndDate)
    return {
      id: era.id,
      kind: 'custom',
      label: formatCustomLeaseEraLabel(era),
      detail: `${leaseStartDate} – ${leaseEndDate}`,
      leaseStartDate,
      leaseEndDate,
      leaseLengthMonths,
    }
  })

  return [...seasonal, ...custom]
}

export function findDefaultLeaseOption(prefs, optionId, asOf = new Date()) {
  if (!optionId || !String(optionId).trim()) return undefined
  return listDefaultLeaseOptions(prefs, asOf).find((option) => option.id === optionId)
}

/**
 * Resolve start/end for newly generated leases.
 * Prefer an explicit option id when provided; otherwise seasonal Jan 1 / Aug 1
 * (or a legacy single custom pair when still enabled).
 * Existing leases are never rewritten by this helper.
 */
export function resolveDefaultLeaseDates(
  prefs,
  leaseLengthMonths = DEFAULT_LEASE_LENGTH_MONTHS,
  asOf = new Date(),
  optionId
) {
  if (optionId && String(optionId).trim()) {
    const option = findDefaultLeaseOption(prefs, optionId, asOf)
    if (option) {
      return {
        leaseStartDate: option.leaseStartDate,
        leaseEndDate: option.leaseEndDate,
        leaseLengthMonths: option.leaseLengthMonths,
        usedCustomDates: option.kind === 'custom',
      }
    }
  }

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
export function listMonthlyRentDueDates(startYmd, endYmd) {
  const start = parseYmd(startYmd)
  const end = parseYmd(endYmd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return []
  }

  let cursor =
    start.getDate() === 1
      ? new Date(start.getFullYear(), start.getMonth(), 1)
      : new Date(start.getFullYear(), start.getMonth() + 1, 1)

  const dues = []
  while (cursor <= end) {
    dues.push(formatYmd(cursor.getFullYear(), cursor.getMonth(), 1))
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return dues
}

export function buildMonthlyRentDeadlines(dueDates, generateId) {
  return dueDates.map((date, index) => {
    const monthLabel = parseYmd(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    return {
      id: generateId(),
      type: 'payment',
      date,
      label: index === 0 ? `First month rent due (${monthLabel})` : `Rent due — ${monthLabel}`,
      completed: false,
    }
  })
}

export function formatLeaseLengthLabel(months) {
  return months === 1 ? '1 month' : `${months} months`
}

function isUsableLeaseDate(value) {
  if (!value || typeof value !== 'string' || !value.trim()) return false
  if (value.includes('[To be customized]')) return false
  const parsed = value.includes('T') ? new Date(value) : parseYmd(value.slice(0, 10))
  return !Number.isNaN(parsed.getTime())
}

function resolveLeaseLengthMonths(client, contract) {
  if (client?.leaseLengthMonths && client.leaseLengthMonths > 0) {
    return client.leaseLengthMonths
  }
  const start = isUsableLeaseDate(contract?.startDate) ? contract.startDate.slice(0, 10) : null
  const end = isUsableLeaseDate(contract?.completionDate)
    ? contract.completionDate.slice(0, 10)
    : null
  if (start && end) {
    const startDate = parseYmd(start)
    const endDate = parseYmd(end)
    return Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    )
  }
  return null
}

function getDaysUntilDate(dueYmd, asOf = new Date()) {
  const due = parseYmd(dueYmd.slice(0, 10))
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** Portal / admin rent schedule for a tenant lease (6-mo, 12-mo, etc.). */
export function getLeaseRentSchedule(client, contract, asOf) {
  asOf = resolveServerScheduleAsOf(asOf)
  const leaseStartDate = isUsableLeaseDate(contract?.startDate)
    ? contract.startDate.slice(0, 10)
    : null
  const leaseEndDate = isUsableLeaseDate(contract?.completionDate)
    ? contract.completionDate.slice(0, 10)
    : null
  const leaseLengthMonths = resolveLeaseLengthMonths(client, contract)

  const incompleteDues = (client?.deadlines ?? [])
    .filter((d) => d.type === 'payment' && !d.completed)
    .map((d) => d.date.slice(0, 10))
    .sort()

  const completedByDue = new Map(
    (client?.deadlines ?? [])
      .filter((d) => d.type === 'payment' && d.completed)
      .map((d) => [d.date.slice(0, 10), d])
  )

  const derivedDues =
    leaseStartDate && leaseEndDate
      ? listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
      : []

  const rentDueDates = derivedDues.length > 0 ? derivedDues : incompleteDues

  const todayYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
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

  const payments = rentDueDates.map((dueDate, index) => {
    const monthLabel = parseYmd(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    const completed = completedByDue.get(dueDate)
    let status = 'upcoming'
    let paidAt
    let eventLabel

    if (completed) {
      paidAt = completed.paidAt?.slice(0, 10)
      eventLabel = completed.eventLabel
      status = resolveCompletedPaymentStatus(dueDate, paidAt)
      if (!eventLabel && status === 'paid_early' && paidAt) {
        eventLabel = buildEarlyPaymentEventLabel(dueDate, paidAt)
      }
    } else if (dueDate < todayYmd) {
      status = 'overdue'
    } else if (dueDate === nextDueDate && getDaysUntilDate(dueDate, asOf) <= 0) {
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
    daysUntilNextDue: nextDueDate != null ? getDaysUntilDate(nextDueDate, asOf) : null,
    finalDueDate,
    overduePaymentCount: pastDue.length,
    payments,
  }
}

/** paid / paid_early / paid_late from due date vs received date */
export function resolveCompletedPaymentStatus(dueYmd, paidAtYmd) {
  if (!paidAtYmd) return 'paid'
  const paid = paidAtYmd.slice(0, 10)
  const due = dueYmd.slice(0, 10)
  if (paid < due) return 'paid_early'
  if (paid > due) return 'paid_late'
  return 'paid'
}

export function buildEarlyPaymentEventLabel(dueYmd, paidAtYmd) {
  const month = parseYmd(dueYmd).toLocaleDateString('en-US', { month: 'long' })
  const paid = parseYmd(paidAtYmd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  return `${month} rent paid early on ${paid}`
}

export function resolveTenantAddress(client, contract) {
  const fromContract = contract?.clientAddress?.trim()
  if (fromContract && !fromContract.includes('[To be customized]')) return fromContract
  return client?.projectName?.trim() || ''
}
