import { isDemoSandboxActive } from './demoSandbox.js'
import { getDemoAsOfDate, getDemoAsOfYmd } from './demoClock.js'
import { resolveDemoScenario } from './demoLeaseFixtures.js'
import { applyDemoLeaseAmounts } from './demoLeaseFixtures.js'

export const SAMPLE_CLIENT_EMAILS = new Set([
  'james@chenarch.com',
  'jordan.kim@example.com',
  'emily@rodriguezwellness.com',
  'marcus@webblegal.com',
  'lisa@parkphoto.com',
  'ava.torres@example.com',
  'noah.patel@example.com',
  'priya.shah@example.com',
  'ethan.brooks@example.com',
  'maya.lopez@example.com',
  'chris.nguyen@example.com',
  'sam.rivera@example.com',
])

/** Former sample tenants purged from existing stores on boot. */
export const REMOVED_SAMPLE_CLIENT_EMAILS = new Set([
  'sarah@bloombotanicals.com',
  'sarahmiller@nextgarden.com',
])

/** Display names purged alongside retired mock / demo tenants. */
export const REMOVED_SAMPLE_CLIENT_NAMES = new Set(['sarah miller'])

/** Non-payment follow-up offsets relative to Demo Mode “today” (July 22). */
const SAMPLE_FOLLOW_UPS = {
  'james@chenarch.com': { followUpOffsetDays: 2 },
  'emily@rodriguezwellness.com': { followUpOffsetDays: 9 },
  'lisa@parkphoto.com': { followUpOffsetDays: 4 },
}

/** Concrete lease amounts so overdue $ totals show in Payments (tenant shares) */
export const SAMPLE_LEASE_AMOUNTS = {
  'james@chenarch.com': {
    monthlyRent: 1200,
    leaseMonths: 12,
  },
  'jordan.kim@example.com': {
    monthlyRent: 1200,
    leaseMonths: 12,
  },
  'lisa@parkphoto.com': {
    monthlyRent: 1850,
    leaseMonths: 12,
  },
  'marcus@webblegal.com': {
    monthlyRent: 2200,
    leaseMonths: 12,
  },
  'emily@rodriguezwellness.com': {
    monthlyRent: 2150,
    leaseMonths: 12,
  },
  'ava.torres@example.com': {
    monthlyRent: 725,
    leaseMonths: 12,
  },
  'noah.patel@example.com': {
    monthlyRent: 725,
    leaseMonths: 12,
  },
  'priya.shah@example.com': {
    monthlyRent: 950,
    leaseMonths: 12,
  },
  'ethan.brooks@example.com': {
    monthlyRent: 950,
    leaseMonths: 12,
  },
  'maya.lopez@example.com': {
    monthlyRent: 950,
    leaseMonths: 12,
  },
  'chris.nguyen@example.com': {
    monthlyRent: 875,
    leaseMonths: 12,
  },
  'sam.rivera@example.com': {
    monthlyRent: 875,
    leaseMonths: 12,
  },
}

/** Household fields backfilled onto existing sample clients in older stores. */
export const SAMPLE_HOUSEHOLD_FIELDS = {
  'james@chenarch.com': {
    occupancyArrangement: 'shared_home',
    leaseGroupId: 'lease-juanita-523',
    unitOrRoomLabel: 'Main floor',
  },
  'jordan.kim@example.com': {
    occupancyArrangement: 'shared_home',
    leaseGroupId: 'lease-juanita-523',
    unitOrRoomLabel: 'Upper floor',
  },
  'emily@rodriguezwellness.com': {
    occupancyArrangement: 'entire_home',
  },
  'marcus@webblegal.com': {
    occupancyArrangement: 'entire_home',
  },
  'lisa@parkphoto.com': {
    occupancyArrangement: 'entire_home',
  },
  'ava.torres@example.com': {
    occupancyArrangement: 'shared_apartment',
    leaseGroupId: 'lease-canton-11',
    unitOrRoomLabel: 'Unit 11 · Bedroom A',
  },
  'noah.patel@example.com': {
    occupancyArrangement: 'shared_apartment',
    leaseGroupId: 'lease-canton-11',
    unitOrRoomLabel: 'Unit 11 · Bedroom B',
  },
  'priya.shah@example.com': {
    occupancyArrangement: 'shared_home',
    leaseGroupId: 'lease-donnell-211',
    unitOrRoomLabel: 'Room 1',
  },
  'ethan.brooks@example.com': {
    occupancyArrangement: 'shared_home',
    leaseGroupId: 'lease-donnell-211',
    unitOrRoomLabel: 'Room 2',
  },
  'maya.lopez@example.com': {
    occupancyArrangement: 'shared_home',
    leaseGroupId: 'lease-donnell-211',
    unitOrRoomLabel: 'Room 3',
  },
  'chris.nguyen@example.com': {
    occupancyArrangement: 'room_rental',
    leaseGroupId: 'lease-scioto-chris',
    unitOrRoomLabel: 'Room A',
  },
  'sam.rivera@example.com': {
    occupancyArrangement: 'room_rental',
    leaseGroupId: 'lease-scioto-sam',
    unitOrRoomLabel: 'Room B',
  },
}

/**
 * Backfill occupancy / lease-group fields on sample clients for Tenant Details.
 */
