export const SAMPLE_CLIENT_EMAILS = new Set([
  'sarah@bloombotanicals.com',
  'james@chenarch.com',
  'emily@rodriguezwellness.com',
  'marcus@webblegal.com',
  'lisa@parkphoto.com',
])

/** Days-from-today offsets for each sample client — keeps demo schedules realistic */
const SAMPLE_SCHEDULES = {
  'sarah@bloombotanicals.com': {
    followUpDate: 5,
    deadlines: [7, 30],
  },
  'james@chenarch.com': {
    followUpDate: null,
    // follow-up, overdue payment, contract follow-up
    deadlines: [2, -14, 6],
    paymentStatus: 'Overdue',
  },
  'emily@rodriguezwellness.com': {
    followUpDate: 9,
    deadlines: [9],
  },
  'lisa@parkphoto.com': {
    followUpDate: 4,
    // two overdue rent payments for multi-overdue UI testing
    deadlines: [-45, -14],
    paymentStatus: 'Overdue',
    ensurePaymentDeadlines: [
      { offset: -45, label: 'Rent due — prior month' },
      { offset: -14, label: 'Rent due' },
    ],
  },
}

/** Concrete lease amounts so overdue $ totals show in Payments / Overdue Rent */
export const SAMPLE_LEASE_AMOUNTS = {
  'james@chenarch.com': {
    monthlyRent: 2100,
    leaseMonths: 12,
  },
  'lisa@parkphoto.com': {
    monthlyRent: 1850,
    leaseMonths: 6,
  },
  'sarah@bloombotanicals.com': {
    monthlyRent: 2400,
    leaseMonths: 12,
  },
}

function daysFromNow(days) {
  const d = new Date()
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

function ensureLisaPaymentDeadlines(client, ensurePaymentDeadlines) {
  if (!ensurePaymentDeadlines?.length) return { client, changed: false }

  const paymentDeadlines = (client.deadlines ?? []).filter((d) => d.type === 'payment')
  if (paymentDeadlines.length >= ensurePaymentDeadlines.length) {
    return { client, changed: false }
  }

  const nonPayment = (client.deadlines ?? []).filter((d) => d.type !== 'payment')
  const nextPayments = ensurePaymentDeadlines.map((spec, index) => {
    const existing = paymentDeadlines[index]
    if (existing) {
      return {
        ...existing,
        date: daysFromNow(spec.offset),
        label: spec.label || existing.label,
        completed: false,
      }
    }
    return {
      id: `sample-pay-${client.id}-${index}`,
      type: 'payment',
      date: daysFromNow(spec.offset),
      label: spec.label || 'Rent due',
      description: 'Monthly rent is past due.',
      completed: false,
    }
  })

  return {
    client: { ...client, deadlines: [...nonPayment, ...nextPayments] },
    changed: true,
  }
}

export function refreshSampleClientDates(client) {
  if (!isSampleClient(client)) return { client, changed: false }

  const email = client.email.trim().toLowerCase()
  const schedule = SAMPLE_SCHEDULES[email]
  let changed = false
  let next = { ...client }

  const ensured = ensureLisaPaymentDeadlines(next, schedule?.ensurePaymentDeadlines)
  if (ensured.changed) {
    next = ensured.client
    changed = true
  }

  const followUpOffset = schedule?.followUpDate ?? 5
  if (next.followUpDate) {
    const refreshed = daysFromNow(followUpOffset)
    if (next.followUpDate !== refreshed) {
      next.followUpDate = refreshed
      changed = true
    }
  }

  if (next.deadlines?.length) {
    const offsets = schedule?.deadlines ?? next.deadlines.map((_, i) => 3 + i * 7)
    next.deadlines = next.deadlines.map((deadline, index) => {
      if (deadline.completed) return deadline
      const offset = offsets[index] ?? 7 + index * 7
      const refreshed = daysFromNow(offset)
      if (deadline.date === refreshed) return deadline
      changed = true
      return { ...deadline, date: refreshed, completed: false }
    })
  }

  if (schedule?.paymentStatus && next.paymentStatus !== schedule.paymentStatus) {
    next.paymentStatus = schedule.paymentStatus
    changed = true
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
    const amounts = email ? SAMPLE_LEASE_AMOUNTS[email] : null
    if (!amounts) return contract

    const total = amounts.monthlyRent * amounts.leaseMonths
    const deposit = amounts.monthlyRent
    const incompletePayments = (client.deadlines ?? []).filter(
      (d) => d.type === 'payment' && !d.completed
    )
    const today = daysFromNow(0)
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
