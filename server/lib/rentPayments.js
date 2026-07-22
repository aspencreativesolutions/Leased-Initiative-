import { parseMoney } from './parseMoney.js'
import { getLeaseRentSchedule } from './leaseSchedule.js'
import { generateId, pushAdminNotification } from './notifications.js'

/** Monthly rent from lease totals, or deposit as a one-month proxy. */
export function estimateMonthlyRent(client, contract) {
  if (!contract) return null
  const total = parseMoney(contract.totalCost)
  const months =
    client?.leaseLengthMonths ||
    (total && parseMoney(contract.depositAmount)
      ? Math.round(total / parseMoney(contract.depositAmount))
      : null)
  if (total && months && months > 0) {
    return Math.round((total / months) * 100) / 100
  }
  const deposit = parseMoney(contract.depositAmount)
  if (deposit) return deposit
  return parseMoney(contract.remainingBalance)
}

export function isPrepaidRentAllowed(contract) {
  if (!contract) return false
  return contract.allowPrepaidRent !== false
}

/** Unpaid rent months in schedule order (overdue first, then upcoming). */
export function listUnpaidRentMonths(client, contract, asOf = new Date()) {
  const schedule = getLeaseRentSchedule(client, contract, asOf)
  return (schedule.payments ?? []).filter(
    (p) => p.status === 'overdue' || p.status === 'due' || p.status === 'upcoming'
  )
}

export function buildPortalRentPayment(client, contract, asOf = new Date()) {
  if (!client || !contract) return null

  const schedule = getLeaseRentSchedule(client, contract, asOf)
  const unpaid = listUnpaidRentMonths(client, contract, asOf)
  const monthlyRent = estimateMonthlyRent(client, contract)
  const allowPrepaid = isPrepaidRentAllowed(contract)
  const maxMonths = unpaid.length
  const canPay = Boolean(monthlyRent && maxMonths > 0)

  const pending = client.rentInvoice
  let pendingInvoice = null
  if (pending && !pending.paidAt && pending.paymentLink) {
    pendingInvoice = {
      amount: pending.amount,
      currency: pending.currency ?? 'USD',
      description: pending.description,
      paymentProvider: pending.paymentProvider,
      paymentLink: pending.paymentLink,
      sentToPortalAt: pending.sentToPortalAt ?? pending.createdAt,
      invoiceType: 'rent',
      monthCount: pending.monthCount,
      dueDates: pending.dueDates,
    }
  }

  return {
    nextDueDate: schedule.nextDueDate,
    daysUntilNextDue: schedule.daysUntilNextDue,
    monthlyRent,
    currency: 'USD',
    allowPrepaid,
    maxMonths,
    canPay,
    unpaidMonths: unpaid.map((p) => ({
      dueDate: p.dueDate,
      label: p.label,
      status: p.status,
    })),
    paymentProvider: contract.paymentProvider ?? 'paypal',
    pendingInvoice,
  }
}

export function buildRentInvoiceDraft({
  client,
  contract,
  monthCount,
  unpaidMonths,
  monthlyRent,
}) {
  const selected = unpaidMonths.slice(0, monthCount)
  const amount = Math.round(monthlyRent * selected.length * 100) / 100
  const first = selected[0]
  const last = selected[selected.length - 1]
  const rangeLabel =
    selected.length === 1
      ? first.label
      : `${first.label} – ${last.label}`

  return {
    description: `${contract.projectTitle || client.projectName} — rent (${rangeLabel})`.slice(
      0,
      127
    ),
    amount,
    currency: 'USD',
    invoiceType: 'rent',
    monthCount: selected.length,
    dueDates: selected.map((m) => m.dueDate),
  }
}

/**
 * Mark paid rent due dates complete and record the rent invoice.
 * Returns updated store (with optional landlord notification).
 */
export function applyRentPaymentToStore(store, clientId, capture) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client?.rentInvoice || client.rentInvoice.paidAt) return store

  const amount = parseFloat(capture.amount)
  if (
    Number.isFinite(amount) &&
    Math.abs(amount - client.rentInvoice.amount) >= 0.02
  ) {
    return store
  }

  const now = new Date().toISOString()
  const currency = capture.currency || client.rentInvoice.currency || 'USD'
  const providerLabel =
    capture.provider === 'stripe'
      ? 'Stripe'
      : capture.provider === 'square'
        ? 'Square'
        : 'PayPal'
  const dueDates = new Set(client.rentInvoice.dueDates ?? [])
  const monthCount = client.rentInvoice.monthCount ?? dueDates.size ?? 1

  const providerIds =
    capture.provider === 'stripe'
      ? {
          paymentProvider: 'stripe',
          stripeSessionId: capture.orderId,
          stripePaymentIntentId: capture.captureId,
        }
      : capture.provider === 'square'
        ? {
            paymentProvider: 'square',
            squareOrderId: capture.orderId,
            squarePaymentId: capture.captureId,
          }
        : {
            paymentProvider: 'paypal',
            paypalOrderId: capture.orderId,
            paypalCaptureId: capture.captureId,
          }

  const rentInvoice = {
    ...client.rentInvoice,
    ...providerIds,
    paidAt: now,
  }

  const deadlines = (client.deadlines ?? []).map((d) => {
    if (d.type !== 'payment') return d
    const ymd = d.date.slice(0, 10)
    if (!dueDates.has(ymd)) return d
    return { ...d, completed: true }
  })

  let next = {
    ...store,
    clients: store.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            deadlines,
            rentInvoice,
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Rent received via ${providerLabel}: $${Number(amount).toFixed(2)} ${currency} for ${monthCount} month${monthCount === 1 ? '' : 's'} on ${new Date(now).toLocaleDateString()}.`,
                category: 'Payment',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }

  next = pushAdminNotification(next, {
    type: 'rent_payment',
    clientId,
    title: 'Rent payment received',
    message: `${client.name} paid $${Number(amount).toFixed(2)} ${currency} for ${monthCount} month${monthCount === 1 ? '' : 's'} via ${providerLabel}.`,
  })

  return next
}
