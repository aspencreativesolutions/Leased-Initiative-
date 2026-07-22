import { useEffect, useState } from 'react'
import { Download, FileText, ImageOff, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import {
  downloadProjectFile,
  fetchAuthenticatedFileBlob,
  getProjectFileDownloadUrl,
} from '@/lib/filesApi'

interface TenantAlertAttachmentProps {
  fileId: string
  fileName?: string
  alt?: string
}

export function TenantAlertAttachment({
  fileId,
  fileName,
  alt = 'Issue attachment',
}: TenantAlertAttachmentProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [resolvedName, setResolvedName] = useState(fileName || 'attachment')
  const [isImage, setIsImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const blob = await fetchAuthenticatedFileBlob(getProjectFileDownloadUrl(fileId))
        if (cancelled) return

        const image = blob.type.startsWith('image/')
        setIsImage(image)
        if (fileName) setResolvedName(fileName)

        if (image) {
          objectUrl = URL.createObjectURL(blob)
          setThumbUrl(objectUrl)
        } else {
          setThumbUrl(null)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setThumbUrl(null)
    }
  }, [fileId, fileName])

  if (loading) {
    return (
      <div className="flex h-20 w-28 items-center justify-center rounded-sm border border-line bg-surface text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="sr-only">Loading attachment</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line bg-surface px-2 text-center text-[10px] text-ink-faint">
        <ImageOff className="h-4 w-4" aria-hidden />
        Unavailable
      </div>
    )
  }

  if (isImage && thumbUrl) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative h-20 w-28 overflow-hidden rounded-sm border border-line bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
          title="View full photo"
        >
          <img
            src={thumbUrl}
            alt={alt}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </button>
        <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} title="Issue photo" size="xl">
          <div className="flex justify-center bg-surface p-2">
            <img
              src={thumbUrl}
              alt={alt}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          </div>
        </Modal>
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        void downloadProjectFile(fileId, resolvedName)
      }}
      className="inline-flex max-w-xs items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-left text-sm text-ink transition-colors hover:border-brand"
    >
      <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="min-w-0 truncate font-medium">{resolvedName}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
    </button>
  )
}

/** @deprecated Prefer TenantAlertAttachment */
export function TenantAlertPhoto(props: TenantAlertAttachmentProps) {
  return <TenantAlertAttachment {...props} />
}
