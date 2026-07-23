import {
  DEMO_YEAR,
  demoLeaseStartYmd,
  getDemoAsOfDate,
  getDemoAsOfIso,
  getDemoAsOfYmd,
} from './demoClock.js'
import {
  buildMonthlyRentDeadlines,
  computeLeaseEndDate,
  listMonthlyRentDueDates,
  parseYmd,
} from './leaseSchedule.js'

/**
 * Canonical Demo Mode lease + payment scenarios.
 * Lease starts are only January 1 or August 1.
 * “Today” is always the shared demo clock (July).
 */

/** @typedef {'paid' | 'paid_early' | 'paid_late' | 'overdue' | 'upcoming'} DemoPaymentKind */

/**
 * @typedef {Object} DemoMonthSpec
 * @property {DemoPaymentKind} kind
 * @property {string} [paidAt] YYYY-MM-DD when rent was received
 */

/**
 * @typedef {Object} DemoLeaseScenario
 * @property {'january' | 'august'} leaseStartMonth
 * @property {number} [leaseStartYear]
 * @property {number} leaseMonths
 * @property {number} monthlyRent
 * @property {string} [paymentStatus]
 * @property {Record<string, DemoMonthSpec>} [months] keyed by YYYY-MM-01
 * @property {boolean} [leaseNotStarted]
 */

/** @type {Record<string, DemoLeaseScenario>} */
export const DEMO_LEASE_SCENARIOS = {
  // Active POV tenant — Aug 2025 start, 12-month term ending soon (July 31, 2026)
  'active@leased.test': {
    leaseStartMonth: 'august',
    leaseStartYear: 2025,
    leaseMonths: 12,
    monthlyRent: 1950,
    paymentStatus: 'Deposit Paid',
    months: {
      '2025-08-01': { kind: 'paid', paidAt: '2025-08-01' },
      '2025-09-01': { kind: 'paid', paidAt: '2025-09-01' },
      '2025-10-01': { kind: 'paid_early', paidAt: '2025-09-28' },
      '2025-11-01': { kind: 'paid', paidAt: '2025-11-01' },
      '2025-12-01': { kind: 'paid_late', paidAt: '2025-12-08' },
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid', paidAt: '2026-03-01' },
      '2026-04-01': { kind: 'paid_early', paidAt: '2026-03-27' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'paid', paidAt: '2026-07-01' },
    },
  },

  // Lease sent — August 2026 start, not begun; first month paid early
  'awaiting@leased.test': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 1750,
    paymentStatus: 'Unpaid',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: '2026-07-18' },
    },
  },

  // July currently past due; January 2026 start, active 12-month term
  'james@chenarch.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 2100,
    paymentStatus: 'Overdue',
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-03' },
      '2026-03-01': { kind: 'paid_early', paidAt: '2026-02-26' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid_late', paidAt: '2026-05-12' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'overdue' },
    },
  },

  // Accepted pending tenant — lease sent for August 2026 start, awaiting signature
  'emily@rodriguezwellness.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 1650,
    paymentStatus: 'Unpaid',
    leaseNotStarted: true,
    months: {},
  },

  // Signed lease begins August 2026 — upcoming (not active until Aug 1); first rent paid early
  'marcus@webblegal.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 2200,
    paymentStatus: 'Deposit Paid',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: getDemoAsOfYmd() },
    },
  },

  // Six-month term (Jan 1 → June 30); completed as of demo today; shares Portland Unit 4 with James
  'lisa@parkphoto.com': {
    leaseStartMonth: 'january',
    leaseMonths: 6,
    monthlyRent: 1850,
    paymentStatus: 'Paid',
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid_early', paidAt: '2026-02-24' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid_late', paidAt: '2026-06-14' },
    },
  },
}

/** Pending tenant preferred start (no lease record yet). */
export const DEMO_PENDING_PREFERRED_START = demoLeaseStartYmd('august', DEMO_YEAR)

export function resolveDemoScenario(email) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  return DEMO_LEASE_SCENARIOS[normalized] ?? null
}

export function scenarioLeaseDates(scenario) {
  const year = scenario.leaseStartYear ?? DEMO_YEAR
  const start = demoLeaseStartYmd(scenario.leaseStartMonth, year)
  const end = computeLeaseEndDate(start, scenario.leaseMonths)
  return { leaseStartDate: start, leaseEndDate: end }
}

