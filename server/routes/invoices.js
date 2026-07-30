import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { generateId } from '../lib/notifications.js'
import { notifyClientByClientId } from '../lib/clientNotifications.js'
import { buildDepositInvoice, buildFinalInvoice } from '../lib/invoice.js'
import {
  attachPaymentLink,
  getContractPaymentProvider,
  isPaymentProviderConfigured,
  paymentProviderLabel,
} from '../lib/paymentLinks.js'

const router = Router()

/** Create deposit invoice + payment link from signed contract (repair / manual) */
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

  const provider = getContractPaymentProvider(contract)
  if (!isPaymentProviderConfigured(provider, store.settings)) {
    return res.status(400).json({
      error:
        provider === 'zelle'
          ? 'Zelle is not connected. Add your Zelle email or phone in Company Profile.'
          : `${paymentProviderLabel(provider)} is not configured. Check credentials in .env and restart npm run dev.`,
    })
  }

  const now = new Date().toISOString()
  let invoice = {
    description: invoiceDraft.description,
    amount: invoiceDraft.amount,
    currency: invoiceDraft.currency,
    invoiceType: 'deposit',
    createdAt: now,
  }

  try {
    invoice = await attachPaymentLink(invoice, {
      contract,
      clientId,
      invoiceType: 'deposit',
      settings: store.settings,
    })
  } catch (err) {
    console.error('generate invoice payment link', err)
    return res.status(500).json({ error: err.message })
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
  const contract = store.contracts.find((c) => c.clientId === clientId)

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
    const provider = client.invoice.paymentProvider ?? getContractPaymentProvider(contract)
    return res.status(400).json({
      error: `${paymentProviderLabel(provider)} payment link is missing. Check credentials in .env and re-send after fixing.`,
    })
  }
  if (client.invoice.paidAt) {
    return res.status(400).json({ error: 'This invoice has already been paid.' })
  }

  const now = new Date().toISOString()
  updateStore((s) => {
    let next = {
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
    }
    next = notifyClientByClientId(next, clientId, {
      type: 'invoice_sent',
      title: 'Deposit invoice ready',
      message: `Your deposit invoice for ${client.projectName} is ready. Pay from your dashboard.`,
      actionUrl: '/portal',
      relatedId: `invoice-sent-${clientId}`,
    })
    return next
  })

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
    const provider = client.finalInvoice.paymentProvider ?? 'paypal'
    return res.status(400).json({
      error: `${paymentProviderLabel(provider)} payment link is missing. Check credentials in .env.`,
    })
  }
  if (client.finalInvoice.paidAt) {
    return res.status(400).json({ error: 'Final invoice has already been paid.' })
  }

  const now = new Date().toISOString()
  updateStore((s) => {
    let next = {
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
    }
    next = notifyClientByClientId(next, clientId, {
      type: 'final_invoice_sent',
      title: 'Final invoice ready',
      message: `Your final invoice for ${client.projectName} is ready. Pay from your dashboard.`,
      actionUrl: '/portal',
      relatedId: `final-invoice-sent-${clientId}`,
    })
    return next
  })

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

  try {
    finalInvoice = await attachPaymentLink(finalInvoice, {
      contract,
      clientId,
      invoiceType: 'final',
      settings: store.settings,
    })
  } catch (err) {
    console.error('generate final invoice payment link', err)
    return res.status(500).json({ error: err.message })
  }

  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) => (c.id === clientId ? { ...c, finalInvoice } : c)),
  }))

  res.json({ ok: true, finalInvoice })
})

export default router
