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

export function applyPaymentToStore(store, clientId, capture) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return store

  const contract = store.contracts.find((c) => c.clientId === clientId)
  const amount = parseFloat(capture.amount)
  const now = new Date().toISOString()
  const currency = capture.currency || 'USD'

  const isFinalPayment =
    client.finalInvoice &&
    !client.finalInvoice.paidAt &&
    Math.abs(amount - client.finalInvoice.amount) < 0.02

  if (isFinalPayment) {
    const finalInvoice = {
      ...client.finalInvoice,
      paypalOrderId: capture.orderId,
      paypalCaptureId: capture.captureId,
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
                  text: `Final balance received: $${amount.toFixed(2)} ${currency} on ${new Date(now).toLocaleDateString()}.`,
                  category: 'Payment',
                  createdAt: now,
                },
              ],
            }
          : c
      ),
    }
  }

  const invoice = {
    ...(client.invoice ?? {
      description: client.projectName,
      amount,
      currency,
      createdAt: now,
    }),
    amount,
    currency,
    paypalOrderId: capture.orderId,
    paypalCaptureId: capture.captureId,
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
                text: `Down payment received: $${amount.toFixed(2)} ${currency} on ${new Date(now).toLocaleDateString()}.`,
                category: 'Payment',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }
}
