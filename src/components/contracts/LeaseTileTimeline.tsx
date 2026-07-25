import { InPlaceHoverText } from '@/components/ui/InPlaceHoverText'
import { cn, formatDate, formatLongDate, formatShortMonthDate } from '@/lib/utils'
import type { LeaseTermProgress } from '@/lib/clientUtils'

function daysLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** Term progress bar and ending-soon alert for lease tiles. Start date on month/bar hover. */
export function LeaseTileTimeline({ progress }: { progress: LeaseTermProgress }) {
  const hasTermDates = Boolean(progress.startDate || progress.endDate)
  const hasProgress =
    progress.percentComplete != null &&
    progress.daysElapsed != null &&
    progress.totalDays != null
  const isNotStarted = progress.state === 'Upcoming' && Boolean(progress.startDate)

  if (!hasTermDates && !hasProgress && !isNotStarted) return null

  const termLabel = [
    progress.startDate ? `Start ${formatDate(progress.startDate)}` : null,
    progress.endDate ? `End ${formatDate(progress.endDate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const showEndingAlert =
    progress.showEndingAlert && progress.daysRemaining != null

  const monthLabel =
    progress.currentMonth != null && progress.termMonths != null
      ? `Month ${progress.currentMonth} of ${progress.termMonths}`
      : null

  const startedOnLabel = progress.startDate
    ? `Started ${formatShortMonthDate(progress.startDate)}`
    : undefined

  const startsOnLabel = progress.startDate
    ? `Starts on ${formatLongDate(progress.startDate)}`
    : undefined

  const progressAriaLabel = monthLabel
    ? `Lease ${monthLabel}${
        progress.percentComplete != null ? `, ${progress.percentComplete}% complete` : ''
      }`
    : `Lease ${progress.percentComplete}% complete`

  const progressPrimary = monthLabel ?? `${progress.percentComplete}%`

  return (
    <div className="lease-tile-timeline">
      {/* Alert sits above the bar so progress stays pinned above the action row */}
      {showEndingAlert ? (
        <p className="lease-tile-timeline__ending-alert" role="status">
          {progress.daysRemaining === 0
            ? 'Ends today'
            : `${daysLabel(progress.daysRemaining!, 'day')} left`}
        </p>
      ) : null}

      {isNotStarted ? (
        <div
          className="lease-tile-timeline__not-started"
          role="status"
          aria-label={`Not started. ${startsOnLabel}`}
        >
          <span className="lease-tile-timeline__progress-pct">Not started</span>
          {startsOnLabel ? (
            <span className="lease-tile-timeline__progress-days">{startsOnLabel}</span>
          ) : null}
        </div>
      ) : hasProgress ? (
        <div className="lease-tile-timeline__progress">
          <div className="lease-tile-timeline__progress-hover">
            <div className="lease-tile-timeline__progress-meta">
              {startedOnLabel ? (
                <InPlaceHoverText
                  primary={
                    <span className="lease-tile-timeline__progress-pct">{progressPrimary}</span>
                  }
                  secondary={
                    <span className="lease-tile-timeline__progress-pct lease-tile-timeline__progress-pct--hover">
                      {startedOnLabel}
                    </span>
                  }
                  ariaLabel={`${progressAriaLabel}. ${startedOnLabel}`}
                  className="lease-tile-timeline__progress-swap justify-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                />
              ) : (
                <span className="lease-tile-timeline__progress-pct">{progressPrimary}</span>
              )}
              <span className="lease-tile-timeline__progress-days">
                {daysLabel(progress.daysElapsed!, 'day')} elapsed
              </span>
            </div>
            <div
              className="lease-tile-timeline__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percentComplete!}
              aria-label={
                startedOnLabel
                  ? `${progressAriaLabel}. ${startedOnLabel}`
                  : progressAriaLabel
              }
            >
              <div
                className={cn(
                  'lease-tile-timeline__fill',
                  showEndingAlert && 'lease-tile-timeline__fill--urgent'
                )}
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
          </div>

          {hasTermDates ? (
            <span
              className="lease-tile-timeline__term-dot"
              tabIndex={0}
              title={termLabel}
              aria-label={termLabel}
            >
              <span className="lease-tile-timeline__term-tooltip" aria-hidden>
                {progress.startDate ? (
                  <span className="lease-tile-timeline__term-tooltip-row">
                    <span className="lease-tile-timeline__term-tooltip-label">Start</span>
                    <span>{formatDate(progress.startDate)}</span>
                  </span>
                ) : null}
                {progress.endDate ? (
                  <span className="lease-tile-timeline__term-tooltip-row">
                    <span className="lease-tile-timeline__term-tooltip-label">End</span>
                    <span>{formatDate(progress.endDate)}</span>
                  </span>
                ) : null}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
