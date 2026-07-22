import { Router } from 'express'
import fs from 'fs'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import {
  listClientFiles,
  saveUploadedFile,
  addNoteToFile,
  getFileDownloadPath,
  deleteProjectFile,
  uploadMiddleware,
} from '../lib/fileUpload.js'
import { getPortalClientContractStatus } from '../lib/portalContractStatus.js'
import { repairSentContracts } from '../lib/contractMerge.js'
import { isProjectActive } from '../lib/clientWorkflow.js'
import { buildProjectTimeline } from '../lib/projectTimeline.js'
import {
  clientCanSignContract,
  getPortalContractStatus,
  needsClientResign,
  prepareContractForClientReview,
} from '../lib/contractReview.js'
import { ensureClientFileSharing } from '../lib/ensureFileSharing.js'
import {
  buildPortalDepositInvoice,
  buildPortalFinalInvoice,
  buildPortalRemainingBalance,
  resolvePortalPaymentStatus,
} from '../lib/portalPayments.js'
import { generateId, pushAdminNotification } from '../lib/notifications.js'
import { getClientNotificationsForUser } from '../lib/clientNotifications.js'
import { verifySquareOrderPayment } from '../lib/square.js'
import { applyPaymentToStore } from '../lib/payments.js'
import { DEFAULT_SERVICE_TIER, migrateServiceTier } from '../lib/serviceTier.js'
import {
  formatLeaseLengthLabel,
  getLeaseRentSchedule,
  resolveTenantAddress,
} from '../lib/leaseSchedule.js'
import {
  buildPortalRentPayment,
  buildRentInvoiceDraft,
  listUnpaidRentMonths,
  estimateMonthlyRent,
  isPrepaidRentAllowed,
} from '../lib/rentPayments.js'
import { attachPaymentLink, isPaymentProviderConfigured, paymentProviderLabel, getContractPaymentProvider } from '../lib/paymentLinks.js'

const router = Router()

router.use(authMiddleware, requireRole('client'))

const PROBLEM_TYPES = [
  'Leaking faucet / plumbing',
  'Electrical problems',
  'Heating or cooling issues',
  'Broken appliance',
  'Pest infestation',
  'Water damage / flooding',
  'Locks or security',
  'Structural damage',
  'Other',
]

function getPortalUserContext(store, userId) {
  const user = store.users.find((u) => u.id === userId)
  if (!user) return null
  const client = user.clientId
    ? store.clients.find((c) => c.id === user.clientId)
    : null
  return { user, client, settings: store.settings }
}

function buildPortalProfilePayload({ user, client, settings, store }) {
  const sentContracts = client
    ? store.contracts.filter((c) => c.clientId === client.id && c.sentAt)
    : []

  const projects = sentContracts.map((contract) => ({
    contractId: contract.id,
    projectTitle: contract.projectTitle,
    serviceTier: migrateServiceTier(contract.serviceTier || client?.serviceTier),
    developerName: settings.ownerName || 'Your designer',
    businessName: settings.businessName || 'Your studio',
    sentAt: contract.sentAt,
    signedAt: contract.signedAt,
  }))

  return {
    email: user.email,
    name: user.name,
    phone: client?.phone?.trim() || user.phone?.trim() || '',
    linked: Boolean(client),
    projects,
  }
}

/** Client profile — account details and project roster */
router.get('/profile', (req, res) => {
  const store = readStore()
  const ctx = getPortalUserContext(store, req.user.id)
  if (!ctx) return res.status(404).json({ error: 'User not found' })
  res.json(buildPortalProfilePayload({ ...ctx, store }))
})

router.patch('/profile', (req, res) => {
  try {
    const { name, phone } = req.body ?? {}
    const store = readStore()
    const ctx = getPortalUserContext(store, req.user.id)
    if (!ctx) return res.status(404).json({ error: 'User not found' })

    const trimmedName =
      typeof name === 'string' && name.trim() ? name.trim() : undefined
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : undefined

    if (name !== undefined && !trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }

    let nextUser = ctx.user
    let nextClient = ctx.client

    updateStore((s) => {
      const users = s.users.map((u) => {
        if (u.id !== ctx.user.id) return u
        nextUser = {
          ...u,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(trimmedPhone !== undefined ? { phone: trimmedPhone } : {}),
        }
        return nextUser
      })

      const clients = s.clients.map((c) => {
        if (!ctx.client || c.id !== ctx.client.id) return c
        nextClient = {
          ...c,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(trimmedPhone !== undefined ? { phone: trimmedPhone } : {}),
        }
        return nextClient
      })

      return { ...s, users, clients }
    })

    res.json(
      buildPortalProfilePayload({
        user: nextUser,
        client: nextClient,
        settings: store.settings,
        store: readStore(),
      })
    )
  } catch (err) {
    console.error('portal profile update', err)
    res.status(500).json({ error: 'Could not update profile' })
  }
})

