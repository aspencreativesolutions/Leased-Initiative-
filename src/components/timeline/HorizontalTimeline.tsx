import { Check, Circle, Clock, SkipForward } from 'lucide-react'
import { TimelineStepBody } from '@/components/timeline/TimelineStepBody'
import { cn } from '@/lib/utils'
import type { ProjectTimelineStep } from '@/types'
import type { ReactNode } from 'react'

/** Compact labels so all steps fit across the row on desktop */
const COMPACT_LABELS: Record<string, { admin: string; portal: string }> = {
  contract_sent: { admin: 'Contract Sent', portal: 'Contract Sent' },
  contract_signed: { admin: 'Signed', portal: 'Signed' },
  invoice_sent: { admin: 'Invoice Sent', portal: 'Invoice Sent' },
  pay_link_clicked: { admin: 'Pay Link', portal: 'Pay Link' },
  payment_confirmed: { admin: 'Payment', portal: 'Payment' },
  project_started: { admin: 'Started', portal: 'Started' },
  file_activity: { admin: 'Files', portal: 'Files' },
  project_completed: { admin: 'Complete', portal: 'Complete' },
}

function getCompactLabel(step: ProjectTimelineStep, variant: 'admin' | 'portal') {
  return COMPACT_LABELS[step.id]?.[variant] ?? step.label
}

function HorizontalConnector({ completed }: { completed: boolean }) {
  return (
    <span
      className={cn('h-0.5 min-w-[2px] flex-1', completed ? 'bg-ink' : 'bg-line')}
      aria-hidden
    />
  )
}

function VerticalConnector({ completed, compact }: { completed: boolean; compact?: boolean }) {
  return (
    <span
      className={cn(
        'my-0.5 w-0.5 flex-1',
        compact ? 'min-h-[0.625rem]' : 'min-h-[1.25rem]',
        completed ? 'bg-ink' : 'bg-line'
      )}
      aria-hidden
    />
  )
}

interface TimelineStepIconProps {
  step: ProjectTimelineStep
  skippable?: boolean
  onSkipClick?: () => void
  variant: 'admin' | 'portal'
}

function TimelineStepIcon({ step, skippable, onSkipClick, variant }: TimelineStepIconProps) {
  const { status } = step

  const inner =
    status === 'completed' ? (
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-surface-paper md:h-8 md:w-8',
          step.skipped && variant === 'portal'
            ? 'border-ink-muted bg-ink-muted'
            : 'border-ink bg-ink'
        )}
      >
        {step.skipped && variant === 'portal' ? (
          <SkipForward className="h-3 w-3 md:h-3.5 md:w-3.5" />
        ) : (
          <Check className="h-3 w-3 md:h-4 md:w-4" strokeWidth={3} />
        )}
      </span>
    ) : status === 'active' ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand md:h-8 md:w-8">
        <Clock className="h-3 w-3 md:h-4 md:w-4" />
      </span>
    ) : (
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-surface text-ink-faint md:h-8 md:w-8',
          skippable
            ? 'border-brand/40 hover:border-brand hover:bg-brand/10 hover:text-brand cursor-pointer'
            : 'border-line'
        )}
      >
        <Circle className="h-2 w-2 md:h-3 md:w-3" />
      </span>
    )

  if (!skippable || !onSkipClick) return inner

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={onSkipClick}
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

function StepBadges({
  step,
  skippable,
  variant,
}: {
  step: ProjectTimelineStep
  skippable: boolean
  variant: 'admin' | 'portal'
}) {
  return (
    <div className="mt-0.5 flex flex-wrap items-center justify-start gap-x-1 gap-y-0.5 md:justify-center">
      {step.skipped && (
        <span className="text-[8px] font-semibold uppercase tracking-caps text-ink-faint md:text-[9px]">
          Skipped
        </span>
      )}
      {step.status === 'active' && (
        <span className="text-[8px] font-bold uppercase tracking-caps text-brand md:text-[9px]">
          {variant === 'portal' ? 'Up next' : 'Current'}
        </span>
      )}
      {step.status === 'pending' && variant === 'portal' && (
        <span className="text-[8px] font-semibold uppercase tracking-caps text-ink-faint md:text-[9px]">
          Soon
        </span>
      )}
      {step.status === 'pending' && variant === 'admin' && !skippable && (
        <span className="text-[8px] font-semibold uppercase tracking-caps text-ink-faint md:text-[9px]">
          Pending
        </span>
      )}
      {skippable && variant === 'admin' && (
        <span className="text-[8px] font-semibold uppercase tracking-caps text-brand/70 max-md:inline md:sr-only">
          Skip
        </span>
      )}
    </div>
  )
}

