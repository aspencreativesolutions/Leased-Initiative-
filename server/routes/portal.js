import { Router } from 'express'
import fs from 'fs'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import {
  listClientFiles,
  saveUploadedFile,
  addNoteToFile,
  getFileDownloadPath,
  uploadMiddleware,
} from '../lib/fileUpload.js'
import {
  getPortalContractStatus,
  getPortalClientContractStatus,
} from '../lib/portalContractStatus.js'
import { repairSentContracts } from '../lib/contractMerge.js'
import { isProjectActive } from '../lib/clientWorkflow.js'
import { buildProjectTimeline } from '../lib/projectTimeline.js'
import { ensureClientFileSharing } from '../lib/ensureFileSharing.js'
import { generateId, pushAdminNotification } from '../lib/notifications.js'

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
      isOfficialClient: false,
      message:
        'Your account is waiting to be accepted by your designer. Once accepted, contracts and project files will appear here.',
    })
  }

  ensureClientFileSharing(clientId)

  const repairedStore = repairSentContracts(readStore(), clientId)
  if (repairedStore !== store) {
    updateStore(() => repairedStore)
  }

  const client = repairedStore.clients.find((c) => c.id === clientId)
  const sentContracts = repairedStore.contracts.filter(
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

  const portalInvoice =
    client?.invoice?.sentToPortalAt && !client.invoice.paidAt
      ? {
          amount: client.invoice.amount,
          currency: client.invoice.currency,
          description: client.invoice.description,
          paymentLink: client.invoice.paymentLink,
          sentToPortalAt: client.invoice.sentToPortalAt,
          invoiceType: 'deposit',
        }
      : client?.invoice?.paidAt
        ? {
            amount: client.invoice.amount,
            currency: client.invoice.currency,
            description: client.invoice.description,
            paidAt: client.invoice.paidAt,
            invoiceType: 'deposit',
          }
        : null

  const portalFinalInvoice =
    client?.finalInvoice?.sentToPortalAt && !client.finalInvoice.paidAt
      ? {
          amount: client.finalInvoice.amount,
          currency: client.finalInvoice.currency,
          description: client.finalInvoice.description,
          paymentLink: client.finalInvoice.paymentLink,
          sentToPortalAt: client.finalInvoice.sentToPortalAt,
          invoiceType: 'final',
        }
      : client?.finalInvoice?.paidAt
        ? {
            amount: client.finalInvoice.amount,
            currency: client.finalInvoice.currency,
            description: client.finalInvoice.description,
            paidAt: client.finalInvoice.paidAt,
            invoiceType: 'final',
          }
        : null

  res.json({
    linked: true,
    isOfficialClient: Boolean(client?.isOfficialClient),
    client: client
      ? {
          id: client.id,
          name: client.name,
          businessName: client.businessName,
          projectName: client.projectName,
          projectStatus: client.projectStatus,
          contractStatus: client.contractStatus,
          paymentStatus: client.paymentStatus,
          portalContractStatus: getPortalClientContractStatus(sentContracts),
        }
      : null,
    contracts: contractSummaries,
    invoice: portalInvoice,
    finalInvoice: portalFinalInvoice,
    projectStarted: isProjectActive(client ?? {}),
    projectStartedAt: client?.projectStartedAt,
    supportContact: {
      businessName: store.settings.businessName,
      ownerName: store.settings.ownerName,
      email: store.settings.email,
      phone: store.settings.phone,
    },
  })
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
  const viewedAt = contract.viewedAt ?? now
  if (!contract.viewedAt) {
    updateStore((s) => ({
      ...s,
      contracts: s.contracts.map((c) =>
        c.id === contract.id ? { ...c, viewedAt: now } : c
      ),
    }))
  }

  const updatedContract = { ...contract, viewedAt }
  res.json({
    contract: updatedContract,
    portalStatus: getPortalContractStatus(updatedContract),
    settings: {
      businessName: store.settings.businessName,
      ownerName: store.settings.ownerName,
    },
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

export default router
