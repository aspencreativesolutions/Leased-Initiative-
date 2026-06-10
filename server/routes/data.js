import { Router } from 'express'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { createDraftContract } from '../lib/contractDraft.js'
import {
  applyClientContractRevision,
  mergeContractsList,
} from '../lib/contractMerge.js'
import { generateId } from '../lib/notifications.js'
import {
  canStartProject,
  ensureOfficialWhenProjectActive,
  promoteToOfficialClient,
} from '../lib/clientWorkflow.js'
import { buildProjectTimeline, getSkippedStepIdsForTarget } from '../lib/projectTimeline.js'
import { getTimelineStepLabel } from '../lib/timelineSteps.js'
import { applyTimelineSkipEffects } from '../lib/timelineSkipEffects.js'
import { ensureClientFileSharing } from '../lib/ensureFileSharing.js'
import {
  buildPortalUsersOverview,
  isPendingPortalRegistration,
} from '../lib/portalUsers.js'
import { buildFinalInvoice } from '../lib/invoice.js'
import { attachPaymentLink } from '../lib/paymentLinks.js'
import {
  deleteClientAccountFromStore,
  deleteClientUploads,
  removeClientFromStore,
} from '../lib/clientCleanup.js'

const router = Router()

const CLIENT_PRESERVE_FIELDS = [
  'projectStartedAt',
  'projectCompletedAt',
  'depositPaymentConfirmedAt',
  'invoice',
  'finalInvoice',
  'officialClientSince',
  'timelineStepSkips',
]

router.use(authMiddleware, requireRole('admin'))

router.get('/', (_req, res) => {
  let store = readStore()
  let repairedAny = false
  const clients = store.clients.map((client) => {
    const repaired = ensureOfficialWhenProjectActive(client)
    if (repaired !== client) repairedAny = true
    return repaired
  })
  if (repairedAny) {
    store = updateStore((s) => ({ ...s, clients }))
  }
  res.json({
    clients,
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
      const existing = s.clients.find((c) => c.id === client.id)
      const merged = user ? { ...client, accountUserId: user.id } : client
      if (!existing) return merged
      for (const field of CLIENT_PRESERVE_FIELDS) {
        if (merged[field] === undefined && existing[field] !== undefined) {
          merged[field] = existing[field]
        }
      }
      if (existing.projectStartedAt && !merged.projectStartedAt) {
        merged.projectStartedAt = existing.projectStartedAt
      }
      if (existing.timelineStepSkips && !merged.timelineStepSkips) {
        merged.timelineStepSkips = existing.timelineStepSkips
      } else if (existing.timelineStepSkips && merged.timelineStepSkips) {
        merged.timelineStepSkips = {
          ...existing.timelineStepSkips,
          ...merged.timelineStepSkips,
        }
      }
      if (existing.invoice && merged.invoice) {
        merged.invoice = { ...existing.invoice, ...merged.invoice }
      } else if (existing.invoice && !merged.invoice) {
        merged.invoice = existing.invoice
      }
      if (existing.finalInvoice && merged.finalInvoice) {
        merged.finalInvoice = { ...existing.finalInvoice, ...merged.finalInvoice }
      } else if (existing.finalInvoice && !merged.finalInvoice) {
        merged.finalInvoice = existing.finalInvoice
      }
      return merged
    })
    return { ...s, clients: linkedClients, users }
  })
  res.json({ ok: true })
})

/** Admin starts the client project — unlocks portal uploads */
router.post('/clients/:clientId/start-project', (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (client.projectStartedAt) {
    return res.status(400).json({ error: 'Project has already been started' })
  }
  if (!canStartProject(client)) {
    return res.status(400).json({
      error:
        'Contract must be signed and the client must click the PayPal payment link before starting the project.',
    })
  }

  const now = new Date().toISOString()
  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) => {
      if (c.id !== clientId) return c
      return promoteToOfficialClient(
        {
          ...c,
          projectStatus: 'In Progress',
          paymentStatus:
            c.paymentStatus === 'Unpaid' && c.timelineStepSkips?.pay_link_clicked
              ? 'Deposit Paid'
              : c.paymentStatus === 'Pay Link Clicked'
                ? 'Deposit Paid'
                : c.paymentStatus,
          depositPaymentConfirmedAt: c.depositPaymentConfirmedAt ?? now,
          projectStartedAt: now,
          notes: [
            ...(c.notes ?? []),
            {
              id: generateId(),
              text: `Project started on ${new Date(now).toLocaleDateString()}. Client portal file sharing is now active.`,
              category: 'Project',
              createdAt: now,
            },
          ],
        },
        now
      )
    }),
  }))

  res.json({ ok: true, projectStartedAt: now })
})

