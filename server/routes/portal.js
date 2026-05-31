import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'

const router = Router()

router.use(authMiddleware, requireRole('client'))

/** Client dashboard — own profile + contracts */
router.get('/dashboard', (req, res) => {
  const store = readStore()
  const clientId = req.user.clientId

  if (!clientId) {
    return res.json({
      linked: false,
      client: null,
      contracts: [],
      message:
        'Your account is not linked to a client profile yet. Register with the same email your designer has on file, or contact them to connect your account.',
    })
  }

  const client = store.clients.find((c) => c.id === clientId)
  const contracts = store.contracts.filter((c) => c.clientId === clientId)

  res.json({
    linked: true,
    client: client
      ? {
          id: client.id,
          name: client.name,
          businessName: client.businessName,
          projectName: client.projectName,
          projectStatus: client.projectStatus,
          contractStatus: client.contractStatus,
        }
      : null,
    contracts: contracts.map((c) => ({
      id: c.id,
      projectTitle: c.projectTitle,
      totalCost: c.totalCost,
      sentAt: c.sentAt,
      signedAt: c.signedAt,
      viewedAt: c.viewedAt,
      confirmedByClient: c.confirmedByClient ?? false,
      pdfGenerated: c.pdfGenerated ?? false,
    })),
  })
})

/** Full contract detail for client review */
router.get('/contracts/:contractId', (req, res) => {
  const store = readStore()
  const contract = store.contracts.find((c) => c.id === req.params.contractId)

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' })
  }

  if (contract.clientId !== req.user.clientId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!contract.sentAt) {
    return res.status(403).json({ error: 'This contract is not available yet' })
  }

  const now = new Date().toISOString()
  if (!contract.viewedAt) {
    updateStore((s) => ({
      ...s,
      contracts: s.contracts.map((c) =>
        c.id === contract.id ? { ...c, viewedAt: now } : c
      ),
    }))
  }

  res.json({
    contract: { ...contract, viewedAt: contract.viewedAt ?? now },
    settings: {
      businessName: store.settings.businessName,
      ownerName: store.settings.ownerName,
    },
  })
})

export default router
