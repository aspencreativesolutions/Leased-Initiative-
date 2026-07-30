import { buildDepositInvoice, buildFinalInvoice } from './invoice.js'
import { parseMoney } from './parseMoney.js'

export function isDepositSatisfied(client) {
  if (!client) return false
  return Boolean(
    client.depositPaymentConfirmedAt ||
      client.invoice?.paidAt ||
      client.paymentStatus === 'Deposit Paid' ||
      client.timelineStepSkips?.payment_confirmed
  )
}

export function getDepositPaidAt(client) {
  return client?.invoice?.paidAt ?? client?.depositPaymentConfirmedAt ?? undefined
}

export function ensureDepositInvoiceRecord(client, contract, now) {
  if (client.invoice) return client.invoice
  if (!contract) return null
  const draft = buildDepositInvoice(contract, client)
  if (!draft) return null
  return {
    description: draft.description,
    amount: draft.amount,
    currency: draft.currency,
    paymentProvider: contract.paymentProvider ?? 'paypal',
    invoiceType: 'deposit',
    createdAt: now,
  }
}

export function buildPortalDepositInvoice(client, contract) {
  if (!client) return null

  const paidAt = getDepositPaidAt(client)
  const invoice = client.invoice

  if (paidAt || isDepositSatisfied(client)) {
    const amount =
      invoice?.amount ??
      (contract ? buildDepositInvoice(contract, client)?.amount : undefined)
    if (!amount) return null
    return {
      amount,
      currency: invoice?.currency ?? 'USD',
      description: invoice?.description ?? 'Down payment deposit',
      paymentProvider: invoice?.paymentProvider,
      paidAt: paidAt ?? client.depositPaymentConfirmedAt,
      sentToPortalAt: invoice?.sentToPortalAt,
      invoiceType: 'deposit',
    }
  }

  if (invoice?.sentToPortalAt && !invoice.paidAt) {
    return {
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      paymentProvider: invoice.paymentProvider,
      paymentLink: invoice.paymentLink,
      zelleMemo: invoice.zelleMemo,
      zelleMarkedPaidAt: invoice.zelleMarkedPaidAt,
      sentToPortalAt: invoice.sentToPortalAt,
      invoiceType: 'deposit',
    }
  }

  return null
}

export function buildPortalRemainingBalance(client, contract) {
  if (!client || !contract || !isDepositSatisfied(client)) return null
  if (client.finalInvoice?.paidAt) return null

  const finalDraft = buildFinalInvoice(contract, client)
  if (!finalDraft?.amount) return null

  const total = parseMoney(contract.totalCost)
  const deposit = parseMoney(contract.depositAmount)
  const hasSplitPayment = Boolean(total && deposit && total > deposit)

  if (!hasSplitPayment && !contract.remainingBalance) return null

  if (client.finalInvoice?.sentToPortalAt && !client.finalInvoice.paidAt) {
    return null
  }

  return {
    amount: finalDraft.amount,
    currency: finalDraft.currency,
    description: finalDraft.description,
    dueDate: contract.completionDate || undefined,
    invoiceType: 'final',
  }
}

export function resolvePortalPaymentStatus(client) {
  if (!client) return undefined
  if (client.finalInvoice?.paidAt || client.paymentStatus === 'Paid') return 'Paid'
  if (isDepositSatisfied(client)) return 'Deposit Paid'
  return client.paymentStatus
}

export function buildPortalFinalInvoice(client) {
  const invoice = client?.finalInvoice
  if (!invoice) return null

  if (invoice.paidAt) {
    return {
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      paymentProvider: invoice.paymentProvider,
      paidAt: invoice.paidAt,
      invoiceType: 'final',
    }
  }

  if (invoice.sentToPortalAt) {
    return {
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      paymentProvider: invoice.paymentProvider,
      paymentLink: invoice.paymentLink,
      zelleMemo: invoice.zelleMemo,
      zelleMarkedPaidAt: invoice.zelleMarkedPaidAt,
      sentToPortalAt: invoice.sentToPortalAt,
      invoiceType: 'final',
    }
  }

  return null
}