function monthLabelLong(dueYmd) {
  return parseYmd(dueYmd).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function earlyEventLabel(dueYmd, paidAt) {
  const month = monthLabelLong(dueYmd).replace(/ \d{4}$/, '')
  const paid = parseYmd(paidAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  return `${month} rent paid early on ${paid}`
}

function lateEventLabel(dueYmd, paidAt) {
  const month = monthLabelLong(dueYmd)
  const paid = parseYmd(paidAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
  return `${month} rent paid late on ${paid}`
}

/**
 * Build full monthly payment deadlines for a demo scenario (shared landlord/tenant source).
 * Prospective applicants with no month specs get an empty payment list (lease not issued yet).
 * @param {string} [stableIdPrefix] when set, deadline ids are deterministic (`${prefix}-${dueDate}`)
 */
export function buildDemoPaymentDeadlines(scenario, generateId, stableIdPrefix) {
  if (scenario.leaseNotStarted && Object.keys(scenario.months ?? {}).length === 0) {
    return []
  }

  const { leaseStartDate, leaseEndDate } = scenarioLeaseDates(scenario)
  const dueDates = listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
  const specs = scenario.months ?? {}

  return dueDates.map((date, index) => {
    const spec = specs[date]
    const monthLabel = monthLabelLong(date)
    const baseLabel =
      index === 0 ? `First month rent due (${monthLabel})` : `Rent due — ${monthLabel}`
    const id = stableIdPrefix ? `${stableIdPrefix}-${date}` : generateId()

    if (!spec || spec.kind === 'upcoming') {
      return {
        id,
        type: 'payment',
        date,
        label: baseLabel,
        description: 'Monthly rent is due on the 1st.',
        completed: false,
      }
    }

    if (spec.kind === 'overdue') {
      return {
        id,
        type: 'payment',
        date,
        label: baseLabel,
        description: `Monthly rent of $${scenario.monthlyRent.toLocaleString('en-US')} is past due.`,
        completed: false,
      }
    }

    const paidAt = spec.paidAt
    const completed = true
    let description = `Monthly rent of $${scenario.monthlyRent.toLocaleString('en-US')} received.`
    let eventLabel

    if (spec.kind === 'paid_early' && paidAt) {
      eventLabel = earlyEventLabel(date, paidAt)
      description = eventLabel
    } else if (spec.kind === 'paid_late' && paidAt) {
      eventLabel = lateEventLabel(date, paidAt)
      description = eventLabel
    }

    return {
      id,
      type: 'payment',
      date,
      label: baseLabel,
      description,
      completed,
      paidAt,
      eventLabel,
    }
  })
}

export function formatDemoMoney(amount) {
  return `$${Number(amount).toLocaleString('en-US')}`
}

/** Apply scenario money fields onto a contract. */
export function applyDemoLeaseAmounts(contract, scenario) {
  const total = scenario.monthlyRent * scenario.leaseMonths
  const overdueMonths = Object.values(scenario.months ?? {}).filter(
    (m) => m.kind === 'overdue'
  ).length
  const remaining =
    overdueMonths > 0
      ? scenario.monthlyRent * overdueMonths
      : scenario.monthlyRent *
        Math.max(
          0,
          scenario.leaseMonths -
            Object.values(scenario.months ?? {}).filter((m) =>
              ['paid', 'paid_early', 'paid_late'].includes(m.kind)
            ).length
        )

  return {
    ...contract,
    totalCost: formatDemoMoney(total),
    depositAmount: formatDemoMoney(scenario.monthlyRent),
    remainingBalance: formatDemoMoney(Math.max(remaining, scenario.monthlyRent)),
    paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
    isPlaceholderDraft: false,
  }
}

/**
 * Merge demo scenario onto an existing client (deadlines, lease length, payment status).
 * Non-payment deadlines are preserved.
 * Expired demo leases are cleared from Official Tenants; upcoming signed leases stay official.
 */
export function applyDemoScenarioToClient(client, scenario, generateId) {
  const paymentDeadlines = buildDemoPaymentDeadlines(
    scenario,
    generateId,
    client.id ? `demo-pay-${client.id}` : undefined
  )
  const nonPayment = (client.deadlines ?? []).filter((d) => d.type !== 'payment')
  const { leaseStartDate, leaseEndDate } = scenarioLeaseDates(scenario)
  const asOf = getDemoAsOfDate()
  const end = parseYmd(leaseEndDate)
  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const leaseExpired = asOfDay > endDay

  const signedLike =
    client.contractStatus === 'Signed' ||
    client.contractStatus === 'Completed' ||
    client.projectStatus === 'Contract Signed' ||
    client.projectStatus === 'In Progress' ||
    Boolean(client.isOfficialClient)

  // Keep signed upcoming/in-term tenants official; drop expired completed terms.
  const isOfficialClient = signedLike && !leaseExpired

  return {
    ...client,
    leaseLengthMonths: scenario.leaseMonths,
    paymentStatus: scenario.paymentStatus ?? client.paymentStatus,
    deadlines: [...nonPayment, ...paymentDeadlines],
    demoLeaseFixture: true,
    demoLeaseStartDate: leaseStartDate,
    isOfficialClient,
    officialClientSince: isOfficialClient
      ? client.officialClientSince ?? getDemoAsOfIso()
      : undefined,
  }
}

/**
 * Ensure contract start/end match the scenario.
 */
export function applyDemoScenarioToContract(contract, client, scenario) {
  const { leaseStartDate, leaseEndDate } = scenarioLeaseDates(scenario)
  let next = applyDemoLeaseAmounts(
    {
      ...contract,
      startDate: leaseStartDate,
      completionDate: leaseEndDate,
      clientAddress: client.projectName || contract.clientAddress,
    },
    scenario
  )

  if (scenario.leaseNotStarted) {
    // Lease begins in the future relative to demo “today”
    next = {
      ...next,
      // Keep signed/sent flags from caller; start date is still August 1
    }
  }

  return next
}

/** Seed / refresh helpers use demo “now” for timestamps. */
export function demoNowIso() {
  return getDemoAsOfIso()
}

export function demoAsOfDate() {
  return getDemoAsOfDate()
}

/** Build a one-off rent deadline list from lease dates when no named scenario exists. */
export function buildFreshDemoDeadlines(leaseStartDate, leaseMonths, generateId) {
  const end = computeLeaseEndDate(leaseStartDate, leaseMonths)
  return buildMonthlyRentDeadlines(listMonthlyRentDueDates(leaseStartDate, end), generateId)
}
