import { useEffect, useState } from 'react'
import { Download, File, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'
import { fetchAuthenticatedFileBlob } from '@/lib/filesApi'
import { getFilePreviewKind } from '@/lib/filePreview'
import type { ProjectFile } from '@/types'

interface ProjectFilePreviewModalProps {
  open: boolean
  onClose: () => void
  file: ProjectFile | null
  downloadUrl: string | null
  onDownload: () => void
}

export function ProjectFilePreviewModal({
  open,
  onClose,
  file,
  downloadUrl,
  onDownload,
}: ProjectFilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !file || !downloadUrl) {
      setPreviewUrl(null)
      setError('')
      return
    }

    const previewKind = getFilePreviewKind(file)
    if (previewKind === 'unsupported') {
      setPreviewUrl(null)
      setError('')
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const blob = await fetchAuthenticatedFileBlob(downloadUrl)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    }
  }, [open, file, downloadUrl])

  if (!file) return null

  const previewKind = getFilePreviewKind(file)

  return (
    <Modal open={open} onClose={onClose} title={file.originalName} size="xl">
      {previewKind === 'unsupported' ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <File className="h-12 w-12 text-ink-faint" />
          <p className="text-sm text-ink-muted">
            Preview isn&apos;t available for this file type. Download it to open on your device.
          </p>
          <Button size="sm" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading preview…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm text-accent">{error}</p>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download instead
          </Button>
        </div>
      ) : previewKind === 'image' && previewUrl ? (
        <div className="flex justify-center bg-ink/5 p-2">
          <img
            src={previewUrl}
            alt={file.originalName}
            className="max-h-[70vh] max-w-full object-contain"
          />
        </div>
      ) : previewKind === 'pdf' && previewUrl ? (
        <iframe
          src={previewUrl}
          title={file.originalName}
          className="h-[70vh] w-full rounded-sm border border-line bg-surface"
        />
      ) : null}

      {previewKind !== 'unsupported' && !loading && !error && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      )}
    </Modal>
  )
}
