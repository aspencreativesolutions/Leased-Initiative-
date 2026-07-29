import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { readStore, updateStore } from '../db.js'
import { ALLOWED_FILE_LABEL, isAllowedUpload } from './allowedFileTypes.js'
import { ensureUploadsDir, generateFileId } from './uploads.js'

/** Virtual client bucket for landlord lease style templates. */
export const LEASE_TEMPLATE_UPLOAD_CLIENT_ID = '__lease_templates__'

export const MAX_TEMPLATE_FILE_SIZE = 25 * 1024 * 1024

const DOC_OR_PDF = (file) => {
  if (!isAllowedUpload(file)) return false
  const name = String(file.originalname || '').toLowerCase()
  const mime = String(file.mimetype || '').toLowerCase()
  return (
    mime.includes('pdf') ||
    mime.includes('msword') ||
    mime.includes('wordprocessingml') ||
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  )
}

const templateStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, ensureUploadsDir(LEASE_TEMPLATE_UPLOAD_CLIENT_ID))
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    cb(null, `${generateFileId()}-${safe}`)
  },
})

export const leaseTemplateUploadMiddleware = multer({
  storage: templateStorage,
  limits: { fileSize: MAX_TEMPLATE_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (DOC_OR_PDF(file)) {
      cb(null, true)
      return
    }
    cb(new Error(`Upload a PDF or Word document. Accepted: ${ALLOWED_FILE_LABEL}.`))
  },
})

