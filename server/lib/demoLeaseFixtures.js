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
 * @property {string} [leaseEndDate] Optional YYYY-MM-DD override (e.g. final rent in August)
 * @property {number} monthlyRent
 * @property {number} [currentPeriodAmountPaid] Partial payment toward the current period
 * @property {'paypal' | 'stripe' | 'square'} [paymentProvider] Checkout processor for this lease
 * @property {string} [paymentStatus]
 * @property {string} [contractStatus] Canonical landlord workflow status
 * @property {string} [projectStatus]
 * @property {Record<string, DemoMonthSpec>} [months] keyed by YYYY-MM-01
 * @property {boolean} [leaseNotStarted]
 */

/** @type {Record<string, DemoLeaseScenario>} */
export const DEMO_LEASE_SCENARIOS = {
  // Active POV tenant — Aug 2025 start, Month 11 of 12 in July demo clock.
  // Paid through July on time; final August installment still upcoming; $0 overdue.
  // Lease Agreements badge: Active (signed + start date passed)
  'active@leased.test': {
    leaseStartMonth: 'august',
    leaseStartYear: 2025,
    leaseMonths: 12,
    leaseEndDate: '2026-08-31',
    monthlyRent: 3200,
    paymentProvider: 'stripe',
    paymentStatus: 'Paid',
    contractStatus: 'Signed',
    projectStatus: 'Contract Signed',
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
      // August final installment left unpaid / upcoming
    },
  },

  // Lease sent — August 2026 start, not begun; first month paid early
  // Lease Agreements badge: Sent
  'awaiting@leased.test': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 1450,
    paymentProvider: 'paypal',
    paymentStatus: 'Unpaid',
    contractStatus: 'Sent',
    projectStatus: 'Contract Sent',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: '2026-07-18' },
    },
  },

  // July currently past due; January 2026 start, active 12-month term
  // Shares $2,400 Juanita unit with roommate Jordan Kim ($1,200 each)
  // Lease Agreements badge: Active
  'james@chenarch.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 1200,
    paymentProvider: 'paypal',
    paymentStatus: 'Overdue',
    contractStatus: 'Signed',
    projectStatus: 'In Progress',
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

  // Roommate at Juanita — same $1,200 share; $800 paid toward July (partial)
  'jordan.kim@example.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 1200,
    paymentProvider: 'paypal',
    paymentStatus: 'Unpaid',
    contractStatus: 'Signed',
    projectStatus: 'In Progress',
    currentPeriodAmountPaid: 800,
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid', paidAt: '2026-03-01' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'overdue' },
    },
  },

  // Accepted pending tenant — lease sent for August 2026 start, awaiting signature
  // Lease Agreements badge: Sent
  'emily@rodriguezwellness.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 2150,
    paymentProvider: 'paypal',
    paymentStatus: 'Unpaid',
    contractStatus: 'Sent',
    projectStatus: 'Contract Sent',
    leaseNotStarted: true,
    months: {},
  },

  // Signed lease begins August 2026 — upcoming (not Active until Aug 1); first rent paid early
  // Lease Agreements badge: Signed
  'marcus@webblegal.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 2200,
    paymentProvider: 'square',
    paymentStatus: 'Deposit Paid',
    contractStatus: 'Signed',
    projectStatus: 'Contract Signed',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: getDemoAsOfYmd() },
    },
  },

  // Active 12-month term (Jan 1 → Dec 31); rent current through July — never late
  // Lease Agreements badge: Active — listed under Official Tenants + Payments
  'lisa@parkphoto.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 1850,
    paymentProvider: 'stripe',
    paymentStatus: 'Paid',
    contractStatus: 'Signed',
    projectStatus: 'In Progress',
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid_early', paidAt: '2026-02-24' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'paid', paidAt: '2026-07-01' },
    },
  },

  // Shared Canton Rd apartment — upcoming Aug 2026 start; deposit paid ($725 share)
  // Lease Agreements badge: Signed (not Active until Aug 1)
  'ava.torres@example.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 725,
    paymentProvider: 'stripe',
    paymentStatus: 'Deposit Paid',
    contractStatus: 'Signed',
    projectStatus: 'Contract Signed',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: getDemoAsOfYmd() },
    },
  },

  // Shared Canton Rd apartment — upcoming Aug 2026 start with Ava; deposit paid
  'noah.patel@example.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 725,
    paymentProvider: 'paypal',
    paymentStatus: 'Deposit Paid',
    contractStatus: 'Signed',
    projectStatus: 'Contract Signed',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: getDemoAsOfYmd() },
    },
  },

  // Three housemates at Donnell — equal $950 share of $2,850
  'priya.shah@example.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 950,
    paymentProvider: 'stripe',
    paymentStatus: 'Paid',
    contractStatus: 'Signed',
    projectStatus: 'In Progress',
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid', paidAt: '2026-03-01' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'paid', paidAt: '2026-07-01' },
    },
  },

  'ethan.brooks@example.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 950,
    paymentProvider: 'square',
    paymentStatus: 'Paid',
    contractStatus: 'Signed',
    projectStatus: 'In Progress',
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid_early', paidAt: '2026-02-25' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'paid', paidAt: '2026-07-01' },
    },
  },

  'maya.lopez@example.com': {
    leaseStartMonth: 'january',
    leaseMonths: 12,
    monthlyRent: 950,
    paymentProvider: 'paypal',
    paymentStatus: 'Paid',
    contractStatus: 'Signed',
    projectStatus: 'In Progress',
    months: {
      '2026-01-01': { kind: 'paid', paidAt: '2026-01-01' },
      '2026-02-01': { kind: 'paid', paidAt: '2026-02-01' },
      '2026-03-01': { kind: 'paid', paidAt: '2026-03-01' },
      '2026-04-01': { kind: 'paid', paidAt: '2026-04-01' },
      '2026-05-01': { kind: 'paid', paidAt: '2026-05-01' },
      '2026-06-01': { kind: 'paid', paidAt: '2026-06-01' },
      '2026-07-01': { kind: 'paid', paidAt: '2026-07-01' },
    },
  },

  // Scioto Unit A — separate upcoming Aug 2026 leases, same address (room rentals)
  'chris.nguyen@example.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 875,
    paymentProvider: 'stripe',
    paymentStatus: 'Deposit Paid',
    contractStatus: 'Signed',
    projectStatus: 'Contract Signed',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: getDemoAsOfYmd() },
    },
  },

  'sam.rivera@example.com': {
    leaseStartMonth: 'august',
    leaseMonths: 12,
    monthlyRent: 875,
    paymentProvider: 'square',
    paymentStatus: 'Deposit Paid',
    contractStatus: 'Signed',
    projectStatus: 'Contract Signed',
    leaseNotStarted: true,
    months: {
      '2026-08-01': { kind: 'paid_early', paidAt: getDemoAsOfYmd() },
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
  const end =
    typeof scenario.leaseEndDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scenario.leaseEndDate)
      ? scenario.leaseEndDate
      : computeLeaseEndDate(start, scenario.leaseMonths)
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

function paymentMethodsTextForProvider(provider) {
  if (provider === 'stripe') return 'Credit card via Stripe (secure checkout link)'
  if (provider === 'square') return 'Credit card via Square (secure checkout link)'
  return 'PayPal (secure checkout link)'
}

/** Apply scenario money fields onto a contract. */
export function applyDemoLeaseAmounts(contract, scenario) {
  const { leaseStartDate, leaseEndDate } = scenarioLeaseDates(scenario)
  const dueDates = listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
  const specs = scenario.months ?? {}
  const paidKinds = new Set(['paid', 'paid_early', 'paid_late'])
  const overdueMonths = dueDates.filter((d) => specs[d]?.kind === 'overdue').length
  const unpaidUpcoming = dueDates.filter((d) => {
    const spec = specs[d]
    if (!spec) return true
    return !paidKinds.has(spec.kind) && spec.kind !== 'overdue'
  }).length

  // Overdue balance = past-due unpaid only; otherwise remaining future installments.
  // Never force a fake remaining balance when the tenant is current / fully paid.
  const remaining =
    overdueMonths > 0
      ? scenario.monthlyRent * overdueMonths
      : scenario.monthlyRent * unpaidUpcoming

  const total =
    scenario.monthlyRent * Math.max(scenario.leaseMonths, dueDates.length || scenario.leaseMonths)

  const paymentProvider = scenario.paymentProvider ?? contract.paymentProvider ?? 'paypal'

  return {
    ...contract,
    totalCost: formatDemoMoney(total),
    depositAmount: formatDemoMoney(scenario.monthlyRent),
    remainingBalance: formatDemoMoney(remaining),
    paymentProvider,
    paymentMethods: paymentMethodsTextForProvider(paymentProvider),
    paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
    isPlaceholderDraft: false,
  }
}

/**
 * Merge demo scenario onto an existing client (deadlines, lease length, payment status).
 * Non-payment deadlines are preserved.
 * Expired demo leases are cleared from Official Tenants; upcoming signed leases stay official.
 * Canonical contractStatus / projectStatus from the scenario always win so drifted stores
 * (e.g. James stuck on Sent) are repaired on boot / data load.
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

  const contractStatus = scenario.contractStatus ?? client.contractStatus
  const projectStatus = scenario.projectStatus ?? client.projectStatus

  const signedLike =
    contractStatus === 'Signed' ||
    contractStatus === 'Completed' ||
    projectStatus === 'Contract Signed' ||
    projectStatus === 'In Progress'

  // Keep signed upcoming/in-term tenants official; drop expired completed terms.
  const isOfficialClient = signedLike && !leaseExpired

  return {
    ...client,
    leaseLengthMonths: scenario.leaseMonths,
    paymentStatus: scenario.paymentStatus ?? client.paymentStatus,
    contractStatus,
    projectStatus,
    deadlines: [...nonPayment, ...paymentDeadlines],
    demoLeaseFixture: true,
    demoLeaseStartDate: leaseStartDate,
    isOfficialClient,
    officialClientSince: isOfficialClient
      ? client.officialClientSince ?? getDemoAsOfIso()
      : undefined,
    ...(scenario.currentPeriodAmountPaid != null
      ? { currentPeriodAmountPaid: scenario.currentPeriodAmountPaid }
      : {}),
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
