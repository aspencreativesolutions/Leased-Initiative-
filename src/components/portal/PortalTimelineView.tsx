import { Check, Circle, Clock, SkipForward } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn, formatDate } from '@/lib/utils'
import type { ProjectTimelineStep } from '@/types'

function StepIcon({ step }: { step: ProjectTimelineStep }) {
  if (step.status === 'completed') {
    return (
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-surface-paper',
          step.skipped ? 'border-ink-muted bg-ink-muted' : 'border-ink bg-ink'
        )}
      >
        {step.skipped ? (
          <SkipForward className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-4 w-4" strokeWidth={3} />
        )}
      </span>
    )
  }
  if (step.status === 'active') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand">
        <Clock className="h-4 w-4" />
      </span>
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink-faint">
      <Circle className="h-3 w-3" />
    </span>
  )
}

interface PortalTimelineViewProps {
  steps: ProjectTimelineStep[]
  projectName?: string
}

export function PortalTimelineView({ steps, projectName }: PortalTimelineViewProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length

  return (
    <Card padding="lg">
      <CardHeader
        title="Project Timeline"
        subtitle={
          projectName
            ? `${completedCount} of ${steps.length} steps complete for ${projectName}`
            : `${completedCount} of ${steps.length} steps complete`
        }
      />

      <ol className="relative space-y-0">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {index < steps.length - 1 && (
              <span
                className={cn(
                  'absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-0.5',
                  step.status === 'completed' ? 'bg-ink/40' : 'bg-line'
                )}
                aria-hidden
              />
            )}
            <StepIcon step={step} />
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
                    Up next
                  </span>
                )}
                {step.status === 'pending' && (
                  <span className="text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
                    Coming up
                  </span>
                )}
              </div>
              {step.completedAt && (
                <p className="mt-0.5 text-xs text-ink-muted">{formatDate(step.completedAt)}</p>
              )}
              {step.detail && (
                <p className="mt-1 text-sm text-ink-muted">{step.detail}</p>
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
        ))}
      </ol>
    </Card>
  )
}
