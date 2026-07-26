import { Router } from 'express'
import { readStore, updateStore, writeStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import {
  cloneLeaseForClient,
  completeLeaseGenerationIfDue,
  createDraftContract,
  findPropertyForLease,
  findReusableLeaseAtAddress,
  resolveLeaseAgreementAction,
} from '../lib/contractDraft.js'
import {
  applyClientContractRevision,
  mergeContractsList,
} from '../lib/contractMerge.js'
import { generateId } from '../lib/notifications.js'
import { notifyClientByClientId } from '../lib/clientNotifications.js'
import { notifyProjectStatusChange } from '../lib/clientAutomation.js'
import {
  canStartProject,
  ensureOfficialWhenProjectActive,
  promoteToOfficialClient,
} from '../lib/clientWorkflow.js'
import { buildProjectTimeline, getSkippedStepIdsForTarget } from '../lib/projectTimeline.js'
import { getTimelineStepLabel } from '../lib/timelineSteps.js'
import { applyTimelineSkipEffects } from '../lib/timelineSkipEffects.js'
import { ensureClientFileSharing } from '../lib/ensureFileSharing.js'
import { contractNeedsDetail } from '../lib/contractPlaceholders.js'
import {
  appendContractToStore,
  ensureClientContract,
  notifyContractNeedsDetail,
  stepsRequireContract,
  stepsRequireProjectContract,
} from '../lib/ensureClientContract.js'
import { ensureClientContractRecord, ensureSampleClientContracts } from '../lib/sampleClientContracts.js'
import { ensureSamplePortalUsers } from '../lib/samplePortalUsers.js'
import { permanentlyDeleteClientContract } from '../lib/deleteContract.js'
import {
  buildMonthlyRentDeadlines,
  computeLeaseEndDate,
  DEFAULT_LEASE_LENGTH_MONTHS,
  formatLeaseLengthLabel,
  isFutureLeaseStartDate,
  isPlainYmd,
  listMonthlyRentDueDates,
  parseLeaseLengthMonths,
  resolveDefaultLeaseDates,
} from '../lib/leaseSchedule.js'
import { resolveServerScheduleAsOf } from '../lib/scheduleAsOf.js'
import {
  advanceLeaseGenerations,
  buildPortalUsersOverview,
  isPendingPortalRegistration,
} from '../lib/portalUsers.js'
import {
  buildInviteSmsBody,
  buildTenantInviteUrl,
  createTenantInvite,
  markTenantInviteDelivered,
} from '../lib/tenantInvites.js'
import {
  createPropertyRecord,
  ensureStoreProperties,
  updatePropertyRecord,
  validatePropertyInput,
} from '../lib/properties.js'
import { buildFinalInvoice } from '../lib/invoice.js'
import { attachPaymentLink } from '../lib/paymentLinks.js'
import {
  deleteClientAccountFromStore,
  deleteClientUploads,
  removeClientFromStore,
} from '../lib/clientCleanup.js'
import {
  ensureSampleHouseholdFields,
  ensureSampleLeaseAmounts,
  refreshAllSampleClientDates,
} from '../lib/sampleClientDates.js'
import { applyDemoLeaseFixturesToStore } from '../lib/applyDemoLeaseFixtures.js'
import { reconcileClientContractStatus } from '../lib/contractReview.js'
import { DEFAULT_SERVICE_TIER } from '../lib/serviceTier.js'
import { sendOverdueRentSms, sendSms } from '../lib/sms.js'
import { sendBugReportEmail } from '../lib/email.js'

const router = Router()

const CLIENT_PRESERVE_FIELDS = [
  'projectStartedAt',
  'projectCompletedAt',
  'depositPaymentConfirmedAt',
  'invoice',
  'finalInvoice',
  'officialClientSince',
  'timelineStepSkips',
  'projectChecklistCompleted',
]

router.use(authMiddleware, requireRole('admin'))

router.get('/', async (_req, res) => {
  let store = readStore()
  const contractRepair = ensureSampleClientContracts(store)
  if (contractRepair.changed) {
    store = contractRepair.store
    writeStore(store)
  }
  // Restore any missing mock tenants (e.g. Lisa) and keep portal logins linked
  const portalRepair = await ensureSamplePortalUsers(store)
  if (portalRepair.changed) {
    store = portalRepair.store
    writeStore(store)
  }
  const householdRepair = ensureSampleHouseholdFields(store)
  if (householdRepair.changed) {
    store = householdRepair.store
    writeStore(store)
  }
  let repairedAny =
    contractRepair.changed || portalRepair.changed || householdRepair.changed
  let clients = store.clients.map((client) => {
    const contract = store.contracts.find((c) => c.clientId === client.id)
    let next = ensureOfficialWhenProjectActive(client)
    const reconciled = reconcileClientContractStatus(next, contract)
    if (reconciled !== client) repairedAny = true
    return reconciled
  })
  const sampleDateRefresh = refreshAllSampleClientDates(clients)
  if (sampleDateRefresh.changed) {
    clients = sampleDateRefresh.clients
    repairedAny = true
  }
  if (repairedAny) {
    store = updateStore((s) => ({ ...s, clients }))
  }
  const fixtures = applyDemoLeaseFixturesToStore(store)
  if (fixtures.changed) {
    store = fixtures.store
    writeStore(store)
  }
  const leaseAmounts = ensureSampleLeaseAmounts(store)
  if (leaseAmounts.changed) {
    store = leaseAmounts.store
    writeStore(store)
  }
  const propertySeed = ensureStoreProperties(store)
  if (propertySeed.changed) {
    store = propertySeed.store
    writeStore(store)
  }
  res.json({
    clients: store.clients,
    contracts: store.contracts,
    settings: store.settings,
    properties: store.properties ?? [],
  })
})

router.put('/clients', (req, res) => {
  const { clients } = req.body
  if (!Array.isArray(clients)) {
    return res.status(400).json({ error: 'clients array required' })
  }
  updateStore((s) => {
    let users = [...s.users]
    let contracts = s.contracts
    let adminNotifications = s.adminNotifications ?? []

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

      const movedToInProgress =
        merged.projectStatus === 'In Progress' && existing.projectStatus !== 'In Progress'
      const needsContract =
        movedToInProgress ||
        (merged.contractStatus !== existing.contractStatus &&
          ['Sent', 'Signed', 'Completed'].includes(merged.contractStatus))

      if (needsContract) {
        const existingContract = contracts.find((c) => c.clientId === client.id)
        const ensured = ensureClientContract(merged, existingContract, s.settings)
        if (ensured.created || ensured.contract !== existingContract) {
          contracts = appendContractToStore({ ...s, contracts }, ensured.contract).contracts
        }
        if (ensured.created || contractNeedsDetail(ensured.contract)) {
          const nextStore = notifyContractNeedsDetail(
            { ...s, contracts, adminNotifications },
            ensured.client,
            ensured.contract
          )
          adminNotifications = nextStore.adminNotifications ?? adminNotifications
        }
        return ensured.client
      }

      return merged
    })

    // Keep portal-linked clients created server-side (e.g. Accept & Draft Lease)
    // when a stale admin PUT arrives without them yet.
    const incomingIds = new Set(linkedClients.map((c) => c.id))
    const preserved = (s.clients ?? []).filter((client) => {
      if (!client?.id || incomingIds.has(client.id)) return false
      if (client.accountUserId) return true
      return users.some((u) => u.role === 'client' && u.clientId === client.id)
    })
    const nextClients = preserved.length > 0 ? [...linkedClients, ...preserved] : linkedClients

    const nextClientIds = new Set(nextClients.map((c) => c.id))
    const contractIds = new Set(contracts.map((c) => c.id))
    const preservedContracts = (s.contracts ?? []).filter(
      (c) =>
        c?.id &&
        !contractIds.has(c.id) &&
        c.clientId &&
        nextClientIds.has(c.clientId)
    )
    if (preservedContracts.length > 0) {
      contracts = [...contracts, ...preservedContracts]
    }

    return { ...s, clients: nextClients, users, contracts, adminNotifications }
  })
  res.json({ ok: true })
})

