import { getToken, apiFetch, ApiError } from '@/lib/api'
import type { ProjectFile } from '@/types'

export async function fetchClientFiles(clientId: string) {
  return apiFetch<{ files: ProjectFile[]; projectName: string }>(
    `/api/files/client/${clientId}`
  )
}

export async function uploadClientFile(clientId: string, file: File) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`/api/files/client/${clientId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || 'Upload failed', res.status)
  }
  return data as { file: ProjectFile }
}

export async function fetchPortalFiles() {
  return apiFetch<{ files: ProjectFile[]; projectName: string }>('/api/portal/files')
}

export async function uploadPortalFile(file: File, note?: string) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  if (note?.trim()) {
    formData.append('note', note.trim())
  }

  const res = await fetch('/api/portal/files', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || 'Upload failed', res.status)
  }
  return data as { file: ProjectFile }
}

export async function addPortalFileNote(fileId: string, text: string) {
  return apiFetch<{ file: ProjectFile }>(`/api/portal/files/${fileId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export async function downloadPortalFile(fileId: string, filename: string) {
  const token = getToken()
  const res = await fetch(`/api/portal/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(data.error || 'Download failed', res.status)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadProjectFile(fileId: string, filename: string) {
  const token = getToken()
  const res = await fetch(`/api/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(data.error || 'Download failed', res.status)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
