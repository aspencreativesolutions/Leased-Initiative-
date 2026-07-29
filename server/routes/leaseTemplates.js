import { Router } from 'express'
import fs from 'fs'
import { authMiddleware, requireRole } from '../auth.js'
import { readStore } from '../db.js'
import {
  applyLeaseStyleToContracts,
  confirmLeaseTemplate,
  createLeaseTemplateFromUpload,
  dismissLeaseStylePrompt,
  getLeaseTemplateDownloadPath,
  leaseTemplateUploadMiddleware,
  listLeaseAgreementTemplates,
} from '../lib/leaseAgreementTemplates.js'

const router = Router()
router.use(authMiddleware, requireRole('admin'))

router.get('/', (_req, res) => {
  const store = readStore()
  res.json({
    templates: listLeaseAgreementTemplates(store),
    defaultLeaseTemplateId: store.settings?.defaultLeaseTemplateId || null,
    leaseStyleReplacePrompt: store.settings?.leaseStyleReplacePrompt || null,
  })
})

router.post('/upload', leaseTemplateUploadMiddleware.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const template = createLeaseTemplateFromUpload({
      file: req.file,
      uploadedByName: req.user?.name,
    })
    res.status(201).json({ template })
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {
        /* ignore */
      }
    }
    console.error('lease template upload', err)
    res.status(400).json({ error: err.message || 'Upload failed' })
  }
})

router.post('/:templateId/confirm', (req, res) => {
  const confirmed = confirmLeaseTemplate(req.params.templateId)
  if (!confirmed) return res.status(404).json({ error: 'Template not found' })
  const store = readStore()
  res.json({
    template: confirmed,
    settings: store.settings,
  })
})

router.post('/apply', (req, res) => {
  const { templateId, contractIds, scope, surface } = req.body || {}
  if (!scope || !['pending', 'official', 'selected'].includes(scope)) {
    return res.status(400).json({ error: 'scope must be pending, official, or selected' })
  }
  if (scope === 'selected' && (!Array.isArray(contractIds) || contractIds.length === 0)) {
    return res.status(400).json({ error: 'Select at least one lease agreement' })
  }

  const result = applyLeaseStyleToContracts({ templateId, contractIds, scope })
  if (result.error) return res.status(result.status || 400).json({ error: result.error })

  // If apply came from a specific surface with selected scope, clear that surface's prompt
  if (scope === 'selected' && (surface === 'pending' || surface === 'contracts')) {
    dismissLeaseStylePrompt({
      pending: surface === 'pending',
      contracts: surface === 'contracts',
    })
  }

  const store = readStore()
  res.json({
    ok: true,
    updatedCount: result.updatedCount,
    template: result.template,
    contracts: store.contracts,
    settings: store.settings,
  })
})

router.post('/prompt/dismiss', (req, res) => {
  const { pending, contracts } = req.body || {}
  dismissLeaseStylePrompt({
    pending: Boolean(pending),
    contracts: Boolean(contracts),
  })
  const store = readStore()
  res.json({ settings: store.settings })
})

router.get('/files/:fileId/download', (req, res) => {
  const result = getLeaseTemplateDownloadPath(req.params.fileId)
  if (!result) return res.status(404).json({ error: 'Template file not found' })
  res.download(result.filePath, result.file.originalName)
})

export default router
