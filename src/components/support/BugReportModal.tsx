import { useState, type FormEvent } from 'react'
import { AlertTriangle, Bug, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { buildAspenSupportMailto, submitBugReport } from '@/lib/bugReports'
import { ASPEN_SUPPORT_EMAIL } from '@/lib/navToolbar'

interface BugReportModalProps {
  open: boolean
  onClose: () => void
}

const CONFIRMATION_MESSAGE =
  'Thank you! Your bug report has been submitted. Aspen Creative Solutions will review your report and respond as needed, typically within 1–2 business days.'

export function BugReportModal({ open, onClose }: BugReportModalProps) {
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const resetForm = () => {
    setDescription('')
    setStepsToReproduce('')
    setError('')
    setSubmitted(false)
  }

  const handleClose = () => {
    if (submitting) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setError('Please describe the bug or unexpected behavior.')
      return
    }

    setSubmitting(true)
    try {
      await submitBugReport({
        description: trimmedDescription,
        stepsToReproduce: stepsToReproduce.trim(),
      })
      setSubmitted(true)
      setDescription('')
      setStepsToReproduce('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your bug report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report a Bug" size="md">
      {submitted ? (
        <div className="space-y-4 py-1 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand" aria-hidden />
          <p className="text-sm leading-relaxed text-ink">{CONFIRMATION_MESSAGE}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSubmitted(false)}
            >
              Report another
            </Button>
            <Button type="button" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Found a bug or unexpected behavior? Describe what happened and we&apos;ll look into
            it. Aspen Creative Solutions reviews every report.
          </p>

          <Textarea
            label="What went wrong?"
            name="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the bug or unexpected behavior…"
          />

          <Textarea
            label="Steps to reproduce (optional)"
            name="stepsToReproduce"
            rows={3}
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            placeholder={'1. Go to…\n2. Click…\n3. See…'}
          />

          {error ? (
            <p className="flex items-start gap-2 rounded-sm border border-accent/40 bg-accent-light px-3 py-2 text-sm text-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={buildAspenSupportMailto('Leased Initiative assistance')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand underline-offset-2 hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Email Aspen Creative Solutions
              <span className="font-normal text-ink-faint">({ASPEN_SUPPORT_EMAIL})</span>
            </a>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !description.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Bug className="h-3.5 w-3.5" aria-hidden />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
