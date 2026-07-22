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

/** Lease start: 1st of this month if today is the 1st, otherwise 1st of next month */
export function computeLeaseStartDate(asOf = new Date()) {
  const y = asOf.getFullYear()
  const m = asOf.getMonth()
  if (asOf.getDate() === 1) return formatYmd(y, m, 1)
  const next = new Date(y, m + 1, 1)
  return formatYmd(next.getFullYear(), next.getMonth(), 1)
}

/** End date is the day before start + N months */
export function computeLeaseEndDate(startYmd, months) {
  const start = parseYmd(startYmd)
  const endExclusive = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
  const end = new Date(endExclusive)
  end.setDate(end.getDate() - 1)
  return formatYmd(end.getFullYear(), end.getMonth(), end.getDate())
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
export function getLeaseRentSchedule(client, contract, asOf = new Date()) {
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

  const completedDues = new Set(
    (client?.deadlines ?? [])
      .filter((d) => d.type === 'payment' && d.completed)
      .map((d) => d.date.slice(0, 10))
  )

  const derivedDues =
    leaseStartDate && leaseEndDate
      ? listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
      : []

  const rentDueDates = derivedDues.length > 0 ? derivedDues : incompleteDues

  const todayYmd = formatYmd(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const sourceForNext = incompleteDues.length > 0 ? incompleteDues : rentDueDates
  const upcoming = sourceForNext.filter((d) => d >= todayYmd)
  const nextDueDate = upcoming[0] ?? (sourceForNext.length > 0 ? sourceForNext[0] : null)

  const payments = rentDueDates.map((dueDate, index) => {
    const monthLabel = parseYmd(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    let status = 'upcoming'
    if (completedDues.has(dueDate)) {
      status = 'paid'
    } else if (dueDate < todayYmd) {
      status = 'overdue'
    } else if (dueDate === nextDueDate) {
      status = 'due'
    }
    return {
      dueDate,
      label: index === 0 ? `Month 1 · ${monthLabel}` : `Month ${index + 1} · ${monthLabel}`,
      status,
    }
  })

  return {
    leaseLengthMonths,
    leaseStartDate,
    leaseEndDate,
    rentDueDates,
    nextDueDate,
    daysUntilNextDue: nextDueDate != null ? getDaysUntilDate(nextDueDate, asOf) : null,
    payments,
  }
}

export function resolveTenantAddress(client, contract) {
  const fromContract = contract?.clientAddress?.trim()
  if (fromContract && !fromContract.includes('[To be customized]')) return fromContract
  return client?.projectName?.trim() || ''
}