/** Tenant reports a maintenance / property issue — notifies the landlord with attachment */
router.post('/problems', (req, res, next) => {
  const clientId = req.user.clientId
  if (!clientId) {
    return res.status(403).json({ error: 'Your account is not linked to a lease yet.' })
  }
  req.portalClientId = clientId
  // Accept either "file" (preferred) or legacy "image" field name
  uploadMiddleware.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' })
    }
    const files = Array.isArray(req.files) ? req.files : []
    req.file =
      files.find((f) => f.fieldname === 'file') ||
      files.find((f) => f.fieldname === 'image') ||
      files[0]
    next()
  })
}, (req, res) => {
  try {
    const clientId = req.user.clientId
    const problemType =
      typeof req.body?.problemType === 'string' ? req.body.problemType.trim() : ''
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''

    if (!PROBLEM_TYPES.includes(problemType)) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'Select a valid problem type.' })
    }
    if (!note) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'Please add a short note describing the issue.' })
    }
    if (!req.file) {
      return res.status(400).json({
        error: 'Upload a photo or document so your landlord can assess the issue.',
      })
    }

    const store = readStore()
    const client = store.clients.find((c) => c.id === clientId)
    if (!client) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Tenant profile not found' })
    }

    const fileEntry = saveUploadedFile({
      client,
      file: req.file,
      uploadedBy: 'client',
      uploadedByName: req.user.name,
      initialNote: `Issue report (${problemType}): ${note}`,
    })

    const leaseLabel = client.leaseLengthMonths
      ? formatLeaseLengthLabel(client.leaseLengthMonths)
      : 'lease'
    const address = resolveTenantAddress(
      client,
      store.contracts.find((c) => c.clientId === client.id)
    )

    const resolvedAddress = address || client.projectName || 'their unit'

    updateStore((s) => {
      let next = pushAdminNotification(s, {
        type: 'problem_report',
        title: `Issue reported: ${problemType}`,
        message: `${client.name} at ${resolvedAddress} (${leaseLabel}): ${note}`,
        clientId: client.id,
        userId: req.user.id,
        fileId: fileEntry.id,
        fileName: fileEntry.originalName,
        problemType,
        note,
        tenantName: client.name,
        address: resolvedAddress,
      })

      next = {
        ...next,
        clients: next.clients.map((c) => {
          if (c.id !== client.id) return c
          return {
            ...c,
            notes: [
              ...(c.notes ?? []),
              {
                id: generateId(),
                text: `[Issue report — ${problemType}] ${note} (file: ${fileEntry.originalName})`,
                category: 'Follow-Up',
                createdAt: new Date().toISOString(),
              },
            ],
          }
        }),
      }
      return next
    })

    res.status(201).json({
      ok: true,
      message: 'Your landlord has been notified with your attachment.',
      file: fileEntry,
    })
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    console.error('portal problem report', err)
    res.status(500).json({ error: err.message || 'Could not submit problem report' })
  }
})

/** Toggle a project checklist item for the linked client */
router.patch('/checklist', (req, res) => {
  const clientId = req.user.clientId
  if (!clientId) {
    return res.status(403).json({ error: 'Your account is not linked to a project yet.' })
  }

  const { itemId, completed } = req.body ?? {}
  if (typeof itemId !== 'string' || !itemId.trim()) {
    return res.status(400).json({ error: 'itemId is required' })
  }
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' })
  }

  let nextCompleted = []

  updateStore((s) => {
    const client = s.clients.find((c) => c.id === clientId)
    if (!client) return s

    const current = Array.isArray(client.projectChecklistCompleted)
      ? client.projectChecklistCompleted
      : []

    nextCompleted = completed
      ? current.includes(itemId)
        ? current
        : [...current, itemId]
      : current.filter((id) => id !== itemId)

    return {
      ...s,
      clients: s.clients.map((c) =>
        c.id === clientId ? { ...c, projectChecklistCompleted: nextCompleted } : c
      ),
    }
  })

  res.json({ projectChecklistCompleted: nextCompleted })
})

