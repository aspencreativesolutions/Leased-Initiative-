import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { TimelineSkipModal } from '@/components/clients/TimelineSkipModal'
import { ClientFinalInvoiceCard } from '@/components/payments/ClientFinalInvoiceCard'
import { HorizontalTimeline } from '@/components/timeline/HorizontalTimeline'
import { useApp } from '@/context/AppContext'
import {
  completeClientProject,
  confirmClientPayment,
  fetchClientTimeline,
} from '@/lib/timelineApi'
import { getSkippedStepsForTarget, getSkippableTargetSteps } from '@/lib/timelineSkipUtils'
import { ApiError } from '@/lib/api'
import type { Client, ProjectTimelineStep } from '@/types'

const POLL_MS = 5_000

interface ProjectTimelineProps {
  client: Client
}

export function ProjectTimeline({ client }: ProjectTimelineProps) {
  const location = useLocation()
  const { refresh } = useApp()
  const [steps, setSteps] = useState<ProjectTimelineStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [skipTarget, setSkipTarget] = useState<ProjectTimelineStep | null>(null)

  const skippableIds = useMemo(
    () => new Set(getSkippableTargetSteps(steps).map((s) => s.id)),
    [steps]
  )

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const data = await fetchClientTimeline(client.id)
        setSteps(data.steps)
        setError('')
      } catch (err) {
        if (!silent) {
          setError(err instanceof ApiError ? err.message : 'Could not load timeline')
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [client.id]
  )

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    const hash = location.hash
    if (!hash.startsWith('#timeline-step-') || steps.length === 0) return
    const el = document.getElementById(hash.slice(1))
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      })
    }
  }, [location.hash, steps])

  const paymentStep = steps.find((s) => s.id === 'payment_confirmed')
  const projectCompletedStep = steps.find((s) => s.id === 'project_completed')
  const payLinkStep = steps.find((s) => s.id === 'pay_link_clicked')

  const canConfirmPayment =
    (payLinkStep?.status === 'completed' || payLinkStep?.skipped) &&
    paymentStep?.status !== 'completed'

  const canCompleteProject =
    client.projectStartedAt &&
    !client.projectCompletedAt &&
    projectCompletedStep?.status !== 'completed'

  const handleConfirmPayment = async () => {
    setConfirming(true)
    setActionError('')
    try {
      await confirmClientPayment(client.id)
      await refresh()
      await load(true)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not confirm payment')
    } finally {
      setConfirming(false)
    }
  }

  const handleCompleteProject = async () => {
    setCompleting(true)
    setActionError('')
    try {
      await completeClientProject(client.id)
      await refresh()
      await load(true)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not complete project')
    } finally {
      setCompleting(false)
    }
  }

  const handleSkipComplete = async (targetStepId: string) => {
    await refresh()
    await load(true)
    window.location.hash = `timeline-step-${targetStepId}`
  }

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const skippedStepsForModal = skipTarget
    ? getSkippedStepsForTarget(steps, skipTarget.id)
    : []

  const renderStepActions = (step: ProjectTimelineStep) => {
    if (step.id === 'payment_confirmed' && canConfirmPayment) {
      return (
        <Button size="sm" className="w-full text-[10px]" disabled={confirming} onClick={handleConfirmPayment}>
          {confirming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Confirm PayPal
        </Button>
      )
    }
    if (step.id === 'project_completed' && canCompleteProject) {
      return (
        <Button
          size="sm"
          className="w-full text-[10px]"
          disabled={completing}
          onClick={handleCompleteProject}
        >
          {completing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Mark complete
        </Button>
      )
    }
    return null
  }

  return (
    <section id="project-timeline" className="mb-6 scroll-mt-24">
      <Card padding="lg">
        <CardHeader
          title="Project Timeline"
          subtitle={`${completedCount} of ${steps.length} steps completed — hover pending steps to skip ahead`}
        />

        {error && (
          <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}
        {actionError && (
          <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {actionError}
          </p>
        )}

        {loading && steps.length === 0 ? (
          <p className="text-sm text-ink-muted">Loading timeline…</p>
        ) : (
          <HorizontalTimeline
            steps={steps}
            variant="admin"
            skippableIds={skippableIds}
            onSkipClick={setSkipTarget}
            getStepId={(step) => `timeline-step-${step.id}`}
            renderStepActions={renderStepActions}
          />
        )}
      </Card>

      {client.finalInvoice && (
        <div className="mt-4">
          <ClientFinalInvoiceCard client={client} />
        </div>
      )}

      {skipTarget && (
        <TimelineSkipModal
          open={Boolean(skipTarget)}
          onClose={() => setSkipTarget(null)}
          client={client}
          targetStep={skipTarget}
          skippedSteps={skippedStepsForModal}
          onComplete={handleSkipComplete}
        />
      )}
    </section>
  )
}
