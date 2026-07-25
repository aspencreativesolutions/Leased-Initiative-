import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { pushAdminNotification } from '../lib/notifications.js'
import { generateId } from '../lib/notifications.js'
import { notifyClientByClientId } from '../lib/clientNotifications.js'
import { buildDepositInvoice } from '../lib/invoice.js'
import {
  clientCanSignContract,
  contractContentFingerprint,
  needsClientResign,
} from '../lib/contractReview.js'
import { attachPaymentLink } from '../lib/paymentLinks.js'
import { permanentlyDeleteContract } from '../lib/deleteContract.js'
import { applySendContract } from '../lib/sendContract.js'

const router = Router()

/** Admin sends contract to client's account */
router.post('/:contractId/send', authMiddleware, requireRole('admin'), (req, res) => {
  const { contractId } = req.params
  const store = readStore()
  const contract = store.contracts.find((c) => c.id === contractId)
  if (!contract) {
    return res.status(404).json({ error: 'Lease not found' })
  }

  const client = store.clients.find((c) => c.id === contract.clientId)
  if (!client) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const result = applySendContract(store, contractId)
  if (!result) {
    return res.status(400).json({
      error:
        'Client has no account yet. Ask them to register at the client portal using the same email.',
    })
  }

  updateStore(() => result.store)

  res.json({
    ok: true,
    message: `Lease sent to ${result.clientUser.name} (${result.clientUser.email})`,
    contract: result.contract,
    sentAt: result.sentAt,
  })
})

