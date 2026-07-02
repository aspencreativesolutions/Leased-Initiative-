/**
 * Test-only helpers — mounted when E2E_TEST=1.
 * Simulates payment steps without PayPal sandbox credentials.
 */
import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { generateId } from '../lib/notifications.js'
import { notifyClientByClientId } from '../lib/clientNotifications.js'
import { buildDepositInvoice, buildFinalInvoice } from '../lib/invoice.js'

const router = Router()

router.use(authMiddleware)

/** Ensure deposit invoice exists, has a mock link, and is visible on the portal */
router.post('/clients/:clientId/prepare-deposit-flow', requireRole('admin'), (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  const contract = store.contracts.find((c) => c.clientId === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (!client.isOfficialClient) {
    return res.status(400).json({ error: 'Client must sign the contract first.' })
  }

  const now = new Date().toISOString()
  let invoice = client.invoice

  if (!invoice && contract) {
    const draft = buildDepositInvoice(contract, client)
    if (!draft) {
      return res.status(400).json({ error: 'Could not build deposit invoice from contract.' })
    }
    invoice = {
      description: draft.description,
      amount: draft.amount,
      currency: draft.currency,
      invoiceType: 'deposit',
      createdAt: now,
    }
  }

  if (!invoice) {
    return res.status(400).json({ error: 'No deposit invoice on file.' })
  }

  invoice = {
    ...invoice,
    paymentProvider: invoice.paymentProvider ?? 'paypal',
    paymentLink: invoice.paymentLink ?? 'https://sandbox.paypal.com/e2e-test-deposit',
    sentToPortalAt: invoice.sentToPortalAt ?? now,
  }

  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) => (c.id === clientId ? { ...c, invoice } : c)),
  }))

  res.json({ ok: true, invoice })
})

/** Mark deposit as paid (skips real PayPal capture) */
router.post('/clients/:clientId/simulate-deposit-paid', requireRole('admin'), (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const now = new Date().toISOString()
  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            paymentStatus: 'Deposit Paid',
            depositPaymentConfirmedAt: now,
            invoice: c.invoice
              ? {
                  ...c.invoice,
                  paidAt: now,
                  paymentLinkClickedAt: c.invoice.paymentLinkClickedAt ?? now,
                  sentToPortalAt: c.invoice.sentToPortalAt ?? now,
                }
              : c.invoice,
          }
        : c
    ),
  }))

  res.json({ ok: true, paidAt: now })
})

/** Mark final balance as paid (skips real PayPal capture) */
router.post('/clients/:clientId/simulate-final-paid', requireRole('admin'), (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  const contract = store.contracts.find((c) => c.clientId === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })

  const now = new Date().toISOString()
  let finalInvoice = client.finalInvoice

  if (!finalInvoice && contract) {
    const draft = buildFinalInvoice(contract, client)
    if (draft) {
      finalInvoice = {
        description: draft.description,
        amount: draft.amount,
        currency: draft.currency,
        invoiceType: 'final',
        createdAt: now,
        sentToPortalAt: now,
        paymentLink: 'https://sandbox.paypal.com/e2e-test-final',
        paymentProvider: 'paypal',
      }
    }
  }

  updateStore((s) => {
    let next = {
      ...s,
      clients: s.clients.map((c) =>
        c.id === clientId
          ? {
              ...c,
              paymentStatus: 'Paid',
              finalInvoice: finalInvoice
                ? { ...finalInvoice, paidAt: now, sentToPortalAt: finalInvoice.sentToPortalAt ?? now }
                : c.finalInvoice,
            }
          : c
      ),
    }
    next = notifyClientByClientId(next, clientId, {
      type: 'payment_received',
      title: 'Final payment received',
      message: `Your final payment for ${client.projectName} has been recorded.`,
      actionUrl: '/portal',
      relatedId: `final-paid-e2e-${clientId}`,
    })
    return next
  })

  res.json({ ok: true, paidAt: now })
})

export default router
