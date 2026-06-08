import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Check,
  Circle,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { TimelineSkipModal } from '@/components/clients/TimelineSkipModal'
import { ClientFinalInvoiceCard } from '@/components/payments/ClientFinalInvoiceCard'
import { useApp } from '@/context/AppContext'
import {
  completeClientProject,
  confirmClientPayment,
  fetchClientTimeline,
} from '@/lib/timelineApi'
import { getSkippedStepsForTarget, getSkippableTargetSteps } from '@/lib/timelineSkipUtils'
import { ApiError } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { Client, ProjectTimelineStep } from '@/types'

const POLL_MS = 5_000

interface ProjectTimelineProps {
  client: Client
}

function StepIcon({
  status,
  skippable,
  onClick,
}: {
  status: ProjectTimelineStep['status']
  skippable: boolean
  onClick?: () => void
}) {
  const inner =
    status === 'completed' ? (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-ink text-surface-paper">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    ) : status === 'active' ? (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand">
        <Clock className="h-4 w-4" />
      </span>
    ) : (
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-surface text-ink-faint',
          skippable
            ? 'border-brand/40 hover:border-brand hover:bg-brand/10 hover:text-brand cursor-pointer'
            : 'border-line'
        )}
      >
        <Circle className="h-3 w-3" />
      </span>
    )

  if (!skippable || !onClick) return inner

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="Skip to this timeline step"
      >
        {inner}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-ink bg-ink px-2 py-1 text-[10px] font-semibold text-surface-paper group-hover:block group-focus-within:block"
      >
        Click to skip to this step
      </span>
    </div>
  )
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
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          <ol className="relative space-y-0">
            {steps.map((step, index) => {
              const skippable = skippableIds.has(step.id)

              return (
                <li
                  key={step.id}
                  id={`timeline-step-${step.id}`}
                  className="relative flex gap-4 pb-8 last:pb-0 scroll-mt-32"
                >
                  {index < steps.length - 1 && (
                    <span
                      className={cn(
                        'absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-0.5',
                        step.status === 'completed' ? 'bg-ink' : 'bg-line'
                      )}
                      aria-hidden
                    />
                  )}
                  <StepIcon
                    status={step.status}
                    skippable={skippable}
                    onClick={skippable ? () => setSkipTarget(step) : undefined}
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p
                        className={cn(
                          'font-semibold',
                          step.status === 'completed'
                            ? 'text-ink'
                            : step.status === 'active'
                              ? 'text-brand'
                              : 'text-ink-muted'
                        )}
                      >
                        {step.label}
                      </p>
                      {step.skipped && (
                        <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
                          Skipped
                        </span>
                      )}
                      {step.status === 'active' && (
                        <span className="text-[10px] font-bold uppercase tracking-caps text-brand">
                          Current step
                        </span>
                      )}
                      {step.status === 'pending' && !skippable && (
                        <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
                          Pending
                        </span>
                      )}
                      {skippable && (
                        <span className="text-[10px] font-semibold uppercase tracking-caps text-brand/70">
                          Click circle to skip
                        </span>
                      )}
                    </div>
                    {step.completedAt && (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {formatDate(step.completedAt)}
                      </p>
                    )}
                    {step.detail && (
                      <p className="mt-1 text-sm text-ink-muted">{step.detail}</p>
                    )}

                    {step.id === 'payment_confirmed' && canConfirmPayment && (
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={confirming}
                        onClick={handleConfirmPayment}
                      >
                        {confirming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Confirm Payment on PayPal
                      </Button>
                    )}

                    {step.id === 'project_completed' && canCompleteProject && (
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={completing}
                        onClick={handleCompleteProject}
                      >
                        {completing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Mark Project Completed
                      </Button>
                    )}

                    {step.subEvents && step.subEvents.length > 0 && (
                      <ul className="mt-3 space-y-2 border-l-2 border-brand/20 pl-3">
                        {step.subEvents.map((event) => (
                          <li key={event.id} className="text-sm">
                            <p className="font-medium text-ink">{event.label}</p>
                            {event.detail && (
                              <p className="mt-0.5 text-ink-muted">{event.detail}</p>
                            )}
                            <p className="mt-0.5 text-xs text-ink-faint">
                              {formatDate(event.completedAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
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
