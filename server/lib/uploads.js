import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads')

export function ensureUploadsDir(clientId) {
  const dir = path.join(UPLOADS_DIR, clientId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function generateFileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