export interface HorizontalTimelineProps {
  steps: ProjectTimelineStep[]
  variant: 'admin' | 'portal'
  skippableIds?: Set<string>
  onSkipClick?: (step: ProjectTimelineStep) => void
  getStepId?: (step: ProjectTimelineStep) => string | undefined
  renderStepActions?: (step: ProjectTimelineStep) => ReactNode
  compact?: boolean
}

export function HorizontalTimeline({
  steps,
  variant,
  skippableIds,
  onSkipClick,
  getStepId,
  renderStepActions,
  compact = false,
}: HorizontalTimelineProps) {
  return (
    <ol className="flex flex-col md:flex-row md:items-start">
      {steps.map((step, index) => {
        const skippable = Boolean(skippableIds?.has(step.id))
        const stepId = getStepId?.(step)
        const connectorComplete =
          step.status === 'completed' ||
          (index > 0 && steps[index - 1]?.status === 'completed')
        const label = getCompactLabel(step, variant)
        const isLast = index === steps.length - 1

        return (
          <li
            key={step.id}
            id={stepId}
            title={step.label}
            className={cn(
              'relative flex scroll-mt-24 md:min-w-0 md:flex-1 md:flex-col md:items-center md:gap-0',
              compact ? 'gap-2' : 'gap-2.5'
            )}
          >
            <div className="hidden w-full items-center md:flex">
              {index > 0 ? (
                <HorizontalConnector completed={connectorComplete} />
              ) : (
                <span className="min-w-0 flex-1" aria-hidden />
              )}
              <TimelineStepIcon
                step={step}
                skippable={skippable}
                onSkipClick={skippable && onSkipClick ? () => onSkipClick(step) : undefined}
                variant={variant}
              />
              {index < steps.length - 1 ? (
                <HorizontalConnector completed={step.status === 'completed'} />
              ) : (
                <span className="min-w-0 flex-1" aria-hidden />
              )}
            </div>

            <div className={cn('flex shrink-0 flex-col items-center md:hidden', compact ? 'w-5' : 'w-6')}>
              <TimelineStepIcon
                step={step}
                skippable={skippable}
                onSkipClick={skippable && onSkipClick ? () => onSkipClick(step) : undefined}
                variant={variant}
              />
              {!isLast && <VerticalConnector completed={connectorComplete} compact={compact} />}
            </div>

            <div
              className={cn(
                'min-w-0 flex-1 text-left md:mt-3 md:w-full md:px-1 md:text-center',
                isLast ? 'pb-0' : compact ? 'pb-1 md:pb-0' : 'pb-2 md:pb-0'
              )}
            >
              <p
                className={cn(
                  compact ? 'text-[10px] font-semibold leading-tight' : 'text-[11px] font-semibold leading-tight md:text-[10px]',
                  step.status === 'completed'
                    ? 'text-ink'
                    : step.status === 'active'
                      ? 'text-brand'
                      : 'text-ink-muted'
                )}
              >
                {label}
              </p>
              <StepBadges step={step} skippable={skippable} variant={variant} />
              <div className={cn(compact ? 'mt-0' : 'mt-0.5', 'md:mt-1 md:text-center')}>
                <div className="md:hidden">
                  <TimelineStepBody step={step} variant={variant} layout="vertical" compact={compact} />
                </div>
                <div className="hidden md:block">
                  <TimelineStepBody step={step} variant={variant} layout="horizontal" />
                </div>
              </div>
              {renderStepActions?.(step) && (
                <div className="mt-1.5 flex flex-col items-stretch gap-1 md:mt-2 md:gap-2">
                  {renderStepActions(step)}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
