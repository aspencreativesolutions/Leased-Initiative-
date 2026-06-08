import path from 'path'

export const ALLOWED_FILE_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.webp',
])

export const ALLOWED_FILE_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])

export const ALLOWED_FILE_ACCEPT =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.svg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/svg+xml,image/webp'

export const ALLOWED_FILE_LABEL =
  'PDF, Word (DOC/DOCX), images (JPG, PNG), and logos (SVG, PNG, WEBP)'

export function isAllowedUpload(file) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (ALLOWED_FILE_EXTENSIONS.has(ext)) return true
  if (file.mimetype && ALLOWED_FILE_MIMES.has(file.mimetype)) return true
  return false
}
