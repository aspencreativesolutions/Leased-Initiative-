import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { getClientServiceTier } from '@/lib/clientUtils'
import { getServiceTierInfo } from '@/lib/serviceTierInfo'
import { TimelineSkipModal } from '@/components/clients/TimelineSkipModal'
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
  aside?: ReactNode
}

export function ProjectTimeline({ client, aside }: ProjectTimelineProps) {
  const location = useLocation()
  const { refresh, getContractForClient } = useApp()
  const serviceTier = getClientServiceTier(client, getContractForClient(client.id))
  const tierInfo = getServiceTierInfo(serviceTier)
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
          Confirm Payment Complete
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

  const timelineSubtitle = `${completedCount} of ${steps.length} steps completed — hover pending steps to skip ahead`

  return (
    <section id="project-timeline" className="mb-4 scroll-mt-24 sm:mb-6">
      <Card padding="sm" className="sm:p-5">
        <div className="mb-2.5 border-b border-line pb-2 sm:hidden">
          <div className="flex items-start justify-between gap-2">
            <h2 className="heading-display text-lg">Project Timeline</h2>
            <ServiceTierBadge tier={serviceTier} small className="shrink-0" />
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">{timelineSubtitle}</p>
          <p className="mt-1 text-[10px] leading-snug text-ink-muted">{tierInfo.tagline}</p>
        </div>

        <div className="hidden sm:block">
          <CardHeader
            title="Project Timeline"
            subtitle={timelineSubtitle}
            dense
            action={
              <div className="max-w-[12rem] text-right">
                <ServiceTierBadge tier={serviceTier} small className="ml-auto" />
                <p className="mt-1 text-[10px] leading-snug text-ink-muted">{tierInfo.tagline}</p>
              </div>
            }
          />
        </div>

        {error && (
          <p className="mb-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}
        {actionError && (
          <p className="mb-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {actionError}
          </p>
        )}

        {loading && steps.length === 0 ? (
          <p className="text-sm text-ink-muted">Loading timeline…</p>
        ) : (
          <div
            className={
              aside
                ? 'grid grid-cols-1 gap-4 min-[520px]:grid-cols-[minmax(0,1fr)_minmax(10.5rem,13rem)] min-[520px]:items-start'
                : undefined
            }
          >
            <div className="min-w-0">
              <HorizontalTimeline
                steps={steps}
                variant="admin"
                skippableIds={skippableIds}
                onSkipClick={setSkipTarget}
                getStepId={(step) => `timeline-step-${step.id}`}
                renderStepActions={renderStepActions}
                compact
              />
            </div>
            {aside && (
              <aside className="min-w-0 border-t border-line pt-3 min-[520px]:border-l min-[520px]:border-t-0 min-[520px]:pl-4 min-[520px]:pt-0">
                {aside}
              </aside>
            )}
          </div>
        )}
      </Card>

      {skipTarget && (
        <TimelineSkipModal
          open={Boolean(skipTarget)}
          onClose={() => setSkipTarget(null)}
          client={client}
          targetStep={skipTarget}
          skippedSteps={skippedStepsForModal}
          hasContract={Boolean(getContractForClient(client.id))}
          onComplete={handleSkipComplete}
        />
      )}
    </section>
  )
}
