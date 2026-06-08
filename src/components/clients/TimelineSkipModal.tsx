import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/FormField'
import { buildTimelineSkipNoteText } from '@/lib/timelineSkipNote'
import { getTimelineStepLabel } from '@/lib/timelineSteps'
import { skipTimelineToStep } from '@/lib/timelineApi'
import { ApiError } from '@/lib/api'
import type { Client, ProjectTimelineStep } from '@/types'

type ModalPhase = 'confirm' | 'note-preview'

interface TimelineSkipModalProps {
  open: boolean
  onClose: () => void
  client: Client
  targetStep: ProjectTimelineStep
  skippedSteps: ProjectTimelineStep[]
  onComplete: (targetStepId: string) => void
}

export function TimelineSkipModal({
  open,
  onClose,
  client,
  targetStep,
  skippedSteps,
  onComplete,
}: TimelineSkipModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('confirm')
  const [customDetail, setCustomDetail] = useState('')
  const [showDetailInput, setShowDetailInput] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const skippedStepIds = skippedSteps.map((s) => s.id)

  const previewNote = useMemo(
    () =>
      buildTimelineSkipNoteText({
        clientName: client.name,
        skippedStepIds,
        targetStepId: targetStep.id,
        customDetail: showDetailInput ? customDetail : undefined,
      }),
    [client.name, skippedStepIds, targetStep.id, customDetail, showDetailInput]
  )

  const reset = () => {
    setPhase('confirm')
    setCustomDetail('')
    setShowDetailInput(false)
    setError('')
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const runSkip = async (addNote: boolean) => {
    setSubmitting(true)
    setError('')
    try {
      await skipTimelineToStep(client.id, {
        targetStepId: targetStep.id,
        addNote,
        note: addNote ? previewNote : undefined,
      })
      onComplete(targetStep.id)
      handleClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not skip timeline step')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'note-preview') {
    return (
      <Modal open={open} onClose={handleClose} title="Skip with note" size="lg">
        <p className="mb-4 text-sm text-ink-muted">
          Preview of the note that will appear on your dashboard. You can add custom detail
          before saving.
        </p>

        <div className="rounded-sm border-2 border-line bg-surface p-4">
          <p className="whitespace-pre-wrap text-sm text-ink">{previewNote}</p>
        </div>

        {showDetailInput ? (
          <div className="mt-4">
            <Textarea
              label="Additional detail"
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              rows={4}
              placeholder="Add a custom reason or context for this skip…"
            />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setShowDetailInput(true)}
          >
            Add Detail
          </Button>
        )}

        {error && (
          <p className="mt-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setPhase('confirm')} disabled={submitting}>
            Back
          </Button>
          <Button onClick={() => runSkip(true)} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save skip & note'}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Skip timeline step" size="md">
      <p className="text-sm font-medium text-ink">
        Are you sure you want to skip to this part of the timeline?
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Advanced to: <strong className="text-ink">{targetStep.label}</strong>
      </p>

      {skippedSteps.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-caps text-ink-faint">
            Steps that will be skipped
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {skippedSteps.map((step) => (
              <li key={step.id}>{getTimelineStepLabel(step.id)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          The timeline will advance to this step.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button variant="ghost" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => runSkip(false)}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, skip to this part'}
        </Button>
        <Button
          onClick={() => {
            setPhase('note-preview')
            setError('')
          }}
          disabled={submitting}
        >
          Skip to this part and add note
        </Button>
      </div>
    </Modal>
  )
}
