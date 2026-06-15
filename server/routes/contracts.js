import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { pushAdminNotification } from '../lib/notifications.js'
import { generateId } from '../lib/notifications.js'
import { buildDepositInvoice } from '../lib/invoice.js'
import {
  clientCanSignContract,
  contractContentFingerprint,
  needsClientResign,
} from '../lib/contractReview.js'
import { attachPaymentLink } from '../lib/paymentLinks.js'
import { permanentlyDeleteContract } from '../lib/deleteContract.js'

const router = Router()

/** Admin sends contract to client's account */
router.post('/:contractId/send', authMiddleware, requireRole('admin'), (req, res) => {
  const { contractId } = req.params
  const store = readStore()
  const contract = store.contracts.find((c) => c.id === contractId)
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' })
  }

  const client = store.clients.find((c) => c.id === contract.clientId)
  if (!client) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const clientEmail = client.email.trim().toLowerCase()
  let clientUser = store.users.find(
    (u) => u.role === 'client' && u.clientId === client.id
  )
  if (!clientUser) {
    clientUser = store.users.find(
      (u) => u.role === 'client' && u.email === clientEmail
    )
    if (clientUser && !clientUser.clientId) {
      updateStore((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === clientUser.id ? { ...u, clientId: client.id } : u
        ),
        clients: s.clients.map((c) =>
          c.id === client.id ? { ...c, accountUserId: clientUser.id } : c
        ),
      }))
    }
  }
  if (!clientUser) {
    return res.status(400).json({
      error: 'Client has no account yet. Ask them to register at the client portal using the same email.',
    })
  }

  const now = new Date().toISOString()
  let updatedContract = null

  updateStore((s) => {
    const contracts = s.contracts.map((c) => {
      if (c.id !== contractId) return c
      updatedContract = {
        ...c,
        sentAt: now,
        viewedAt: undefined,
        signedAt: undefined,
        confirmedByClient: false,
        clientSignature: undefined,
        clientSignDate: undefined,
      }
      return updatedContract
    })
    return {
      ...s,
      contracts,
      clients: s.clients.map((c) =>
        c.id === client.id
          ? { ...c, contractStatus: 'Sent', projectStatus: 'Contract Sent' }
          : c
      ),
    }
  })

  res.json({
    ok: true,
    message: `Contract sent to ${clientUser.name} (${clientUser.email})`,
    contract: updatedContract,
    sentAt: now,
  })
})

/** Client confirms and signs contract */
router.post('/:contractId/confirm', authMiddleware, requireRole('client'), async (req, res) => {
  const { contractId } = req.params
  const { signature } = req.body
  if (!signature?.trim()) {
    return res.status(400).json({ error: 'Signature is required' })
  }

  const store = readStore()
  const contract = store.contracts.find((c) => c.id === contractId)
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' })
  }

  if (contract.clientId !== req.user.clientId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!contract.sentAt) {
    return res.status(400).json({ error: 'This contract has not been sent yet' })
  }

  const clientRecord = store.clients.find((c) => c.id === contract.clientId)

  if (contract.confirmedByClient && !needsClientResign(contract, clientRecord)) {
    return res.status(400).json({ error: 'Contract already confirmed' })
  }

  if (!clientCanSignContract(contract)) {
    return res.status(400).json({
      error: 'Please review the full contract before signing.',
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
    }

    try {
      generatedInvoice = await attachPaymentLink(generatedInvoice, {
        contract,
        clientId: contract.clientId,
        invoiceType: 'deposit',
        returnPath: '/portal/payment/success',
        cancelPath: '/portal?payment=cancelled',
      })
    } catch (err) {
      console.error('Payment link on contract sign', err)
    }
  }

  updateStore((s) => {
    let next = {
      ...s,
      contracts: s.contracts.map((c) =>
        c.id === contractId
          ? {
              ...c,
              clientSignature: signature.trim(),
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
            text: `Client signed contract electronically (${new Date(now).toLocaleDateString()}). Now an official client — portal file sharing is enabled.`,
            category: 'Contract',
            createdAt: now,
          },
        ]
        if (generatedInvoice) {
          notes.push({
            id: generateId(),
            text: `Deposit invoice auto-generated: $${generatedInvoice.amount.toFixed(2)} USD. Click "Send Invoice Link" to deliver it to the client portal.`,
            category: 'Payment',
            createdAt: now,
          })
        }
        return {
          ...c,
          contractStatus: 'Signed',
          projectStatus: 'Contract Signed',
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
      title: 'Contract signed',
      message: `${clientRecord?.name ?? 'A client'} signed "${contract.projectTitle}". Deposit invoice is ready — send it from their profile.`,
    })
    return next
  })

  res.json({
    ok: true,
    message: 'Contract confirmed successfully',
    invoiceGenerated: Boolean(generatedInvoice),
  })
})

/** Admin permanently deletes a contract — irreversible */
router.post('/:contractId/permanent-delete', authMiddleware, requireRole('admin'), (req, res) => {
  const { contractId } = req.params
  const { confirmContractId } = req.body ?? {}

  if (!confirmContractId || confirmContractId.trim() !== contractId) {
    return res.status(400).json({
      error: 'Type the exact contract ID to confirm permanent deletion.',
    })
  }

  const store = readStore()
  const result = permanentlyDeleteContract(store, contractId, req.user)
  if (!result) {
    return res.status(404).json({ error: 'Contract not found' })
  }

  updateStore(() => result.store)

  res.json({
    ok: true,
    message: 'Contract permanently deleted.',
    auditEntry: result.auditEntry,
    clientId: result.clientId,
  })
})

export default router
