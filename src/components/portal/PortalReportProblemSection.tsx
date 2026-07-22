import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { ApiError } from '@/lib/api'
import { PORTAL_FILE_ACCEPT, PORTAL_FILE_TYPES_LABEL } from '@/lib/allowedFileTypes'
import { PROBLEM_TYPES, submitPortalProblemReport } from '@/lib/problemReports'
import { cn, formatFileSize } from '@/lib/utils'

interface PortalReportProblemSectionProps {
  className?: string
  onSubmitted?: () => void
}

function StepHeading({
  step,
  title,
  htmlFor,
}: {
  step: number
  title: string
  htmlFor?: string
}) {
  const heading = (
    <span className="flex items-center gap-2">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-surface text-xs font-bold text-ink"
        aria-hidden
      >
        {step}
      </span>
      <span className="text-sm font-semibold text-ink">{title}</span>
    </span>
  )

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className="mb-3 block">
        {heading}
      </label>
    )
  }

  return <div className="mb-3">{heading}</div>
}

export function PortalReportProblemSection({
  className,
  onSubmitted,
}: PortalReportProblemSectionProps) {
  const [problemType, setProblemType] = useState<string>('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const clearFile = () => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileChange = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!next) {
      setFile(null)
      setPreviewUrl(null)
      return
    }
    setError('')
    setFile(next)
    setPreviewUrl(next.type.startsWith('image/') ? URL.createObjectURL(next) : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!problemType) {
      setError('Select an issue type.')
      return
    }
    if (!note.trim()) {
      setError('Describe the issue so your landlord knows what happened.')
      return
    }
    if (!file) {
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
      clearFile()
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="report-issue"
      className={cn('min-w-0 scroll-mt-24', className)}
      data-onboarding="portal-report-problem"
      aria-labelledby="report-issue-heading"
    >
      <div className="mb-4">
        <h2
          id="report-issue-heading"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink sm:text-xl"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          Report Issue
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Tell your landlord about a household problem so they can assess it and dispatch
          maintenance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1 — Select Issue Type */}
        <fieldset className="rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-4 sm:p-5">
          <legend className="sr-only">Select Issue Type</legend>
          <StepHeading step={1} title="Select Issue Type" />
          <div className="flex flex-wrap gap-2" role="list">
            {PROBLEM_TYPES.map((type) => {
              const selected = problemType === type
              return (
                <button
                  key={type}
                  type="button"
                  role="listitem"
                  aria-pressed={selected}
                  onClick={() => setProblemType(type)}
                  className={cn(
                    'rounded-sm border-2 px-3 py-1.5 text-left text-sm transition-colors',
                    selected
                      ? 'border-brand bg-brand/10 font-semibold text-ink'
                      : 'border-line bg-surface text-ink-muted hover:border-ink/40 hover:text-ink'
                  )}
                >
                  {type}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Step 2 — Describe the Issue */}
        <div className="rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-4 sm:p-5">
          <StepHeading step={2} title="Describe the Issue" htmlFor="report-issue-note" />
          <Textarea
            id="report-issue-note"
            label=""
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="What happened? Where in the unit? How urgent is it?"
            required
          />
        </div>

        {/* Step 3 — Upload Photo */}
        <div className="rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-4 sm:p-5">
          <StepHeading step={3} title="Upload Photo" />
          <p className="mb-2 text-xs text-ink-faint">
            Required — {PORTAL_FILE_TYPES_LABEL}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={PORTAL_FILE_ACCEPT}
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
                  alt="Issue photo preview"
                  className="h-20 w-20 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border border-dashed border-line bg-surface-paper text-ink-faint">
                  <FileUp className="h-6 w-6" aria-hidden />
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
                  onClick={clearFile}
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-dashed border-line bg-surface px-3 py-6 text-sm text-ink-muted transition-colors hover:border-brand hover:text-ink"
            >
              <FileUp className="h-5 w-5" />
              Upload photo
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-start gap-2 rounded-sm border-2 border-brand/40 bg-brand/5 px-3 py-2 text-sm text-ink">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            {success}
          </p>
        )}

        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={submitting || !problemType || !file || !note.trim()}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send to Landlord
        </Button>
      </form>
    </section>
  )
}