/** Client dashboard — own profile + contracts */
router.get('/dashboard', (req, res) => {
  const clientId = req.user.clientId

  if (!clientId) {
    return res.json({
      linked: false,
      client: null,
      contracts: [],
      isOfficialClient: false,
      message:
        'Your account is waiting to be accepted by your designer. Once accepted, contracts and project files will appear here.',
    })
  }

  ensureClientFileSharing(clientId)

  const freshStore = readStore()
  const repairedStore = repairSentContracts(freshStore, clientId)
  if (repairedStore !== freshStore) {
    updateStore(() => repairedStore)
  }

  const activeStore = repairedStore !== freshStore ? repairedStore : freshStore
  const client = activeStore.clients.find((c) => c.id === clientId)
  const sentContracts = activeStore.contracts.filter(
    (c) => c.clientId === clientId && c.sentAt
  )

  const contractSummaries = sentContracts.map((c) => ({
    id: c.id,
    projectTitle: c.projectTitle,
    totalCost: c.totalCost,
    sentAt: c.sentAt,
    signedAt: c.signedAt,
    viewedAt: c.viewedAt,
    confirmedByClient: c.confirmedByClient ?? false,
    pdfGenerated: c.pdfGenerated ?? false,
    portalStatus: getPortalContractStatus(c),
  }))

  const primaryContract =
    sentContracts[0] ?? activeStore.contracts.find((c) => c.clientId === clientId)

  const serviceTier = migrateServiceTier(
    primaryContract?.serviceTier || client?.serviceTier || DEFAULT_SERVICE_TIER
  )

  const portalInvoice = buildPortalDepositInvoice(client, primaryContract)
  const portalFinalInvoice = buildPortalFinalInvoice(client)
  const remainingBalance = buildPortalRemainingBalance(client, primaryContract)
  const leaseSchedule = client
    ? getLeaseRentSchedule(client, primaryContract)
    : null
  const rentPayment =
    client && primaryContract
      ? buildPortalRentPayment(client, primaryContract)
      : null
  const address = client ? resolveTenantAddress(client, primaryContract) : ''

  res.json({
    linked: true,
    isOfficialClient: Boolean(client?.isOfficialClient),
    client: client
      ? {
          id: client.id,
          name: client.name,
          businessName: client.businessName,
          projectName: client.projectName,
          address,
          projectStatus: client.projectStatus,
          contractStatus: client.contractStatus,
          paymentStatus: resolvePortalPaymentStatus(client),
          portalContractStatus: getPortalClientContractStatus(sentContracts),
          serviceTier,
          leaseLengthMonths:
            client.leaseLengthMonths ?? leaseSchedule?.leaseLengthMonths ?? undefined,
          projectChecklistCompleted: client.projectChecklistCompleted ?? [],
        }
      : null,
    contracts: contractSummaries,
    invoice: portalInvoice,
    finalInvoice: portalFinalInvoice,
    remainingBalance,
    leaseSchedule,
    rentPayment,
    projectStarted: isProjectActive(client ?? {}),
    projectStartedAt: client?.projectStartedAt,
    supportContact: {
      businessName: activeStore.settings.businessName,
      ownerName: activeStore.settings.ownerName,
      email: activeStore.settings.email,
      phone: activeStore.settings.phone,
    },
  })
})

/**
 * Tenant generates a rent invoice for 1+ consecutive unpaid months
 * and receives a hosted checkout link (PayPal / Stripe / Square).
 */