/** Admin starts the client project — unlocks portal uploads */
router.post('/clients/:clientId/start-project', (req, res) => {
  const { clientId } = req.params
  ensureClientContractRecord(clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)

  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (client.projectStartedAt) {
    return res.status(400).json({ error: 'Project has already been started' })
  }
  if (!canStartProject(client)) {
    return res.status(400).json({
      error:
        'Lease must be signed and the tenant must click the PayPal payment link before starting the project.',
    })
  }

  const contract = store.contracts.find((c) => c.clientId === clientId)
  if (!contract) {
    return res.status(400).json({
      error:
        'No contract exists for this client. A placeholder contract should have been created automatically — refresh and try again, or create one from the contract page.',
    })
  }

  const now = new Date().toISOString()
  updateStore((s) => {
    let next = {
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
    }
    next = notifyClientByClientId(next, clientId, {
      type: 'project_started',
      title: 'Project started',
      message: `Your project "${client.projectName}" is now active. You can upload files and track progress in your portal.`,
      actionUrl: '/portal',
      relatedId: `project-started-${clientId}`,
    })
    const updatedClient = next.clients.find((c) => c.id === clientId)
    if (updatedClient) {
      next = notifyProjectStatusChange(
        next,
        updatedClient,
        `Your project status is now In Progress. File sharing is unlocked on your dashboard.`
      )
    }
    return next
  })

  res.json({ ok: true, projectStartedAt: now })
})

