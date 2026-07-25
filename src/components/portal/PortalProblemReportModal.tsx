import { useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { PORTAL_PHOTO_ACCEPT, PORTAL_PHOTO_TYPES_LABEL } from '@/lib/allowedFileTypes'
import { PROBLEM_TYPES, submitPortalProblemReport } from '@/lib/problemReports'
import { cn, formatFileSize } from '@/lib/utils'

interface PortalProblemReportModalProps {
  open: boolean
  onClose: () => void
}

function isPhotoFile(file: File) {
  return file.type.startsWith('image/') && !file.type.includes('svg')
}

export function PortalProblemReportModal({ open, onClose }: PortalProblemReportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [problemType, setProblemType] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resetForm = () => {
    setProblemType('')
    setNote('')
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    if (submitting) return
    resetForm()
    onClose()
  }

  const handleFileChange = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!next) {
      setFile(null)
      setPreviewUrl(null)
      return
    }
    if (!isPhotoFile(next)) {
      setError('Attach a photo (JPG, PNG, or WEBP).')
      setFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setError('')
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!problemType) {
      setError('Select an issue from the list.')
      return
    }
    if (!file || !isPhotoFile(file)) {
      setError('Upload a photo before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitPortalProblemReport({
        problemType,
        note: note.trim(),
        file,
      })
      setSuccess(result.message || 'Your landlord has been notified.')
      setProblemType('')
      setNote('')
      handleFileChange(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Request Maintenance" size="lg">
      {success ? (
        <div className="space-y-4 py-2 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand" aria-hidden />
          <p className="text-sm font-semibold text-ink">{success}</p>
          <p className="text-sm text-ink-muted">
            Your landlord will see this under Tenant Alerts with your name, address, and the
            photo you attached.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSuccess('')
              }}
            >
              Report another
            </Button>
            <Button size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Select a common household issue, attach a required photo, and optionally add a note.
            Your landlord reviews submissions under Tenant Alerts.
          </p>

          <fieldset>
            <legend className="label-caps mb-2">Issue type</legend>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1" role="list">
              {PROBLEM_TYPES.map((type) => {
                const selected = problemType === type
                return (
                  <li key={type}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-sm border border-line/80 bg-surface px-3 py-2 text-sm transition-colors hover:border-line',
                        selected && 'border-brand bg-brand/5'
                      )}
                    >
                      <input
                        type="radio"
                        name="problemType"
                        value={type}
                        checked={selected}
                        onChange={() => setProblemType(type)}
                        className="mt-0.5 h-4 w-4 shrink-0 border-2 border-ink/25 accent-brand"
                      />
                      <span className="min-w-0 flex-1 leading-snug text-ink">{type}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <div>
            <p className="label-caps mb-1">
              Photo <span className="text-accent">(required)</span>
            </p>
            <p className="mb-2 text-xs text-ink-faint">{PORTAL_PHOTO_TYPES_LABEL}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={PORTAL_PHOTO_ACCEPT}
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null
                handleFileChange(next)
              }}
            />
            {file ? (
              <div className="flex items-start gap-3 rounded-sm border border-line bg-surface p-2">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected photo preview"
                    className="h-16 w-16 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-line text-ink-faint">
                    <Camera className="h-5 w-5" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-ink-faint">{formatFileSize(file.size)}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-1"
                    onClick={() => {
                      handleFileChange(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-dashed border-line bg-surface px-3 py-4 text-sm text-ink-muted transition-colors hover:border-brand hover:text-ink"
              >
                <Camera className="h-5 w-5" aria-hidden />
                Add required photo
              </button>
            )}
          </div>

          <Textarea
            label="Note (optional)"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — what’s going on, where in the unit, how urgent…"
          />

          {error ? (
            <p className="flex items-start gap-2 rounded-sm border border-accent/40 bg-accent-light px-3 py-2 text-sm text-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !problemType || !file}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                'Notify landlord'
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
