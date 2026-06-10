import { parseMoney } from './parseMoney.js'
import { generateId } from './notifications.js'

function paymentStatusAfterCapture(current, invoiceAmount, contract) {
  const total = contract ? parseMoney(contract.totalCost) : null
  const deposit = contract ? parseMoney(contract.depositAmount) : null
  if (total && invoiceAmount >= total) return 'Paid'
  if (deposit && invoiceAmount >= deposit) return 'Deposit Paid'
  if (current === 'Unpaid') return 'Partial'
  return current === 'Overdue' ? 'Partial' : current
}

function providerPaymentIds(capture, existingProvider) {
  const provider = capture.provider ?? existingProvider ?? 'paypal'
  if (provider === 'stripe') {
    return {
      paymentProvider: 'stripe',
      stripeSessionId: capture.orderId,
      stripePaymentIntentId: capture.captureId,
    }
  }
  if (provider === 'square') {
    return {
      paymentProvider: 'square',
      squareOrderId: capture.orderId,
      squarePaymentId: capture.captureId,
    }
  }
  return {
    paymentProvider: 'paypal',
    paypalOrderId: capture.orderId,
    paypalCaptureId: capture.captureId,
  }
}

export function applyPaymentToStore(store, clientId, capture) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return store

  const contract = store.contracts.find((c) => c.clientId === clientId)
  const amount = parseFloat(capture.amount)
  const now = new Date().toISOString()
  const currency = capture.currency || 'USD'
  const providerLabel =
    capture.provider === 'stripe'
      ? 'Stripe'
      : capture.provider === 'square'
        ? 'Square'
        : 'PayPal'

  const isFinalPayment =
    client.finalInvoice &&
    !client.finalInvoice.paidAt &&
    Math.abs(amount - client.finalInvoice.amount) < 0.02

  if (isFinalPayment) {
    if (client.finalInvoice.paidAt) return store
    const finalInvoice = {
      ...client.finalInvoice,
      ...providerPaymentIds(capture, client.finalInvoice.paymentProvider),
      paidAt: now,
    }
    return {
      ...store,
      clients: store.clients.map((c) =>
        c.id === clientId
          ? {
              ...c,
              paymentStatus: 'Paid',
              finalInvoice,
              notes: [
                ...(c.notes ?? []),
                {
                  id: generateId(),
                  text: `Final balance received via ${providerLabel}: $${amount.toFixed(2)} ${currency} on ${new Date(now).toLocaleDateString()}.`,
                  category: 'Payment',
                  createdAt: now,
                },
              ],
            }
          : c
      ),
    }
  }

  if (client.invoice?.paidAt) return store

  const invoice = {
    ...(client.invoice ?? {
      description: client.projectName,
      amount,
      currency,
      createdAt: now,
    }),
    amount,
    currency,
    ...providerPaymentIds(capture, client.invoice?.paymentProvider),
    paidAt: now,
    paymentLink: client.invoice?.paymentLink,
    sentToPortalAt: client.invoice?.sentToPortalAt,
    invoiceType: client.invoice?.invoiceType ?? 'deposit',
  }

  const paymentStatus = paymentStatusAfterCapture(
    client.paymentStatus,
    amount,
    contract
  )

  return {
    ...store,
    clients: store.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            paymentStatus,
            depositPaymentConfirmedAt: c.depositPaymentConfirmedAt ?? now,
            invoice,
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Down payment received via ${providerLabel}: $${amount.toFixed(2)} ${currency} on ${new Date(now).toLocaleDateString()}.`,
                category: 'Payment',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }
}