/** Admin permanently deletes / clears a client's contract workflow */
router.post('/clients/:clientId/permanent-delete-contract', (req, res) => {
  const { clientId } = req.params
  const { confirmClientId } = req.body ?? {}

  if (!confirmClientId || confirmClientId.trim() !== clientId) {
    return res.status(400).json({
      error: 'Type the exact client ID to confirm permanent contract deletion.',
    })
  }

  const store = readStore()
  const result = permanentlyDeleteClientContract(store, clientId, req.user)
  if (!result) {
    return res.status(404).json({
      error: 'No contract workflow found for this client.',
    })
  }

  updateStore(() => result.store)

  res.json({
    ok: true,
    message: 'Lease permanently deleted.',
    auditEntry: result.auditEntry,
    clientId: result.clientId,
  })
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

  if (stepsRequireProjectContract(targetStepId)) {
    const ensured = ensureClientContract(client, contract, store.settings)
    if (!ensured.contract) {
      return res.status(400).json({
        error:
          'Cannot advance to In Progress without a contract. Add client project details first, then try again.',
      })
    }
  }

  let workingClient = client
  let workingContract = contract
  let contractCreated = false

  if (stepsRequireContract(targetStepId)) {
    const ensured = ensureClientContract(workingClient, workingContract, store.settings)
    workingClient = ensured.client
    workingContract = ensured.contract
    contractCreated = ensured.created
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
    workingClient,
    workingContract,
    skippedStepIds,
    targetStepId,
    now
  )

  updateStore((s) => {
    let next = {
      ...s,
      contracts: contractCreated
        ? appendContractToStore(s, effectContract).contracts
        : effectContract
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
    }

    if (contractCreated || (effectContract && contractNeedsDetail(effectContract))) {
      next = notifyContractNeedsDetail(next, effectClient, effectContract)
    }

    return next
  })

  res.json({
    ok: true,
    skippedStepIds,
    targetStepId,
    targetLabel: getTimelineStepLabel(targetStepId),
    noteId: noteEntry?.id,
    contractCreated,
    contractId: effectContract?.id,
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
  if (!client.isOfficialClient) {
    return res.status(400).json({
      error: 'Tenant must sign the lease before you can confirm the deposit.',
    })
  }

  const now = new Date().toISOString()
  const projectLabel = client.projectName || 'your lease'
  updateStore((s) => {
    let next = {
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
                  text: `Deposit payment confirmed on ${new Date(now).toLocaleDateString()}. Tenant status moved to Upcoming.`,
                  category: 'Payment',
                  createdAt: now,
                },
              ],
            }
          : c
      ),
    }
    next = notifyClientByClientId(next, clientId, {
      type: 'status_update',
      title: 'Deposit payment confirmed',
      message: `Your landlord confirmed your deposit for ${projectLabel}. Your lease status is now Upcoming.`,
      actionUrl: '/portal',
      relatedId: `deposit-confirmed-${clientId}-${now.slice(0, 10)}`,
    })
    return next
  })

  res.json({ ok: true, depositPaymentConfirmedAt: now })
})