export function ensureSampleHouseholdFields(store) {
  let changed = false
  const clients = (store.clients ?? []).map((client) => {
    const email = client.email?.trim().toLowerCase()
    const fields = email ? SAMPLE_HOUSEHOLD_FIELDS[email] : null
    if (!fields) return client
    let next = client
    for (const [key, value] of Object.entries(fields)) {
      if (next[key] !== value) {
        next = { ...next, [key]: value }
        changed = true
      }
    }
    return next
  })
  return { store: changed ? { ...store, clients } : store, changed }
}

function asOfDate() {
  return isDemoSandboxActive() ? getDemoAsOfDate() : new Date()
}

function daysFromAsOf(days) {
  const d = asOfDate()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isSampleClient(client) {
  const email = client.email?.trim().toLowerCase()
  return Boolean(client.isSampleClient || (email && SAMPLE_CLIENT_EMAILS.has(email)))
}

function formatMoney(amount) {
  return `$${Number(amount).toLocaleString('en-US')}`
}

/**
 * Demo fixture clients keep absolute Jan 1 / Aug 1 lease payment dates.
 * Only refresh non-payment follow-ups relative to the demo (or wall) clock.
 */
export function refreshSampleClientDates(client) {
  if (!isSampleClient(client)) return { client, changed: false }

  const email = client.email.trim().toLowerCase()
  const scenario = resolveDemoScenario(email)
  let changed = false
  let next = { ...client }

  // Canonical demo payment histories must not be re-anchored to wall-clock offsets
  if (scenario || client.demoLeaseFixture) {
    const follow = SAMPLE_FOLLOW_UPS[email]
    if (follow && next.followUpDate) {
      const refreshed = daysFromAsOf(follow.followUpOffsetDays)
      if (next.followUpDate !== refreshed) {
        next = { ...next, followUpDate: refreshed }
        changed = true
      }
    }

    if (scenario?.paymentStatus && next.paymentStatus !== scenario.paymentStatus) {
      next = { ...next, paymentStatus: scenario.paymentStatus }
      changed = true
    }

    // Keep non-payment deadline dates relative for follow-ups / meetings only
    if (next.deadlines?.length) {
      next = {
        ...next,
        deadlines: next.deadlines.map((deadline) => {
          if (deadline.type === 'payment' || deadline.completed) return deadline
          if (deadline.type === 'follow-up' && follow) {
            const refreshed = daysFromAsOf(follow.followUpOffsetDays)
            if (deadline.date === refreshed) return deadline
            changed = true
            return { ...deadline, date: refreshed }
          }
          return deadline
        }),
      }
    }

    return { client: next, changed }
  }

  // Legacy relative refresh for any sample without a demo scenario
  const followUpOffset = SAMPLE_FOLLOW_UPS[email]?.followUpOffsetDays ?? 5
  if (next.followUpDate) {
    const refreshed = daysFromAsOf(followUpOffset)
    if (next.followUpDate !== refreshed) {
      next.followUpDate = refreshed
      changed = true
    }
  }

  return { client: next, changed }
}

export function refreshAllSampleClientDates(clients) {
  let changed = false
  const nextClients = clients.map((client) => {
    const result = refreshSampleClientDates(client)
    if (result.changed) changed = true
    return result.client
  })
  return { clients: nextClients, changed }
}

/**
 * Backfill realistic monthly rent figures on sample contracts so overdue amounts render.
 */
export function ensureSampleLeaseAmounts(store) {
  let changed = false
  const contracts = store.contracts.map((contract) => {
    const client = store.clients.find((c) => c.id === contract.clientId)
    const email = client?.email?.trim().toLowerCase()
    const scenario = email ? resolveDemoScenario(email) : null
    if (scenario && client) {
      const next = applyDemoLeaseAmounts(contract, scenario)
      if (
        next.totalCost === contract.totalCost &&
        next.depositAmount === contract.depositAmount &&
        next.remainingBalance === contract.remainingBalance &&
        next.startDate === contract.startDate &&
        next.completionDate === contract.completionDate
      ) {
        return contract
      }
      changed = true
      return next
    }

    const amounts = email ? SAMPLE_LEASE_AMOUNTS[email] : null
    if (!amounts) return contract

    const total = amounts.monthlyRent * amounts.leaseMonths
    const deposit = amounts.monthlyRent
    const incompletePayments = (client.deadlines ?? []).filter(
      (d) => d.type === 'payment' && !d.completed
    )
    const today = isDemoSandboxActive() ? getDemoAsOfYmd() : daysFromAsOf(0)
    const overdueCount = incompletePayments.filter((d) => d.date.slice(0, 10) < today).length
    const remaining =
      overdueCount > 0
        ? amounts.monthlyRent * overdueCount
        : amounts.monthlyRent * Math.max(1, amounts.leaseMonths - 1)

    const next = {
      ...contract,
      totalCost: formatMoney(total),
      depositAmount: formatMoney(deposit),
      remainingBalance: formatMoney(remaining),
      isPlaceholderDraft: false,
    }

    if (
      next.totalCost === contract.totalCost &&
      next.depositAmount === contract.depositAmount &&
      next.remainingBalance === contract.remainingBalance &&
      next.isPlaceholderDraft === contract.isPlaceholderDraft
    ) {
      return contract
    }

    changed = true
    return next
  })

  return { store: changed ? { ...store, contracts } : store, changed }
}
