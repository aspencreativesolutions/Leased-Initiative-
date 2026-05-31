import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'

const router = Router()

router.use(authMiddleware, requireRole('admin'))

router.get('/', (_req, res) => {
  const store = readStore()
  res.json({
    clients: store.clients,
    contracts: store.contracts,
    settings: store.settings,
  })
})

router.put('/clients', (req, res) => {
  const { clients } = req.body
  if (!Array.isArray(clients)) {
    return res.status(400).json({ error: 'clients array required' })
  }
  updateStore((s) => {
    let users = [...s.users]
    const linkedClients = clients.map((client) => {
      const email = client.email?.trim().toLowerCase()
      let user = client.accountUserId
        ? users.find((u) => u.id === client.accountUserId && u.role === 'client')
        : undefined
      if (!user) {
        user = users.find((u) => u.role === 'client' && u.email === email && !u.clientId)
      }
      if (user && !user.clientId) {
        users = users.map((u) =>
          u.id === user.id ? { ...u, clientId: client.id } : u
        )
      }
      return user ? { ...client, accountUserId: user.id } : client
    })
    return { ...s, clients: linkedClients, users }
  })
  res.json({ ok: true })
})

router.put('/contracts', (req, res) => {
  const { contracts } = req.body
  if (!Array.isArray(contracts)) {
    return res.status(400).json({ error: 'contracts array required' })
  }
  updateStore((s) => ({ ...s, contracts }))
  res.json({ ok: true })
})

router.put('/settings', (req, res) => {
  const { settings } = req.body
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'settings object required' })
  }
  updateStore((s) => ({ ...s, settings: { ...s.settings, ...settings } }))
  res.json({ ok: true })
})

/** One-time migration from browser localStorage on first admin login */
router.post('/migrate', (req, res) => {
  const { clients, contracts, settings } = req.body
  const store = readStore()
  if (store.clients.length > 0 || store.contracts.length > 0) {
    return res.status(409).json({ error: 'Server already has data' })
  }
  updateStore((s) => ({
    ...s,
    clients: Array.isArray(clients) ? clients : [],
    contracts: Array.isArray(contracts) ? contracts : [],
    settings: settings ? { ...s.settings, ...settings } : s.settings,
  }))
  res.json({ ok: true, migrated: true })
})

/** Portal sign-ups not yet added as clients */
router.get('/registrations', (_req, res) => {
  const store = readStore()
  const registrations = store.users
    .filter((u) => u.role === 'client' && !u.clientId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ registrations, count: registrations.length })
})

export default router