router.post('/rent-invoice', async (req, res) => {
  try {
    const clientId = req.user.clientId
    if (!clientId) {
      return res.status(403).json({ error: 'Your account is not linked to a lease yet.' })
    }

    const store = readStore()
    const client = store.clients.find((c) => c.id === clientId)
    if (!client) return res.status(404).json({ error: 'Tenant profile not found' })

    const contract =
      store.contracts.find((c) => c.clientId === clientId && c.sentAt) ??
      store.contracts.find((c) => c.clientId === clientId)
    if (!contract) {
      return res.status(400).json({ error: 'No lease is available for rent payment yet.' })
    }

    const unpaid = listUnpaidRentMonths(client, contract)
    if (unpaid.length === 0) {
      return res.status(400).json({ error: 'All rent for this lease is already paid.' })
    }

    const monthlyRent = estimateMonthlyRent(client, contract)
    if (!monthlyRent) {
      return res.status(400).json({
        error: 'Monthly rent amount is not set on your lease yet. Contact your landlord.',
      })
    }

    const allowPrepaid = isPrepaidRentAllowed(contract)
    let monthCount = Math.max(1, Math.floor(Number(req.body?.monthCount) || 1))
    if (!allowPrepaid) monthCount = 1
    monthCount = Math.min(monthCount, unpaid.length)

    const provider = getContractPaymentProvider(contract)
    if (!isPaymentProviderConfigured(provider)) {
      return res.status(400).json({
        error: `${paymentProviderLabel(provider)} is not configured. Ask your landlord to set up checkout.`,
      })
    }

    const draft = buildRentInvoiceDraft({
      client,
      contract,
      monthCount,
      unpaidMonths: unpaid,
      monthlyRent,
    })
    const now = new Date().toISOString()
    let invoice = {
      ...draft,
      createdAt: now,
      sentToPortalAt: now,
    }
    invoice = await attachPaymentLink(invoice, {
      contract,
      clientId,
      invoiceType: 'rent',
      returnPath: '/portal/payment/success',
      cancelPath: '/portal?payment=cancelled',
    })

    if (!invoice.paymentLink) {
      return res.status(400).json({
        error: `Could not create a ${paymentProviderLabel(provider)} checkout link. Try again later.`,
      })
    }

    updateStore((s) => ({
      ...s,
      clients: s.clients.map((c) =>
        c.id === clientId
          ? {
              ...c,
              rentInvoice: invoice,
              notes: [
                ...(c.notes ?? []),
                {
                  id: generateId(),
                  text: `Tenant opened rent checkout for ${monthCount} month${monthCount === 1 ? '' : 's'} ($${invoice.amount.toFixed(2)}) on ${new Date(now).toLocaleDateString()}.`,
                  category: 'Payment',
                  createdAt: now,
                },
              ],
            }
          : c
      ),
    }))

    res.json({
      invoice: {
        amount: invoice.amount,
        currency: invoice.currency,
        description: invoice.description,
        paymentProvider: invoice.paymentProvider,
        paymentLink: invoice.paymentLink,
        sentToPortalAt: invoice.sentToPortalAt,
        invoiceType: 'rent',
        monthCount: invoice.monthCount,
        dueDates: invoice.dueDates,
      },
    })
  } catch (err) {
    console.error('portal rent-invoice', err)
    res.status(500).json({ error: err.message || 'Could not create rent invoice' })
  }
})

/** Client-facing project timeline — mirrors admin view */
router.get('/timeline', (req, res) => {
  if (req.user.clientId) {
    ensureClientFileSharing(req.user.clientId)
  }
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)

  if (!client) {
    return res.json({ linked: false, steps: [], message: 'Your profile is not linked yet.' })
  }

  const contract = store.contracts.find((c) => c.clientId === client.id)
  res.json({
    linked: true,
    projectName: client.projectName,
    steps: buildProjectTimeline(client, contract, { audience: 'portal' }),
  })
})

/** Track when client opens the PayPal payment link */
router.post('/invoice/click', (req, res) => {
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)

  if (!client) return res.status(404).json({ error: 'Client profile not found' })
  if (!client.invoice?.sentToPortalAt) {
    return res.status(400).json({ error: 'No invoice has been sent to your portal yet' })
  }
  if (client.invoice.paidAt) {
    return res.json({ ok: true, alreadyPaid: true })
  }

  const now = new Date().toISOString()
  const alreadyClicked = client.paymentStatus === 'Pay Link Clicked' || client.invoice.paymentLinkClickedAt

  if (!alreadyClicked) {
    updateStore((s) => {
      let next = {
        ...s,
        clients: s.clients.map((c) =>
          c.id === client.id
            ? {
                ...c,
                paymentStatus: 'Pay Link Clicked',
                invoice: {
                  ...c.invoice,
                  paymentLinkClickedAt: now,
                },
                notes: [
                  ...(c.notes ?? []),
                  {
                    id: generateId(),
                    text: `Client opened PayPal payment link on ${new Date(now).toLocaleDateString()}.`,
                    category: 'Payment',
                    createdAt: now,
                  },
                ],
              }
            : c
        ),
      }
      next = pushAdminNotification(next, {
        type: 'payment_link_clicked',
        clientId: client.id,
        title: 'Payment link clicked',
        message: `${client.name} (${client.projectName}) — check PayPal for status.`,
      })
      return next
    })
  }

  res.json({ ok: true, paymentStatus: 'Pay Link Clicked' })
})