/** Client confirms and signs contract */
router.post('/:contractId/confirm', authMiddleware, requireRole('client'), async (req, res) => {
  const { contractId } = req.params
  const { signature, signatureImage } = req.body
  if (!signature?.trim()) {
    return res.status(400).json({ error: 'Signature is required' })
  }

  const trimmedImage =
    typeof signatureImage === 'string' && signatureImage.startsWith('data:image/')
      ? signatureImage.trim()
      : ''
  if (!trimmedImage) {
    return res.status(400).json({ error: 'Please draw your signature to continue' })
  }
  // Rough cap (~750KB) so store JSON stays manageable
  if (trimmedImage.length > 750_000) {
    return res.status(400).json({ error: 'Signature image is too large — please try again' })
  }

  const store = readStore()
  const contract = store.contracts.find((c) => c.id === contractId)
  if (!contract) {
    return res.status(404).json({ error: 'Lease not found' })
  }

  if (contract.clientId !== req.user.clientId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!contract.sentAt) {
    return res.status(400).json({ error: 'This lease has not been sent yet' })
  }

  const clientRecord = store.clients.find((c) => c.id === contract.clientId)

  if (contract.confirmedByClient && !needsClientResign(contract, clientRecord)) {
    return res.status(400).json({ error: 'Lease already confirmed' })
  }

  if (!clientCanSignContract(contract)) {
    return res.status(400).json({
      error: 'Please review the full lease before signing.',
    })
  }

  const now = new Date().toISOString()

  const invoiceDraft = clientRecord ? buildDepositInvoice(contract, clientRecord) : null
  let generatedInvoice = null

  if (invoiceDraft) {
    generatedInvoice = {
      description: invoiceDraft.description,
      amount: invoiceDraft.amount,
      currency: invoiceDraft.currency,
      invoiceType: 'deposit',
      createdAt: now,
      sentToPortalAt: now,
    }

    try {
      generatedInvoice = await attachPaymentLink(generatedInvoice, {
        contract,
        clientId: contract.clientId,
        invoiceType: 'deposit',
        returnPath: '/portal/payment/success',
        cancelPath: '/portal?payment=cancelled',
      })
      generatedInvoice = { ...generatedInvoice, sentToPortalAt: now }
    } catch (err) {
      console.error('Payment link on contract sign', err)
    }
  }

  const tenantName = clientRecord?.name ?? 'A tenant'
  const projectLabel = contract.projectTitle || clientRecord?.projectName || 'their lease'

  updateStore((s) => {
    let next = {
      ...s,
      contracts: s.contracts.map((c) =>
        c.id === contractId
          ? {
              ...c,
              clientSignature: signature.trim(),
              clientSignatureImage: trimmedImage,
              clientSignDate: now.slice(0, 10),
              signedAt: now,
              confirmedByClient: true,
              signedContentFingerprint: contractContentFingerprint(c),
            }
          : c
      ),
      clients: s.clients.map((c) => {
        if (c.id !== contract.clientId) return c
        const notes = [
          ...(c.notes ?? []),
          {
            id: generateId(),
            text: `Tenant signed lease electronically (${new Date(now).toLocaleDateString()}). Now an official client — status Awaiting Deposit until payment is confirmed.`,
            category: 'Contract',
            createdAt: now,
          },
        ]
        if (generatedInvoice) {
          const linkNote = generatedInvoice.paymentLink
            ? ' Payment link (PayPal, Stripe, or Square) delivered to their portal.'
            : ' Payment link could not be attached — check provider credentials and re-send from their profile.'
          notes.push({
            id: generateId(),
            text: `Deposit invoice auto-generated and sent: $${generatedInvoice.amount.toFixed(2)} USD.${linkNote}`,
            category: 'Payment',
            createdAt: now,
          })
        }
        return {
          ...c,
          contractStatus: 'Signed',
          projectStatus: 'Contract Signed',
          paymentStatus:
            c.paymentStatus === 'Deposit Paid' || c.paymentStatus === 'Paid'
              ? c.paymentStatus
              : 'Unpaid',
          isOfficialClient: true,
          officialClientSince: c.officialClientSince ?? now,
          invoice: generatedInvoice ?? c.invoice,
          notes,
        }
      }),
    }
    next = pushAdminNotification(next, {
      type: 'contract_signed',
      clientId: contract.clientId,
      contractId,
      title: 'Lease signed',
      message: generatedInvoice
        ? `${tenantName} signed "${projectLabel}". Deposit invoice was sent automatically — confirm payment when received.`
        : `${tenantName} signed "${projectLabel}".`,
    })
    next = notifyClientByClientId(next, contract.clientId, {
      type: 'contract_signed',
      title: 'Lease signed',
      message: `You signed "${projectLabel}". Your landlord has been notified.`,
      actionUrl: '/portal',
      relatedId: `contract-signed-${contractId}`,
    })
    if (generatedInvoice) {
      next = notifyClientByClientId(next, contract.clientId, {
        type: 'invoice_sent',
        title: 'Deposit invoice ready',
        message: `Your deposit invoice for ${projectLabel} is ready. Pay from your dashboard via PayPal, Stripe, or Square.`,
        actionUrl: '/portal',
        relatedId: `invoice-sent-${contract.clientId}-${now.slice(0, 10)}`,
      })
      next = pushAdminNotification(next, {
        type: 'invoice_sent',
        clientId: contract.clientId,
        contractId,
        title: 'Deposit invoice sent',
        message: `Deposit invoice ($${generatedInvoice.amount.toFixed(2)}) was sent to ${tenantName}'s portal.`,
      })
    }
    return next
  })

  res.json({
    ok: true,
    message: 'Lease confirmed successfully',
    invoiceGenerated: Boolean(generatedInvoice),
    invoiceSent: Boolean(generatedInvoice?.sentToPortalAt),
  })
})

/** Admin permanently deletes a contract — irreversible */
router.post('/:contractId/permanent-delete', authMiddleware, requireRole('admin'), (req, res) => {
  const { contractId } = req.params
  const { confirmContractId } = req.body ?? {}

  if (!confirmContractId || confirmContractId.trim() !== contractId) {
    return res.status(400).json({
      error: 'Type the exact lease ID to confirm permanent deletion.',
    })
  }

  const store = readStore()
  const result = permanentlyDeleteContract(store, contractId, req.user)
  if (!result) {
    return res.status(404).json({ error: 'Lease not found' })
  }

  updateStore(() => result.store)

  res.json({
    ok: true,
    message: 'Lease permanently deleted.',
    auditEntry: result.auditEntry,
    clientId: result.clientId,
  })
})

export default router