/** Text the tenant an automated overdue-rent SMS reminder */
router.post('/clients/:clientId/ping-overdue', async (req, res) => {
  const { clientId } = req.params
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const contract = store.contracts.find((c) => c.clientId === clientId)
  const incompletePayments = (client.deadlines ?? []).filter(
    (d) => d.type === 'payment' && !d.completed
  )
  const today = new Date()
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const overdueCount = Math.max(
    1,
    incompletePayments.filter((d) => d.date.slice(0, 10) < todayYmd).length
  )

  const remainingRaw = contract?.remainingBalance || ''
  const amountMatch = String(remainingRaw).replace(/[^0-9.]/g, '')
  const amountNum = amountMatch ? Number.parseFloat(amountMatch) : null
  const amountLabel =
    Number.isFinite(amountNum) && amountNum > 0
      ? `$${amountNum.toLocaleString('en-US')}`
      : null

  if (!client.phone?.trim()) {
    return res.status(400).json({ error: 'This tenant has no phone number on file.' })
  }

  const smsResult = await sendOverdueRentSms({
    phone: client.phone,
    name: client.name,
    amountLabel,
    overdueCount,
    businessName: store.settings?.businessName,
  })

  if (!smsResult.sent) {
    return res.status(502).json({
      error: smsResult.error || 'Failed to send text message.',
    })
  }

  const now = new Date().toISOString()
  const noteText = smsResult.devMode
    ? `Overdue rent ping queued (dev mode — SMS logged to server). ${overdueCount} payment${overdueCount === 1 ? '' : 's'} overdue${amountLabel ? ` · ${amountLabel}` : ''}.`
    : `Overdue rent text sent to ${smsResult.to}. ${overdueCount} payment${overdueCount === 1 ? '' : 's'} overdue${amountLabel ? ` · ${amountLabel}` : ''}.`

  updateStore((s) => {
    let next = {
      ...s,
      clients: s.clients.map((c) =>
        c.id === clientId
          ? {
              ...c,
              notes: [
                ...(c.notes ?? []),
                {
                  id: generateId(),
                  text: noteText,
                  category: 'Payment',
                  createdAt: now,
                },
              ],
            }
          : c
      ),
    }
    next = notifyClientByClientId(next, clientId, {
      type: 'deadline_reminder',
      title: 'Rent payment overdue',
      message:
        overdueCount > 1
          ? `Reminder: ${overdueCount} rent payments are overdue${amountLabel ? ` (${amountLabel})` : ''}. Please pay as soon as possible.`
          : `Reminder: your rent payment is overdue${amountLabel ? ` (${amountLabel})` : ''}. Please pay as soon as possible.`,
      actionUrl: '/portal',
      relatedId: `overdue-ping-${clientId}-${now.slice(0, 10)}`,
    })
    return next
  })

  res.json({
    ok: true,
    sent: true,
    devMode: Boolean(smsResult.devMode),
    to: smsResult.to,
    overdueCount,
    amountLabel,
  })
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
    if (process.env.E2E_TEST === '1') {
      finalInvoice = {
        ...finalInvoice,
        paymentProvider: 'paypal',
        paymentLink: 'https://sandbox.paypal.com/e2e-test-final',
      }
    } else {
      console.error('final invoice payment link', err)
      return res.status(500).json({ error: err.message })
    }
  }

  updateStore((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            projectStatus: 'Completed',
            projectCompletedAt: now,
            contractStatus:
              c.contractStatus === 'Signed' || c.contractStatus === 'Completed'
                ? 'Completed'
                : c.contractStatus,
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
  const { clients, contracts, settings, properties } = req.body
  const store = readStore()
  if (store.clients.length > 0 || store.contracts.length > 0) {
    return res.status(409).json({ error: 'Server already has data' })
  }
  updateStore((s) => ({
    ...s,
    clients: Array.isArray(clients) ? clients : [],
    contracts: Array.isArray(contracts) ? contracts : [],
    properties: Array.isArray(properties) ? properties : s.properties ?? [],
    settings: settings ? { ...s.settings, ...settings } : s.settings,
  }))
  res.json({ ok: true, migrated: true })
})

/** Admin audit trail (contract deletions, etc.) */
router.get('/audit-log', (req, res) => {
  const store = readStore()
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
  const type = typeof req.query.type === 'string' ? req.query.type : undefined

  let entries = [...(store.adminAuditLog ?? [])].sort(
    (a, b) =>
      new Date(b.deletedAt || b.createdAt || 0).getTime() -
      new Date(a.deletedAt || a.createdAt || 0).getTime()
  )

  if (type) {
    entries = entries.filter((entry) => entry.type === type)
  }

  res.json({ entries: entries.slice(0, limit), count: entries.length })
})

/** Admin notifications (registrations, signed contracts, problem reports, etc.) */
router.get('/notifications', (req, res) => {
  const store = readStore()
  const type =
    typeof req.query?.type === 'string' && req.query.type.trim()
      ? req.query.type.trim()
      : null
  const includeRead =
    req.query?.includeRead === '1' ||
    req.query?.includeRead === 'true' ||
    req.query?.includeRead === 'yes'

  let notifications = [...(store.adminNotifications ?? [])]
  if (!includeRead) {
    notifications = notifications.filter((n) => !n.read)
  }
  if (type) {
    notifications = notifications.filter((n) => n.type === type)
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

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

/** Admin onboarding tour progress */
router.get('/onboarding', (req, res) => {
  const store = readStore()
  const user = store.users.find((u) => u.id === req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ progress: user.onboardingProgress ?? { completedSteps: [] } })
})

router.patch('/onboarding', (req, res) => {
  const { stepId, complete, dismiss, reset } = req.body ?? {}
  let updatedUser = null

  updateStore((s) => {
    const users = s.users.map((u) => {
      if (u.id !== req.user.id) return u
      const current = u.onboardingProgress ?? { completedSteps: [] }
      let next = { ...current }

      if (reset) {
        next = { completedSteps: [] }
      } else if (dismiss) {
        next = {
          ...current,
          dismissedAt: new Date().toISOString(),
          completedAt: current.completedAt ?? new Date().toISOString(),
        }
      } else if (complete && stepId) {
        const steps = new Set(current.completedSteps ?? [])
        steps.add(stepId)
        next = { ...current, completedSteps: [...steps] }
      }

      updatedUser = { ...u, onboardingProgress: next }
      return updatedUser
    })
    return { ...s, users }
  })

  res.json({ progress: updatedUser?.onboardingProgress ?? { completedSteps: [] } })
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
    updateStore((s) => {
      let next = {
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
      }
      next = notifyClientByClientId(next, existingClient.id, {
        type: 'registration_accepted',
        title: 'Welcome to your portal',
        message: `Your account is now linked. Check your dashboard for lease agreements and updates.`,
        actionUrl: '/portal',
        relatedId: `registration-accepted-${userId}`,
      })
      return next
    })
    const linkedClient = { ...existingClient, accountUserId: user.id }
    return res.json({
      client: linkedClient,
      contract: contract ?? null,
      linked: true,
      reusedLease: false,
      leaseAction: resolveLeaseAgreementAction(linkedClient, contract),
    })
  }

  if (user.clientId) {
    const client = store.clients.find((c) => c.id === user.clientId)
    const contract = store.contracts.find((c) => c.clientId === user.clientId)
    return res.json({
      client,
      contract: contract ?? null,
      linked: true,
      reusedLease: false,
      leaseAction: resolveLeaseAgreementAction(client, contract),
    })
  }

  const now = new Date().toISOString()
  const asOf = resolveServerScheduleAsOf()
  const draftLease = req.body?.draftLease !== false && req.body?.draftLater !== true
  const preferredLeaseMonths = parseLeaseLengthMonths(
    user.preferredLeaseMonths,
    DEFAULT_LEASE_LENGTH_MONTHS
  )
  const preferredStart = String(user.preferredLeaseStartDate ?? '')
    .trim()
    .slice(0, 10)
  let leaseStartDate
  let leaseEndDate
  let leaseLengthMonths
  if (isPlainYmd(preferredStart) && isFutureLeaseStartDate(preferredStart, asOf)) {
    leaseLengthMonths = preferredLeaseMonths
    leaseStartDate = preferredStart
    leaseEndDate = computeLeaseEndDate(leaseStartDate, leaseLengthMonths)
  } else {
    ;({
      leaseStartDate,
      leaseEndDate,
      leaseLengthMonths,
    } = resolveDefaultLeaseDates(store.settings, preferredLeaseMonths, asOf))
  }
  const rentDueDates = listMonthlyRentDueDates(leaseStartDate, leaseEndDate)
  const rentDeadlines = buildMonthlyRentDeadlines(rentDueDates, generateId)
  const propertyAddress = String(user.preferredPropertyAddress ?? '').trim()
  const landlordCompany = String(user.preferredLandlordCompany ?? '').trim()
  const property = findPropertyForLease(store, propertyAddress)
  const reusableLease = findReusableLeaseAtAddress(store, propertyAddress)
  const reusedLease = Boolean(reusableLease)
  const preferredPaymentMethod = ['paypal', 'stripe', 'square'].includes(
    user.preferredPaymentMethod
  )
    ? user.preferredPaymentMethod
    : null
  const registrationDetails = [
    landlordCompany ? `Landlord company: ${landlordCompany}` : null,
    propertyAddress ? `Property: ${propertyAddress}` : null,
    property?.propertyType ? `Rental type: ${property.propertyType}` : null,
    `Preferred lease: ${formatLeaseLengthLabel(leaseLengthMonths)}`,
    `Lease ${leaseStartDate} → ${leaseEndDate}`,
    preferredPaymentMethod ? `Preferred payment: ${preferredPaymentMethod}` : null,
    'Monthly rent due on the 1st.',
    reusedLease
      ? 'Existing lease agreement found for this address — generating a copy for this tenant.'
      : draftLease
        ? 'Generating residential lease agreement from applicant and rental details.'
        : 'Accepted without drafting a lease yet — draft when ready from Pending Tenants.',
  ]
    .filter(Boolean)
    .join('. ')

  const occupancyMode = String(user.preferredOccupancyMode ?? '').trim().toLowerCase()
  const occupancyArrangement =
    occupancyMode === 'entire_home' || occupancyMode === 'full_rent'
      ? 'entire_home'
      : occupancyMode === 'private_room'
        ? 'room_rental'
        : occupancyMode === 'shared_room' ||
            occupancyMode === 'open_to_roommates' ||
            occupancyMode === 'roommates'
          ? 'shared_home'
          : undefined

  const client = {
    id: generateId(),
    name: user.name,
    businessName: user.name,
    email: user.email,
    phone: String(user.phone ?? '').trim(),
    projectType: property?.propertyType || 'Apartment',
    projectName: propertyAddress || `${user.name} Lease`,
    projectDescription: [
      landlordCompany ? `Registering under ${landlordCompany}.` : null,
      `Preferred lease length: ${formatLeaseLengthLabel(leaseLengthMonths)}.`,
      propertyAddress ? `Desired rental: ${propertyAddress}.` : null,
      preferredStart ? `Requested lease start: ${preferredStart}.` : null,
    ]
      .filter(Boolean)
      .join(' '),
    projectStatus: 'Inquiry',
    contractStatus: draftLease ? 'Draft in Progress' : 'Not Started',
    paymentStatus: 'Unpaid',
    isOfficialClient: false,
    serviceTier: DEFAULT_SERVICE_TIER,
    leaseLengthMonths,
    accountUserId: user.id,
    ...(occupancyMode
      ? {
          preferredOccupancyMode:
            occupancyMode === 'full_rent'
              ? 'entire_home'
              : occupancyMode === 'roommates'
                ? 'open_to_roommates'
                : occupancyMode,
        }
      : {}),
    ...(occupancyArrangement ? { occupancyArrangement } : {}),
    ...(occupancyArrangement !== 'entire_home' && user.preferredBedroomId
      ? { bedroomId: user.preferredBedroomId }
      : {}),
    ...(occupancyArrangement !== 'entire_home' && user.preferredBedId
      ? { bedId: user.preferredBedId }
      : {}),
    ...(occupancyArrangement === 'entire_home'
      ? { unitOrRoomLabel: 'Entire unit' }
      : {}),
    notes: [
      {
        id: generateId(),
        text: `Accepted from portal registration on ${new Date(now).toLocaleDateString()}. ${registrationDetails}`,
        category: 'General',
        createdAt: now,
      },
    ],
    deadlines: draftLease ? rentDeadlines : [],
    createdAt: now,
  }

  const leaseOptions = {
    startDate: leaseStartDate,
    completionDate: leaseEndDate,
    clientAddress: propertyAddress,
    paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
    leaseLengthMonths,
    property,
    // Draft is reviewable immediately in Pending Tenants (Lease Drafted + Review & Send).
    readyImmediately: true,
    ...(preferredPaymentMethod ? { paymentProvider: preferredPaymentMethod } : {}),
  }
  const contract = draftLease
    ? reusedLease
      ? cloneLeaseForClient(reusableLease, client, leaseOptions)
      : createDraftContract(client, store.settings, leaseOptions)
    : null

  updateStore((s) => {
    let next = {
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, clientId: client.id } : u)),
      clients: [...s.clients, client],
      contracts: contract ? [...s.contracts, contract] : s.contracts,
      adminNotifications: (s.adminNotifications ?? []).map((n) =>
        n.type === 'registration' && n.userId === userId ? { ...n, read: true } : n
      ),
    }
    next = notifyClientByClientId(next, client.id, {
      type: 'registration_accepted',
      title: 'Welcome to your portal',
      message: !draftLease
        ? `Your registration has been accepted. Your landlord will prepare your lease agreement soon.`
        : reusedLease
          ? `Your registration has been accepted. Your landlord has a lease agreement for this property and will send it to you shortly.`
          : `Your registration has been accepted. Your landlord is preparing your lease agreement — it will appear here when ready.`,
      actionUrl: '/portal',
      relatedId: `registration-accepted-${userId}`,
    })
    return next
  })

  res.status(201).json({
    client,
    contract,
    linked: true,
    reusedLease: draftLease ? reusedLease : false,
    draftLease,
    leaseAction: resolveLeaseAgreementAction(client, contract),
  })
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
      preferredLeaseMonths: u.preferredLeaseMonths,
      preferredLandlordCompany: u.preferredLandlordCompany,
      preferredPropertyAddress: u.preferredPropertyAddress,
      preferredLeaseStartDate: u.preferredLeaseStartDate,
      preferredPaymentMethod: u.preferredPaymentMethod,
      phone: u.phone,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ registrations, count: registrations.length })
})

