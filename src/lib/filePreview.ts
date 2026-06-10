export type FilePreviewKind = 'image' | 'pdf' | 'unsupported'

export function getFilePreviewKind(file: {
  originalName: string
  mimeType: string
}): FilePreviewKind {
  const mime = file.mimeType.toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'

  const ext = file.originalName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif'].includes(ext ?? '')) return 'image'
  if (ext === 'pdf') return 'pdf'

  return 'unsupported'
}

export function canPreviewFile(file: { originalName: string; mimeType: string }) {
  return getFilePreviewKind(file) !== 'unsupported'
}
