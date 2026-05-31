import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'

const router = Router()

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

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
  updateStore((s) => ({
    ...s,
    contracts: s.contracts.map((c) =>
      c.id === contractId
        ? { ...c, sentAt: now, viewedAt: undefined, confirmedByClient: false }
        : c
    ),
    clients: s.clients.map((c) =>
      c.id === client.id
        ? { ...c, contractStatus: 'Sent', projectStatus: 'Contract Sent' }
        : c
    ),
  }))

  res.json({
    ok: true,
    message: `Contract sent to ${clientUser.name} (${clientUser.email})`,
  })
})

/** Client confirms and signs contract */
router.post('/:contractId/confirm', authMiddleware, requireRole('client'), (req, res) => {
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

  if (contract.confirmedByClient) {
    return res.status(400).json({ error: 'Contract already confirmed' })
  }

  const now = new Date().toISOString()
  updateStore((s) => ({
    ...s,
    contracts: s.contracts.map((c) =>
      c.id === contractId
        ? {
            ...c,
            clientSignature: signature.trim(),
            clientSignDate: now.slice(0, 10),
            signedAt: now,
            confirmedByClient: true,
          }
        : c
    ),
    clients: s.clients.map((c) =>
      c.id === contract.clientId
        ? {
            ...c,
            contractStatus: 'Signed',
            projectStatus: 'Contract Signed',
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Client confirmed contract electronically (${new Date(now).toLocaleDateString()}).`,
                category: 'Contract',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }))

  res.json({ ok: true, message: 'Contract confirmed successfully' })
})

export default router