/** Project timeline for admin client view */
router.get('/clients/:clientId/timeline', (req, res) => {
  ensureClientFileSharing(req.params.clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.params.clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const contract = store.contracts.find((c) => c.clientId === client.id)
  res.json({
    steps: buildProjectTimeline(client, contract),
    finalInvoice: client.finalInvoice ?? null,
  })
})

/** Admin skips ahead on the project timeline */
router.post('/clients/:clientId/timeline/skip', (req, res) => {
  const { clientId } = req.params
  const { targetStepId, note, addNote } = req.body ?? {}

  if (!targetStepId) {
    return res.status(400).json({ error: 'targetStepId is required' })
  }

  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const contract = store.contracts.find((c) => c.clientId === clientId)
  const steps = buildProjectTimeline(client, contract)
  const skippedStepIds = getSkippedStepIdsForTarget(steps, targetStepId)
  const targetStep = steps.find((s) => s.id === targetStepId)

  if (!targetStep || targetStep.status === 'completed') {
    return res.status(400).json({ error: 'That timeline step cannot be skipped to.' })
  }
  if (skippedStepIds.length === 0 && targetStep.status !== 'pending') {
    return res.status(400).json({ error: 'No steps to skip — you are already at this stage.' })
  }

  const now = new Date().toISOString()
  const timelineStepSkips = { ...(client.timelineStepSkips ?? {}) }
  for (const stepId of skippedStepIds) {
    timelineStepSkips[stepId] = { skippedAt: now }
  }

  const noteEntry =
    addNote && note?.trim()
      ? {
          id: generateId(),
          text: note.trim(),
          category: 'Project',
          createdAt: now,
          timelineStepId: targetStepId,
        }
      : null

  const { client: effectClient, contract: effectContract } = applyTimelineSkipEffects(
    client,
    contract,
    skippedStepIds,
    targetStepId,
    now
  )

  updateStore((s) => ({
    ...s,
    contracts: effectContract
      ? s.contracts.map((c) => (c.clientId === clientId ? effectContract : c))
      : s.contracts,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...effectClient,
            timelineStepSkips,
            notes: noteEntry ? [...(effectClient.notes ?? []), noteEntry] : effectClient.notes,
          }
        : c
    ),
  }))

  res.json({
    ok: true,
    skippedStepIds,
    targetStepId,
    targetLabel: getTimelineStepLabel(targetStepId),
    noteId: noteEntry?.id,
  })
})