/** Create a tenant invite link (property, lease term, custom code) and optionally text it. */
router.post('/tenant-invites', async (req, res) => {
  try {
    const store = readStore()
    const propertyAddress =
      typeof req.body?.propertyAddress === 'string' ? req.body.propertyAddress.trim() : ''
    const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : ''
    const source = req.body?.source === 'lease-import' ? 'lease-import' : 'manual'
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : ''
    const connectionCode =
      typeof req.body?.connectionCode === 'string' ? req.body.connectionCode.trim() : ''
    const leaseStartDate =
      typeof req.body?.leaseStartDate === 'string' ? req.body.leaseStartDate.trim() : ''
    const leaseLengthMonths = req.body?.leaseLengthMonths
    const sendText = req.body?.sendSms === true || req.body?.sendText === true

    if (sendText && !phone) {
      return res.status(400).json({ error: 'Phone number is required to text the invite link.' })
    }
    if (sendText && !propertyAddress) {
      return res.status(400).json({ error: 'Choose a property before sending the invite.' })
    }
    if (sendText && !leaseStartDate) {
      return res.status(400).json({ error: 'Choose a future lease start date before sending.' })
    }
    if (sendText && (leaseLengthMonths == null || leaseLengthMonths === '')) {
      return res.status(400).json({ error: 'Choose a lease duration before sending.' })
    }

    const created = createTenantInvite(store, {
      ...(propertyAddress ? { propertyAddress } : {}),
      ...(clientId ? { clientId } : {}),
      ...(phone ? { phone } : {}),
      ...(connectionCode ? { connectionCode } : {}),
      ...(leaseStartDate ? { leaseStartDate } : {}),
      ...(leaseLengthMonths != null && leaseLengthMonths !== ''
        ? { leaseLengthMonths }
        : {}),
      source,
    })
    if (created.error || !created.invite) {
      return res.status(400).json({ error: created.error || 'Could not create invite link' })
    }
    const invite = created.invite
    const inviteUrl = buildTenantInviteUrl(invite.token)

    let smsResult = null
    if (sendText) {
      const body = buildInviteSmsBody({
        landlordCompany: invite.landlordCompany,
        inviteUrl,
        connectionCode: invite.connectionCode,
      })
      smsResult = await sendSms({ to: phone, body })
      if (!smsResult.sent) {
        return res.status(400).json({
          error: smsResult.error || 'Could not text the invite link.',
        })
      }
    }

    updateStore((s) => {
      let next = {
        ...s,
        tenantInvites: [...(s.tenantInvites ?? []), invite],
      }
      if (sendText) {
        next = markTenantInviteDelivered(next, invite.id, {
          method: 'sms',
          destination: phone,
        })
      }
      return next
    })

    const deliveredInvite = sendText
      ? {
          ...invite,
          deliveryMethod: 'sms',
          deliveryDestination: phone,
          deliveredAt: new Date().toISOString(),
        }
      : invite

    res.status(201).json({
      invite: {
        id: deliveredInvite.id,
        landlordCompany: deliveredInvite.landlordCompany,
        propertyAddress: deliveredInvite.propertyAddress ?? null,
        leaseStartDate: deliveredInvite.leaseStartDate ?? null,
        leaseLengthMonths: deliveredInvite.leaseLengthMonths ?? null,
        connectionCode: deliveredInvite.connectionCode ?? null,
        expiresAt: deliveredInvite.expiresAt,
        source: deliveredInvite.source,
        status: deliveredInvite.status ?? 'pending',
        deliveryMethod: deliveredInvite.deliveryMethod ?? null,
        deliveryDestination: deliveredInvite.deliveryDestination ?? null,
      },
      inviteUrl,
      connectionCode: deliveredInvite.connectionCode ?? null,
      sms: smsResult
        ? {
            sent: smsResult.sent,
            devMode: Boolean(smsResult.devMode),
            to: smsResult.to ?? null,
          }
        : null,
    })
  } catch (err) {
    console.error('tenant-invites', err)
    res.status(500).json({ error: 'Could not create invite link' })
  }
})