/** Full contract detail for client review */
router.get('/contracts/:contractId', (req, res) => {
  let store = readStore()
  let contract = store.contracts.find((c) => c.id === req.params.contractId)

  if (!contract) {
    return res.status(404).json({ error: 'Lease not found' })
  }

  if (contract.clientId !== req.user.clientId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!contract.sentAt) {
    return res.status(403).json({ error: 'This contract is not available yet' })
  }

  const client = store.clients.find((c) => c.id === contract.clientId)
  if (needsClientResign(contract, client)) {
    const now = new Date().toISOString()
    updateStore((s) => ({
      ...s,
      contracts: s.contracts.map((c) =>
        c.id === contract.id ? prepareContractForClientReview(c, now) : c
      ),
      clients: s.clients.map((c) =>
        c.id === contract.clientId
          ? {
              ...c,
              contractStatus: 'Sent',
              projectStatus: c.projectStartedAt ? c.projectStatus : 'Contract Sent',
              isOfficialClient: c.depositPaymentConfirmedAt || c.invoice?.paidAt ? c.isOfficialClient : false,
              officialClientSince:
                c.depositPaymentConfirmedAt || c.invoice?.paidAt
                  ? c.officialClientSince
                  : undefined,
              invoice:
                c.depositPaymentConfirmedAt || c.invoice?.paidAt ? c.invoice : undefined,
            }
          : c
      ),
    }))
    store = readStore()
    contract = store.contracts.find((c) => c.id === req.params.contractId)
  }

  res.json({
    contract,
    portalStatus: getPortalContractStatus(contract),
    canSign: clientCanSignContract(contract),
    settings: {
      businessName: store.settings.businessName,
      ownerName: store.settings.ownerName,
    },
  })
})

/** Client confirms they have read the current version of the contract */
router.post('/contracts/:contractId/review', (req, res) => {
  const store = readStore()
  const contract = store.contracts.find((c) => c.id === req.params.contractId)

  if (!contract) {
    return res.status(404).json({ error: 'Lease not found' })
  }

  if (contract.clientId !== req.user.clientId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!contract.sentAt) {
    return res.status(403).json({ error: 'This contract is not available yet' })
  }

  if (contract.confirmedByClient && !needsClientResign(contract, store.clients.find((c) => c.id === contract.clientId))) {
    return res.status(400).json({ error: 'Lease is already signed' })
  }

  const now = new Date().toISOString()
  updateStore((s) => ({
    ...s,
    contracts: s.contracts.map((c) =>
      c.id === contract.id ? { ...c, viewedAt: now } : c
    ),
  }))

  const updated = { ...contract, viewedAt: now }
  res.json({
    ok: true,
    portalStatus: getPortalContractStatus(updated),
    canSign: clientCanSignContract(updated),
  })
})

/** Project files — active projects only */
router.get('/files', (req, res) => {
  ensureClientFileSharing(req.user.clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)
  if (!client) return res.status(404).json({ error: 'Client profile not found' })
  if (!isProjectActive(client)) {
    return res.status(403).json({
      error: 'File sharing unlocks once your designer starts the project.',
    })
  }

  res.json({
    files: listClientFiles(client.id),
    projectName: client.projectName,
  })
})

router.post('/files', (req, res, next) => {
  ensureClientFileSharing(req.user.clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)
  if (!client) return res.status(404).json({ error: 'Client profile not found' })
  if (!isProjectActive(client)) {
    return res.status(403).json({
      error: 'File sharing unlocks once your designer starts the project.',
    })
  }
  req.portalClientId = client.id
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' })
    }
    next()
  })
}, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const store = readStore()
    const client = store.clients.find((c) => c.id === req.user.clientId)
    if (!client) {
      fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Client not found' })
    }

    const initialNote = typeof req.body?.note === 'string' ? req.body.note : ''

    const entry = saveUploadedFile({
      client,
      file: req.file,
      uploadedBy: 'client',
      uploadedByName: req.user.name,
      initialNote,
    })

    res.status(201).json({ file: entry })
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    console.error('portal upload', err)
    res.status(400).json({ error: err.message || 'Upload failed' })
  }
})

