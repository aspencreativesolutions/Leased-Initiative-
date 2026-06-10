import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { readStore, updateStore } from '../db.js'
import { ALLOWED_FILE_LABEL, isAllowedUpload } from './allowedFileTypes.js'
import { ensureUploadsDir, generateFileId } from './uploads.js'

export const MAX_FILE_SIZE = 25 * 1024 * 1024

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const clientId = req.portalClientId || req.params.clientId
    cb(null, ensureUploadsDir(clientId))
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    cb(null, `${generateFileId()}-${safe}`)
  },
})

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (isAllowedUpload(file)) {
      cb(null, true)
      return
    }
    cb(new Error(`File type not allowed. Accepted: ${ALLOWED_FILE_LABEL}.`))
  },
})

export function listClientFiles(clientId) {
  const store = readStore()
  return (store.projectFiles ?? [])
    .filter((f) => f.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function buildFileNote({ text, authorName, authorRole }) {
  return {
    id: generateFileId(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    authorName,
    authorRole,
  }
}

export function saveUploadedFile({
  client,
  file,
  uploadedBy,
  uploadedByName,
  initialNote,
}) {
  const notes = []
  if (initialNote?.trim()) {
    notes.push(
      buildFileNote({
        text: initialNote,
        authorName: uploadedByName,
        authorRole: uploadedBy,
      })
    )
  }

  const entry = {
    id: generateFileId(),
    clientId: client.id,
    projectName: client.projectName,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy,
    uploadedByName,
    createdAt: new Date().toISOString(),
    notes,
  }

  updateStore((s) => ({
    ...s,
    projectFiles: [...(s.projectFiles ?? []), entry],
  }))

  return entry
}

export function addNoteToFile({ fileId, clientId, text, authorName, authorRole }) {
  const trimmed = text?.trim()
  if (!trimmed) return null

  const note = buildFileNote({ text: trimmed, authorName, authorRole })
  let updatedFile = null

  updateStore((s) => {
    const files = (s.projectFiles ?? []).map((f) => {
      if (f.id !== fileId || f.clientId !== clientId) return f
      updatedFile = {
        ...f,
        notes: [...(f.notes ?? []), note],
      }
      return updatedFile
    })
    return { ...s, projectFiles: files }
  })

  return updatedFile
}

export function getFileDownloadPath(fileId) {
  const store = readStore()
  const file = (store.projectFiles ?? []).find((f) => f.id === fileId)
  if (!file) return null
  const filePath = path.join(ensureUploadsDir(file.clientId), file.storedName)
  if (!fs.existsSync(filePath)) return null
  return { file, filePath }
}

export function deleteProjectFile(fileId, { clientId, uploadedBy } = {}) {
  const store = readStore()
  const file = (store.projectFiles ?? []).find((f) => f.id === fileId)
  if (!file) return null
  if (clientId && file.clientId !== clientId) return null
  if (uploadedBy && file.uploadedBy !== uploadedBy) return null

  const filePath = path.join(ensureUploadsDir(file.clientId), file.storedName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  updateStore((s) => ({
    ...s,
    projectFiles: (s.projectFiles ?? []).filter((f) => f.id !== fileId),
  }))

  return file
}