/** Record that an invite link was delivered by email or SMS */
router.post('/tenant-invites/:id/delivered', (req, res) => {
  try {
    const inviteId = req.params.id
    const method = req.body?.method === 'sms' ? 'sms' : 'email'
    const destination =
      typeof req.body?.destination === 'string' ? req.body.destination.trim() : ''
    const store = readStore()
    const existing = (store.tenantInvites ?? []).find((entry) => entry.id === inviteId)
    if (!existing) {
      return res.status(404).json({ error: 'Invite not found' })
    }
    const next = updateStore((s) =>
      markTenantInviteDelivered(s, inviteId, { method, destination })
    )
    const invite = (next.tenantInvites ?? []).find((entry) => entry.id === inviteId)
    res.json({
      ok: true,
      invite: {
        id: invite.id,
        deliveryMethod: invite.deliveryMethod,
        deliveryDestination: invite.deliveryDestination,
        deliveredAt: invite.deliveredAt,
        status: invite.status ?? 'pending',
        expiresAt: invite.expiresAt,
      },
    })
  } catch (err) {
    console.error('tenant-invites delivered', err)
    res.status(500).json({ error: 'Could not record invite delivery' })
  }
})

/** Add a property to the landlord portfolio */
router.post('/properties', (req, res) => {
  try {
    const validated = validatePropertyInput(req.body)
    if (validated.error) {
      return res.status(400).json({ error: validated.error })
    }
    const property = createPropertyRecord(validated)
    const next = updateStore((s) => ({
      ...s,
      properties: [...(s.properties ?? []), property],
    }))
    res.status(201).json({ property, properties: next.properties })
  } catch (err) {
    console.error('properties create', err)
    res.status(500).json({ error: 'Could not add property' })
  }
})