/** Add a note linked to a specific uploaded file */
router.post('/files/:fileId/notes', (req, res) => {
  ensureClientFileSharing(req.user.clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)
  if (!client) return res.status(404).json({ error: 'Client profile not found' })
  if (!isProjectActive(client)) {
    return res.status(403).json({ error: 'File sharing is not available yet' })
  }

  const { text } = req.body ?? {}
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Note text is required' })
  }

  const file = (store.projectFiles ?? []).find(
    (f) => f.id === req.params.fileId && f.clientId === client.id
  )
  if (!file) return res.status(404).json({ error: 'File not found' })

  const updated = addNoteToFile({
    fileId: file.id,
    clientId: client.id,
    text,
    authorName: req.user.name,
    authorRole: 'client',
  })

  res.json({ file: updated })
})

router.get('/files/:fileId/download', (req, res) => {
  ensureClientFileSharing(req.user.clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)
  if (!isProjectActive(client ?? {})) {
    return res.status(403).json({ error: 'File sharing is not available yet' })
  }

  const result = getFileDownloadPath(req.params.fileId)
  if (!result || result.file.clientId !== req.user.clientId) {
    return res.status(404).json({ error: 'File not found' })
  }
  res.download(result.filePath, result.file.originalName)
})

router.delete('/files/:fileId', (req, res) => {
  ensureClientFileSharing(req.user.clientId)
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.user.clientId)
  if (!client) return res.status(404).json({ error: 'Client profile not found' })
  if (!isProjectActive(client)) {
    return res.status(403).json({ error: 'File sharing is not available yet' })
  }

  const deleted = deleteProjectFile(req.params.fileId, {
    clientId: client.id,
    uploadedBy: 'client',
  })
  if (!deleted) {
    return res.status(404).json({ error: 'File not found or cannot be removed' })
  }

  res.json({ ok: true, file: deleted })
})

/** Confirm Square payment after hosted checkout redirect */
router.post('/verify-square-payment', async (req, res) => {
  try {
    const store = readStore()
    const client = store.clients.find((c) => c.id === req.user.clientId)
    if (!client) return res.status(404).json({ error: 'Client profile not found' })

    const pendingOrderId =
      (!client.rentInvoice?.paidAt && client.rentInvoice?.squareOrderId) ||
      (!client.finalInvoice?.paidAt && client.finalInvoice?.squareOrderId) ||
      (!client.invoice?.paidAt && client.invoice?.squareOrderId)

    if (!pendingOrderId) {
      return res.status(400).json({ error: 'No pending Square invoice found for this account' })
    }

    const result = await verifySquareOrderPayment(pendingOrderId)
    updateStore((s) => applyPaymentToStore(s, result.clientId, result))
    res.json(result)
  } catch (err) {
    console.error('portal verify-square-payment', err)
    res.status(500).json({ error: err.message })
  }
})

/** Client in-app notifications */
router.get('/notifications', (req, res) => {
  const store = readStore()
  const notifications = getClientNotificationsForUser(store, req.user.id)
  const unread = notifications.filter((n) => !n.read)
  res.json({ notifications: unread.slice(0, 20), count: unread.length })
})

router.post('/notifications/read', (req, res) => {
  const { ids } = req.body ?? {}
  updateStore((s) => {
    const idSet = Array.isArray(ids) && ids.length > 0 ? new Set(ids) : null
    const clientNotifications = (s.clientNotifications ?? []).map((n) => {
      if (n.userId !== req.user.id) return n
      if (idSet && !idSet.has(n.id)) return n
      return { ...n, read: true }
    })
    return { ...s, clientNotifications }
  })
  res.json({ ok: true })
})

/** Onboarding tour progress */
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
        next = {
          ...current,
          completedSteps: [...steps],
        }
      }

      updatedUser = { ...u, onboardingProgress: next }
      return updatedUser
    })
    return { ...s, users }
  })

  res.json({ progress: updatedUser?.onboardingProgress ?? { completedSteps: [] } })
})

export default router