/** Admin manually confirms deposit after verifying on PayPal */
router.post('/clients/:clientId/confirm-payment', (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  if (client.depositPaymentConfirmedAt || client.invoice?.paidAt) {
    return res.status(400).json({ error: 'Deposit payment is already confirmed' })
  }
  const payLinkSkipped = Boolean(client.timelineStepSkips?.pay_link_clicked)
  if (
    !client.invoice?.paymentLinkClickedAt &&
    client.paymentStatus !== 'Pay Link Clicked' &&
    !payLinkSkipped
  ) {
    return res.status(400).json({
      error: 'Client must click the PayPal link before you can confirm payment.',
    })
  }

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
              ? { ...c.invoice, paidAt: now, sentToPortalAt: c.invoice.sentToPortalAt ?? now }
              : c.invoice,
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Deposit payment confirmed on ${new Date(now).toLocaleDateString()} after PayPal verification.`,
                category: 'Payment',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }))

  res.json({ ok: true, depositPaymentConfirmedAt: now })
})

/** Mark project complete and auto-generate final balance invoice */
router.post('/clients/:clientId/complete-project', async (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  const contract = store.contracts.find((c) => c.clientId === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (!client.projectStartedAt) {
    return res.status(400).json({ error: 'Start the project before marking it complete.' })
  }
  if (client.projectCompletedAt) {
    return res.status(400).json({ error: 'Project is already marked complete.' })
  }
  if (!contract) {
    return res.status(400).json({ error: 'No contract found for this client.' })
  }

  const invoiceDraft = buildFinalInvoice(contract, client)
  if (!invoiceDraft) {
    return res.status(400).json({
      error: 'Could not determine remaining balance from contract.',
    })
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
    })
  } catch (err) {
    console.error('final invoice payment link', err)
    return res.status(500).json({ error: err.message })
  }

  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            projectStatus: 'Completed',
            projectCompletedAt: now,
            finalInvoice,
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `Project marked complete on ${new Date(now).toLocaleDateString()}. Final invoice ($${finalInvoice.amount.toFixed(2)}) generated — send it from the client profile.`,
                category: 'Project',
                createdAt: now,
              },
            ],
          }
        : c
    ),
  }))

  res.json({ ok: true, projectCompletedAt: now, finalInvoice })
})

router.put('/contracts', (req, res) => {
  const { contracts } = req.body
  if (!Array.isArray(contracts)) {
    return res.status(400).json({ error: 'contracts array required' })
  }

  const now = new Date().toISOString()
  let revisedClientIds = []

  updateStore((s) => {
    const { contracts: mergedContracts, revisedClientIds: revised } = mergeContractsList(
      s.contracts,
      contracts,
      s.clients,
      now
    )
    revisedClientIds = revised

    if (revised.length === 0) {
      return { ...s, contracts: mergedContracts }
    }

    const revisedSet = new Set(revised)
    return {
      ...s,
      contracts: mergedContracts,
      clients: s.clients.map((client) =>
        revisedSet.has(client.id) ? applyClientContractRevision(client, now) : client
      ),
    }
  })

  res.json({ ok: true, revisedClientIds })
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

/** Unread admin notifications (registrations, signed contracts, etc.) */
router.get('/notifications', (_req, res) => {
  const store = readStore()
  const notifications = (store.adminNotifications ?? [])
    .filter((n) => !n.read)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ notifications, count: notifications.length })
})

router.post('/notifications/read', (req, res) => {
  const { ids, type } = req.body ?? {}
  updateStore((s) => ({
    ...s,
    adminNotifications: (s.adminNotifications ?? []).map((n) => {
      if (ids && Array.isArray(ids) && ids.includes(n.id)) return { ...n, read: true }
      if (type && n.type === type) return { ...n, read: true }
      if (!ids && !type) return { ...n, read: true }
      return n
    }),
  }))
  res.json({ ok: true })
})

/** Accept a portal registration, create client + contract draft, link accounts */
router.post('/accept-registration/:userId', (req, res) => {
  const { userId } = req.params
  const store = readStore()
  const user = store.users.find((u) => u.id === userId && u.role === 'client')
  if (!user) {
    return res.status(404).json({ error: 'Registration not found' })
  }

  const existingClient = store.clients.find(
    (c) => c.email?.trim().toLowerCase() === user.email.trim().toLowerCase()
  )
  if (existingClient) {
    const contract = store.contracts.find((c) => c.clientId === existingClient.id)
    updateStore((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === userId ? { ...u, clientId: existingClient.id } : u
      ),
      clients: s.clients.map((c) =>
        c.id === existingClient.id ? { ...c, accountUserId: user.id } : c
      ),
      adminNotifications: (s.adminNotifications ?? []).map((n) =>
        n.type === 'registration' && n.userId === userId ? { ...n, read: true } : n
      ),
    }))
    return res.json({
      client: { ...existingClient, accountUserId: user.id },
      contract: contract ?? null,
      linked: true,
    })
  }

  if (user.clientId) {
    const client = store.clients.find((c) => c.id === user.clientId)
    const contract = store.contracts.find((c) => c.clientId === user.clientId)
    return res.json({ client, contract: contract ?? null, linked: true })
  }

  const now = new Date().toISOString()
  const client = {
    id: generateId(),
    name: user.name,
    businessName: user.name,
    email: user.email,
    phone: '',
    projectType: 'Website Design',
    projectName: `${user.name} Project`,
    projectDescription: '',
    projectStatus: 'Inquiry',
    contractStatus: 'Not Started',
    paymentStatus: 'Unpaid',
    isOfficialClient: false,
    serviceTier: 'Starter',
    accountUserId: user.id,
    notes: [
      {
        id: generateId(),
        text: `Accepted from portal registration on ${new Date(now).toLocaleDateString()}. Contract draft started.`,
        category: 'General',
        createdAt: now,
      },
    ],
    deadlines: [],
    createdAt: now,
  }

  const contract = createDraftContract(client, store.settings)

  updateStore((s) => ({
    ...s,
    users: s.users.map((u) => (u.id === userId ? { ...u, clientId: client.id } : u)),
    clients: [...s.clients, client],
    contracts: [...s.contracts, contract],
    adminNotifications: (s.adminNotifications ?? []).map((n) =>
      n.type === 'registration' && n.userId === userId ? { ...n, read: true } : n
    ),
  }))

  res.status(201).json({ client, contract, linked: true })
})

/** Portal sign-ups not yet added as clients */
router.get('/registrations', (_req, res) => {
  const store = readStore()
  const registrations = store.users
    .filter(isPendingPortalRegistration)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ registrations, count: registrations.length })
})

/** Dismiss a portal registration from the new sign-ups queue */
router.post('/dismiss-registration/:userId', (req, res) => {
  const { userId } = req.params
  const store = readStore()
  const user = store.users.find((u) => u.id === userId && u.role === 'client')
  if (!user) {
    return res.status(404).json({ error: 'Registration not found' })
  }
  if (user.clientId) {
    return res.status(400).json({ error: 'This user has already been accepted as a client' })
  }

  updateStore((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.id === userId ? { ...u, registrationDismissed: true } : u
    ),
    adminNotifications: (s.adminNotifications ?? []).map((n) =>
      n.type === 'registration' && n.userId === userId ? { ...n, read: true } : n
    ),
  }))

  res.json({ ok: true })
})

/** Portal users — pending registrations and accepted clients with timeline stage */
router.get('/portal-users', (req, res) => {
  const store = readStore()
  for (const client of store.clients) {
    if (client.accountUserId || store.users.some((u) => u.clientId === client.id)) {
      ensureClientFileSharing(client.id)
    }
  }
  const freshStore = readStore()
  res.json(buildPortalUsersOverview(freshStore))
})

/** All portal client accounts (linked and unlinked) */
router.get('/client-accounts', (_req, res) => {
  const store = readStore()
  const accounts = store.users
    .filter((u) => u.role === 'client')
    .map((u) => {
      const client = u.clientId ? store.clients.find((c) => c.id === u.clientId) : null
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        clientId: u.clientId ?? null,
        clientName: client?.name ?? null,
        linked: Boolean(u.clientId),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ accounts, count: accounts.length })
})

/** Delete portal account and linked client roster entry */
router.delete('/client-accounts/:userId', (req, res) => {
  const { userId } = req.params
  const store = readStore()
  const user = store.users.find((u) => u.id === userId && u.role === 'client')
  if (!user) {
    return res.status(404).json({ error: 'Client account not found' })
  }

  const deletedClientId = user.clientId ?? undefined
  const next = deleteClientAccountFromStore(store, userId)
  if (!next) {
    return res.status(404).json({ error: 'Client account not found' })
  }

  updateStore(() => next)
  res.json({ ok: true, deletedClientId })
})

/** Remove client from roster; portal account is kept and unlinked */
router.delete('/clients/:clientId', (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const linkedUser = store.users.find(
    (u) => u.role === 'client' && (u.clientId === clientId || u.id === client.accountUserId)
  )

  const next = removeClientFromStore(store, clientId)
  if (!next) {
    return res.status(404).json({ error: 'Client not found' })
  }

  deleteClientUploads(clientId)
  updateStore(() => next)
  res.json({ ok: true, accountKept: Boolean(linkedUser) })
})

export default router
