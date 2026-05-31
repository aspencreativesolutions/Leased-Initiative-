import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { readStore, updateStore } from '../db.js'
import { authMiddleware, requireRole } from '../auth.js'
import { ensureUploadsDir, generateFileId } from '../lib/uploads.js'

const router = Router()
router.use(authMiddleware, requireRole('admin'))

const MAX_SIZE = 25 * 1024 * 1024

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const clientId = req.params.clientId
    cb(null, ensureUploadsDir(clientId))
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    cb(null, `${generateFileId()}-${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
})

router.get('/client/:clientId', (req, res) => {
  const store = readStore()
  const client = store.clients.find((c) => c.id === req.params.clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const files = (store.projectFiles ?? [])
    .filter((f) => f.clientId === req.params.clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  res.json({ files, projectName: client.projectName })
})

router.post('/client/:clientId', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const store = readStore()
    const client = store.clients.find((c) => c.id === req.params.clientId)
    if (!client) {
      fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Client not found' })
    }

    const entry = {
      id: generateFileId(),
      clientId: client.id,
      projectName: client.projectName,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: 'admin',
      uploadedByName: req.user.name,
      createdAt: new Date().toISOString(),
    }

    updateStore((s) => ({
      ...s,
      projectFiles: [...(s.projectFiles ?? []), entry],
    }))

    res.status(201).json({ file: entry })
  } catch (err) {
    console.error('upload', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

router.get('/:fileId/download', (req, res) => {
  const store = readStore()
  const file = (store.projectFiles ?? []).find((f) => f.id === req.params.fileId)
  if (!file) return res.status(404).json({ error: 'File not found' })

  const filePath = path.join(ensureUploadsDir(file.clientId), file.storedName)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' })

  res.download(filePath, file.originalName)
})

export default router
