import { useEffect, useRef, useState } from 'react'
import { BookOpen, Loader2, Shield } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import {
  FEATURE_GUIDE_PDF_ASSET,
  FEATURE_GUIDE_TITLE,
  featureGuideViewerSrc,
} from '@/lib/featureGuide'

interface FeatureGuideModalProps {
  open: boolean
  onClose: () => void
}

/**
 * In-app, view-only Feature Overview PDF.
 * Softens casual download / print / copy / share; OS-level screenshots cannot be fully blocked in a browser.
 */
export function FeatureGuideModal({ open, onClose }: FeatureGuideModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [obscured, setObscured] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setObjectUrl(null)
      setError('')
      setLoading(false)
      setObscured(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setObscured(false)

    ;(async () => {
      try {
        const response = await fetch(FEATURE_GUIDE_PDF_ASSET, {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!response.ok) {
          throw new Error('Could not load the Feature Guide.')
        }
        const blob = await response.blob()
        if (cancelled) return
        const pdfBlob =
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' })
        const url = URL.createObjectURL(pdfBlob)
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = url
        setObjectUrl(url)
      } catch {
        if (!cancelled) {
          setError('The Feature Guide could not be loaded. Try again in a moment.')
          setObjectUrl(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const obscure = () => setObscured(true)
    const reveal = () => {
      if (!document.hidden && document.hasFocus()) setObscured(false)
    }

    const onVisibility = () => {
      if (document.hidden) obscure()
      else reveal()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const meta = event.metaKey || event.ctrlKey
      if (
        key === 'printscreen' ||
        (meta && (key === 'p' || key === 's' || key === 'c' || key === 'a')) ||
        (event.metaKey && event.shiftKey && (key === '3' || key === '4' || key === '5'))
      ) {
        event.preventDefault()
        event.stopPropagation()
        obscure()
      }
    }

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const onDragStart = (event: DragEvent) => {
      event.preventDefault()
    }

    window.addEventListener('blur', obscure)
    window.addEventListener('focus', reveal)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('contextmenu', onContextMenu, true)
    document.addEventListener('dragstart', onDragStart, true)

    return () => {
      window.removeEventListener('blur', obscure)
      window.removeEventListener('focus', reveal)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('contextmenu', onContextMenu, true)
      document.removeEventListener('dragstart', onDragStart, true)
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Feature Guide"
      size="full"
      mobileCover
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              {FEATURE_GUIDE_TITLE}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              View online only — download, print, copy, and share controls are turned off in this
              viewer.
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
            <Shield className="h-3 w-3" aria-hidden />
            View only
          </p>
        </div>

        <div
          className="feature-guide-viewer relative overflow-hidden rounded-[var(--radius-sm)] border-2 border-ink bg-surface shadow-[2px_2px_0_0_rgba(17,17,17,0.85)]"
          onCopy={(event) => event.preventDefault()}
          onCut={(event) => event.preventDefault()}
          onPaste={(event) => event.preventDefault()}
        >
          {loading ? (
            <div className="flex h-[min(70vh,36rem)] min-h-[16rem] items-center justify-center gap-2 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading Feature Guide…
            </div>
          ) : error ? (
            <div className="flex h-[min(70vh,36rem)] min-h-[16rem] items-center justify-center px-4 text-center text-sm text-accent">
              {error}
            </div>
          ) : objectUrl ? (
            <>
              <iframe
                src={featureGuideViewerSrc(objectUrl)}
                title={FEATURE_GUIDE_TITLE}
                className="feature-guide-viewer__frame h-[min(70vh,36rem)] w-full min-h-[16rem] bg-surface"
                referrerPolicy="no-referrer"
              />
              {obscured ? (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface-paper px-6 text-center"
                  role="status"
                >
                  <Shield className="h-8 w-8 text-brand" aria-hidden />
                  <p className="text-sm font-semibold text-ink">Guide hidden</p>
                  <p className="max-w-sm text-xs text-ink-muted">
                    The Feature Guide is hidden while this window is inactive or a capture shortcut
                    is used. Click back into the app to keep reading.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
