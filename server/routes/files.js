import { Router } from 'express'
import fs from 'fs'
import { readStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import {
  listClientFiles,
  saveUploadedFile,
  getFileDownloadPath,
  uploadMiddleware,
} from '../lib/fileUpload.js'

const router = Router()
router.use(authMiddleware, requireRole('admin'))

router.get('/client/:clientId', (req, res) => {
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.params.clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  res.json({ files: listClientFiles(client.id), projectName: client.projectName })
})

router.post('/client/:clientId', uploadMiddleware.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const store = readStore()
    const client = store.clients.find((c) => c.id === req.params.clientId)
    if (!client) {
      fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Client not found' })
    }

    const entry = saveUploadedFile({
      client,
      file: req.file,
      uploadedBy: 'admin',
      uploadedByName: req.user.name,
    })

    res.status(201).json({ file: entry })
  } catch (err) {
    console.error('upload', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

router.get('/:fileId/download', (req, res) => {
  const result = getFileDownloadPath(req.params.fileId)
  if (!result) return res.status(404).json({ error: 'File not found' })
  res.download(result.filePath, result.file.originalName)
})

export default router