/** Update a single portfolio rental */
router.patch('/properties/:propertyId', (req, res) => {
  try {
    const { propertyId } = req.params
    const validated = validatePropertyInput({
      ...req.body,
      addressConfirmed: true,
    })
    if (validated.error) {
      return res.status(400).json({ error: validated.error })
    }
    let updated = null
    const next = updateStore((s) => {
      const list = [...(s.properties ?? [])]
      const index = list.findIndex((p) => p.id === propertyId)
      if (index < 0) return s
      updated = updatePropertyRecord(list[index], validated)
      list[index] = updated
      return { ...s, properties: list }
    })
    if (!updated) {
      return res.status(404).json({ error: 'Rental not found' })
    }
    res.json({ property: updated, properties: next.properties })
  } catch (err) {
    console.error('properties update', err)
    res.status(500).json({ error: 'Could not update rental' })
  }
})

/** Replace the full properties list (admin sync) */
router.put('/properties', (req, res) => {
  const { properties } = req.body
  if (!Array.isArray(properties)) {
    return res.status(400).json({ error: 'properties array required' })
  }
  const next = updateStore((s) => ({ ...s, properties }))
  res.json({ ok: true, properties: next.properties })
})

/** Notify tenants about lease re-sign / renewal */
router.post('/clients/:clientId/resign-message', (req, res) => {
  try {
    const { clientId } = req.params
    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    const store = readStore()
    const client = store.clients.find((c) => c.id === clientId)
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const now = new Date().toISOString()
    const noteText = message
      ? `Re-sign message drafted: ${message}`
      : 'Re-sign / renewal outreach logged from Upcoming Openings.'

    let next = updateStore((s) => {
      let updated = {
        ...s,
        clients: s.clients.map((c) =>
          c.id === clientId
            ? {
                ...c,
                notes: [
                  ...(c.notes ?? []),
                  {
                    id: generateId(),
                    text: noteText,
                    category: 'Contract',
                    createdAt: now,
                  },
                ],
              }
            : c
        ),
      }
      updated = notifyClientByClientId(updated, clientId, {
        type: 'follow_up',
        title: 'Lease renewal',
        message:
          message ||
          `${store.settings?.businessName || 'Your landlord'} wants to discuss renewing your lease.`,
        relatedId: `resign-${clientId}`,
        actionUrl: '/portal/contracts',
      })
      return updated
    })

    res.json({
      ok: true,
      client: next.clients.find((c) => c.id === clientId),
    })
  } catch (err) {
    console.error('resign-message', err)
    res.status(500).json({ error: 'Could not log re-sign message' })
  }
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
  let freshStore = readStore()
  const advanced = advanceLeaseGenerations(freshStore)
  if (advanced.changed) {
    updateStore(() => advanced.store)
    freshStore = advanced.store
  }
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

/** In-app bug reports for Aspen Creative Solutions */
router.post('/bug-reports', async (req, res) => {
  const description = String(req.body?.description ?? '').trim()
  const stepsToReproduce = String(req.body?.stepsToReproduce ?? '').trim()

  if (!description) {
    return res.status(400).json({ error: 'Please describe the bug or unexpected behavior.' })
  }
  if (description.length > 8000) {
    return res.status(400).json({ error: 'Description is too long.' })
  }
  if (stepsToReproduce.length > 8000) {
    return res.status(400).json({ error: 'Steps to reproduce is too long.' })
  }

  const store = readStore()
  const user = store.users.find((u) => u.id === req.user.id)
  const reportId = generateId()
  const report = {
    id: reportId,
    description,
    stepsToReproduce: stepsToReproduce || undefined,
    userId: req.user.id,
    reporterName: user?.name || req.user.name || '',
    reporterEmail: user?.email || req.user.email || '',
    createdAt: new Date().toISOString(),
  }

  updateStore((draft) => {
    const bugReports = Array.isArray(draft.bugReports) ? [...draft.bugReports] : []
    bugReports.push(report)
    return { ...draft, bugReports }
  })

  try {
    await sendBugReportEmail({
      description: report.description,
      stepsToReproduce: report.stepsToReproduce,
      reporterName: report.reporterName,
      reporterEmail: report.reporterEmail,
      reportId: report.id,
    })
  } catch (err) {
    console.error('bug report notify', err)
  }

  res.json({
    ok: true,
    message:
      'Thank you! Your bug report has been submitted. Aspen Creative Solutions will review your report and respond as needed, typically within 1–2 business days.',
  })
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