function styleLabelFromFile(originalName) {
  const base = String(originalName || 'Lease style')
    .replace(/\.(pdf|docx?)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  return base.slice(0, 80) || 'Custom lease style'
}

/**
 * Restyle a contract to use a template without changing tenant details or signatures.
 * Intentionally does not touch contentUpdatedAt / signedContentFingerprint.
 */
export function applyLeaseStyleToContract(contract, template) {
  if (!contract || !template) return contract
  return {
    ...contract,
    leaseTemplateId: template.id,
    leaseStyleName: template.styleLabel || template.name,
  }
}

export function listLeaseAgreementTemplates(store = readStore()) {
  return [...(store.leaseAgreementTemplates ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function findLeaseTemplate(store, templateId) {
  return (store.leaseAgreementTemplates ?? []).find((t) => t.id === templateId) || null
}

export function createLeaseTemplateFromUpload({ file, uploadedByName }) {
  const now = new Date().toISOString()
  const fileId = generateFileId()
  const styleLabel = styleLabelFromFile(file.originalname)
  const template = {
    id: generateFileId(),
    name: styleLabel,
    originalFileName: file.originalname,
    mimeType: file.mimetype,
    fileId,
    storedName: file.filename,
    size: file.size,
    status: 'pending_review',
    createdAt: now,
    styleLabel,
  }

  const projectFile = {
    id: fileId,
    clientId: LEASE_TEMPLATE_UPLOAD_CLIENT_ID,
    projectName: 'Lease Agreement Templates',
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: 'admin',
    uploadedByName: uploadedByName || 'Landlord',
    createdAt: now,
    notes: [],
  }

  updateStore((s) => ({
    ...s,
    leaseAgreementTemplates: [...(s.leaseAgreementTemplates ?? []), template],
    projectFiles: [...(s.projectFiles ?? []), projectFile],
  }))

  return template
}

export function confirmLeaseTemplate(templateId) {
  const now = new Date().toISOString()
  let confirmed = null

  updateStore((s) => {
    const templates = (s.leaseAgreementTemplates ?? []).map((t) => {
      if (t.id !== templateId) {
        return t.status === 'active' ? { ...t, status: 'archived' } : t
      }
      confirmed = {
        ...t,
        status: 'active',
        confirmedAt: now,
      }
      return confirmed
    })

    if (!confirmed) return s

    return {
      ...s,
      leaseAgreementTemplates: templates,
      settings: {
        ...s.settings,
        defaultLeaseTemplateId: confirmed.id,
        defaultLeaseTemplateName: confirmed.styleLabel || confirmed.name,
        leaseStyleReplacePrompt: {
          templateId: confirmed.id,
          templateName: confirmed.styleLabel || confirmed.name,
          confirmedAt: now,
          showOnPending: true,
          showOnContracts: true,
        },
      },
    }
  })

  return confirmed
}

export function dismissLeaseStylePrompt({ pending, contracts }) {
  let prompt = null
  updateStore((s) => {
    const current = s.settings?.leaseStyleReplacePrompt
    if (!current) return s
    prompt = {
      ...current,
      showOnPending: pending ? false : current.showOnPending !== false,
      showOnContracts: contracts ? false : current.showOnContracts !== false,
    }
    const bothHidden = prompt.showOnPending === false && prompt.showOnContracts === false
    if (bothHidden) {
      prompt = { ...prompt, dismissedAt: new Date().toISOString() }
    }
    return {
      ...s,
      settings: {
        ...s.settings,
        leaseStyleReplacePrompt: bothHidden ? null : prompt,
      },
    }
  })
  return prompt
}

/**
 * Apply the active (or specified) template style to selected contracts.
 * Preserves all tenant-specific fields and signatures.
 */
function clientIsPending(client) {
  if (!client) return false
  if (client.isOfficialClient) return false
  return (
    client.contractStatus !== 'Signed' &&
    client.contractStatus !== 'Completed' &&
    client.contractStatus !== 'Cancelled'
  )
}

function clientIsOfficial(client) {
  return Boolean(client?.isOfficialClient)
}

/**
 * Apply the active (or specified) template style to selected contracts.
 * Preserves all tenant-specific fields and signatures.
 *
 * @param {{ templateId?: string, contractIds?: string[], scope: 'pending' | 'official' | 'selected' }} opts
 */
export function applyLeaseStyleToContracts({ templateId, contractIds, scope }) {
  const store = readStore()
  const template =
    findLeaseTemplate(store, templateId) ||
    findLeaseTemplate(store, store.settings?.defaultLeaseTemplateId)
  if (!template || (template.status !== 'active' && template.status !== 'pending_review')) {
    return { error: 'No lease agreement template found', status: 404 }
  }

  const idSet = contractIds?.length ? new Set(contractIds) : null
  let updatedCount = 0

  updateStore((s) => {
    const clientsById = new Map((s.clients ?? []).map((c) => [c.id, c]))
    const contracts = (s.contracts ?? []).map((c) => {
      const client = clientsById.get(c.clientId)
      if (scope === 'selected') {
        if (!idSet?.has(c.id)) return c
      } else if (scope === 'pending') {
        if (idSet) {
          if (!idSet.has(c.id)) return c
        } else if (!clientIsPending(client)) {
          return c
        }
      } else if (scope === 'official') {
        if (idSet) {
          if (!idSet.has(c.id)) return c
        } else if (!clientIsOfficial(client)) {
          return c
        }
      } else {
        return c
      }
      updatedCount += 1
      return applyLeaseStyleToContract(c, template)
    })

    const prompt = s.settings?.leaseStyleReplacePrompt
    let nextPrompt = prompt ?? null
    if (prompt) {
      if (scope === 'pending') {
        nextPrompt = { ...prompt, showOnPending: false }
      } else if (scope === 'official') {
        nextPrompt = { ...prompt, showOnContracts: false }
      }
      // scope === 'selected' — surface-specific dismiss handled by the route
      if (
        nextPrompt &&
        nextPrompt.showOnPending === false &&
        nextPrompt.showOnContracts === false
      ) {
        nextPrompt = null
      }
    }

    return {
      ...s,
      contracts,
      settings: {
        ...s.settings,
        leaseStyleReplacePrompt: scope === 'selected' ? prompt : nextPrompt,
      },
    }
  })

  return { template, updatedCount }
}

export function getLeaseTemplateDownloadPath(fileId) {
  const store = readStore()
  const file = (store.projectFiles ?? []).find((f) => f.id === fileId)
  if (!file || file.clientId !== LEASE_TEMPLATE_UPLOAD_CLIENT_ID) return null
  const filePath = path.join(ensureUploadsDir(file.clientId), file.storedName)
  if (!fs.existsSync(filePath)) return null
  return { file, filePath }
}
