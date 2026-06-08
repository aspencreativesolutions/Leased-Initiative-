import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { generateId } from '../lib/notifications.js'
import { buildDepositInvoice, buildFinalInvoice } from '../lib/invoice.js'
import { createPayPalOrder, isPayPalConfigured } from '../lib/paypal.js'

const router = Router()

/** Create deposit invoice + PayPal link from signed contract (repair / manual) */
router.post('/:clientId/generate', authMiddleware, requireRole('admin'), async (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  const contract = store.contracts.find((c) => c.clientId === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (!contract) return res.status(400).json({ error: 'No contract found for this client' })

  const invoiceDraft = buildDepositInvoice(contract, client)
  if (!invoiceDraft) {
    return res.status(400).json({ error: 'Could not determine deposit amount from contract' })
  }

  const now = new Date().toISOString()
  let invoice = {
    description: invoiceDraft.description,
    amount: invoiceDraft.amount,
    currency: invoiceDraft.currency,
    invoiceType: 'deposit',
    createdAt: now,
  }

  if (isPayPalConfigured()) {
    try {
      const order = await createPayPalOrder({
        clientId,
        amount: invoiceDraft.amount,
        currency: invoiceDraft.currency,
        description: invoiceDraft.description,
      })
      invoice.paypalOrderId = order.orderId
      invoice.paymentLink = order.approvalUrl
    } catch (err) {
      console.error('generate invoice paypal', err)
      return res.status(500).json({ error: err.message })
    }
  }

  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) => (c.id === clientId ? { ...c, invoice } : c)),
  }))

  res.json({ ok: true, invoice })
})

/** Admin sends the auto-generated invoice link to the client portal */
router.post('/:clientId/send', authMiddleware, requireRole('admin'), (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)

  if (!client) {
    return res.status(404).json({ error: 'Client not found' })
  }
  if (!client.isOfficialClient) {
    return res.status(400).json({
      error: 'Client must sign the contract and become official before sending an invoice.',
    })
  }
  if (!client.invoice) {
    return res.status(400).json({
      error: 'No invoice found. It is created automatically when the client signs the contract.',
    })
  }
  if (!client.invoice.paymentLink) {
    return res.status(400).json({
      error: 'PayPal payment link is missing. Check PayPal credentials in .env and re-send after fixing.',
    })
  }
  if (client.invoice.paidAt) {
    return res.status(400).json({ error: 'This invoice has already been paid.' })
  }

  const now = new Date().toISOString()
  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            invoice: { ...c.invoice, sentToPortalAt: now },
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Deposit invoice ($${c.invoice.amount.toFixed(2)}) sent to client portal on ${new Date(now).toLocaleDateString()}.`,
                category: 'Payment',
                createdAt: now,
              },
            ],
          }
        : c
    ),
    adminNotifications: [
      {
        id: generateId(),
        type: 'invoice_sent',
        read: true,
        createdAt: now,
        title: 'Invoice sent',
        message: `Invoice sent to ${client.name} via portal.`,
        clientId,
      },
      ...(s.adminNotifications ?? []),
    ],
  }))

  res.json({
    ok: true,
    message: `Invoice link sent to ${client.name}'s portal.`,
    sentToPortalAt: now,
  })
})

/** Admin sends the final balance invoice to the client portal */
router.post('/:clientId/send-final', authMiddleware, requireRole('admin'), (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (!client.projectCompletedAt) {
    return res.status(400).json({
      error: 'Mark the project complete first to generate the final invoice.',
    })
  }
  if (!client.finalInvoice) {
    return res.status(400).json({ error: 'No final invoice found for this client.' })
  }
  if (!client.finalInvoice.paymentLink) {
    return res.status(400).json({
      error: 'PayPal payment link is missing. Check PayPal credentials in .env.',
    })
  }
  if (client.finalInvoice.paidAt) {
    return res.status(400).json({ error: 'Final invoice has already been paid.' })
  }

  const now = new Date().toISOString()
  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            finalInvoice: { ...c.finalInvoice, sentToPortalAt: now },
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Final invoice ($${c.finalInvoice.amount.toFixed(2)}) sent to client portal on ${new Date(now).toLocaleDateString()}.`,
                category: 'Payment',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }))

  res.json({
    ok: true,
    message: `Final invoice sent to ${client.name}'s portal.`,
    sentToPortalAt: now,
  })
})

/** Regenerate final invoice (repair) */
router.post('/:clientId/generate-final', authMiddleware, requireRole('admin'), async (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  const contract = store.contracts.find((c) => c.clientId === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (!contract) return res.status(400).json({ error: 'No contract found' })

  const invoiceDraft = buildFinalInvoice(contract, client)
  if (!invoiceDraft) {
    return res.status(400).json({ error: 'Could not determine remaining balance' })
  }

  const now = new Date().toISOString()
  let finalInvoice = {
    description: invoiceDraft.description,
    amount: invoiceDraft.amount,
    currency: invoiceDraft.currency,
    invoiceType: 'final',
    createdAt: now,
  }

  if (isPayPalConfigured()) {
    try {
      const order = await createPayPalOrder({
        clientId,
        amount: invoiceDraft.amount,
        currency: invoiceDraft.currency,
        description: invoiceDraft.description,
      })
      finalInvoice.paypalOrderId = order.orderId
      finalInvoice.paymentLink = order.approvalUrl
    } catch (err) {
      console.error('generate final invoice paypal', err)
      return res.status(500).json({ error: err.message })
    }
  }

  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) => (c.id === clientId ? { ...c, finalInvoice } : c)),
  }))

  res.json({ ok: true, finalInvoice })
})

export default router
