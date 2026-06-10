import { cn, formatDateTime } from '@/lib/utils'
import type { ProjectTimelineStep } from '@/types'

interface TimelineStepBodyProps {
  step: ProjectTimelineStep
  /** Portal uses softer timestamp styling */
  variant?: 'admin' | 'portal'
  layout?: 'vertical' | 'horizontal'
}

function Timestamp({
  label,
  value,
  variant,
  horizontal,
}: {
  label: string
  value: string
  variant: 'admin' | 'portal'
  horizontal: boolean
}) {
  return (
    <p
      className={
        horizontal
          ? 'text-[8px] leading-tight text-ink-muted break-words md:text-[9px] md:leading-snug'
          : variant === 'portal'
            ? 'mt-0.5 text-xs text-ink-muted'
            : 'mt-0.5 text-xs font-medium text-ink-muted'
      }
    >
      <span className="text-ink-faint">{label}: </span>
      {formatDateTime(value)}
    </p>
  )
}

export function TimelineStepBody({
  step,
  variant = 'admin',
  layout = 'vertical',
}: TimelineStepBodyProps) {
  const horizontal = layout === 'horizontal'

  return (
    <>
      {step.completedAt && (
        <Timestamp
          label={step.skipped ? 'Skipped' : 'Completed'}
          value={step.completedAt}
          variant={variant}
          horizontal={horizontal}
        />
      )}

      {step.status === 'active' && step.waitingSince && (
        <Timestamp
          label="Waiting since"
          value={step.waitingSince}
          variant={variant}
          horizontal={horizontal}
        />
      )}

      {step.detail && (
        <p
          className={
            horizontal
              ? 'mt-0.5 line-clamp-2 text-[8px] leading-tight text-ink-muted md:mt-1 md:line-clamp-3 md:text-[9px]'
              : 'mt-1 text-sm text-ink-muted'
          }
        >
          {step.detail}
        </p>
      )}

      {step.subEvents && step.subEvents.length > 0 && (
        <ul
          className={
            horizontal
              ? 'mt-1 max-h-16 space-y-1 overflow-y-auto rounded-sm border border-line bg-surface/50 p-1 md:mt-2 md:max-h-24 md:space-y-1.5 md:p-1.5'
              : 'mt-3 space-y-2 border-l-2 border-brand/20 pl-3'
          }
        >
          {step.subEvents.map((event) => (
            <li key={event.id} className={horizontal ? 'text-[10px]' : 'text-sm'}>
              <p className="font-medium text-ink">{event.label}</p>
              {event.detail && (
                <p className={cn('text-ink-muted', horizontal ? 'line-clamp-2' : 'mt-0.5')}>
                  {event.detail}
                </p>
              )}
              <p className={horizontal ? 'text-ink-muted' : 'mt-0.5 text-xs text-ink-muted'}>
                <span className="text-ink-faint">Completed: </span>
                {formatDateTime(event.completedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
