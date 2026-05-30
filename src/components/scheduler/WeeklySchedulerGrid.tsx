import { Link } from 'react-router-dom'
import { cn, formatDate } from '@/lib/utils'
import { ServiceTierBadge } from './ServiceTierBadge'
import { DAILY_TIMELINE, getDayLabels } from '@/lib/scheduler'
import type { ScheduleBlock, WeekSchedule } from '@/types'

interface WeeklySchedulerGridProps {
  schedule: WeekSchedule
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return `${fmt(start)} – ${fmt(end)}`
}

function blockForDay(schedule: WeekSchedule, dayIndex: number, startTime: string): ScheduleBlock | undefined {
  return schedule.blocks.find((b) => b.dayIndex === dayIndex && b.startTime === startTime)
}

const tierBlockStyle = {
  'Premium Custom': 'border-ink bg-ink text-surface-paper hover:bg-brand-light',
  Business: 'border-ink-muted bg-surface hover:border-ink',
  Starter: 'border-line bg-surface-paper hover:border-ink-muted',
}

export function WeeklySchedulerGrid({ schedule }: WeeklySchedulerGridProps) {
  const days = getDayLabels()
  const weekDates = days.map((_, i) => {
    const d = new Date(schedule.weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  return (
    <div className="overflow-x-auto rounded-sm border-2 border-ink/10 bg-surface-paper">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink bg-ink text-surface-paper">
            <th className="sticky left-0 z-10 bg-ink px-3 py-3 text-left label-caps !text-surface-paper/70 w-28">
              Time
            </th>
            {days.map((day, i) => (
              <th key={day} className="px-2 py-3 text-left min-w-[140px]">
                <div className="font-display text-base font-semibold">{day}</div>
                <div className="text-[10px] font-semibold uppercase tracking-caps text-surface-paper/50">
                  {weekDates[i]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAILY_TIMELINE.map((row) => (
            <tr key={row.startTime} className="border-b border-line">
              <td className="sticky left-0 z-10 bg-surface-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-caps text-ink-faint whitespace-nowrap border-r-2 border-line">
                {formatTimeRange(row.startTime, row.endTime)}
              </td>
              {days.map((_, dayIndex) => {
                const block = blockForDay(schedule, dayIndex, row.startTime)!
                if (block.blockType === 'lunch') {
                  return (
                    <td key={dayIndex} className="px-2 py-1.5">
                      <div className="rounded-sm border-2 border-line bg-surface px-2 py-2 text-center text-[10px] font-bold uppercase tracking-caps text-ink-muted">
                        Lunch
                      </div>
                    </td>
                  )
                }
                if (block.blockType === 'buffer') {
                  return (
                    <td key={dayIndex} className="px-2 py-1">
                      <div className="flex h-8 items-center justify-center rounded-sm border border-dashed border-line text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
                        —
                      </div>
                    </td>
                  )
                }
                const hasClient = Boolean(block.clientId)
                const tierClass = block.serviceTier
                  ? tierBlockStyle[block.serviceTier]
                  : ''
                return (
                  <td key={dayIndex} className="px-2 py-1.5">
                    {hasClient ? (
                      <Link
                        to={`/clients/${block.clientId}`}
                        className={cn(
                          'block rounded-sm border-2 px-2 py-2 transition-colors',
                          tierClass
                        )}
                      >
                        <p className="font-semibold text-xs leading-tight truncate">
                          {block.businessName}
                        </p>
                        <p
                          className={cn(
                            'text-[11px] truncate mt-0.5',
                            block.serviceTier === 'Premium Custom'
                              ? 'text-surface-paper/80'
                              : 'text-ink-muted'
                          )}
                        >
                          {block.label}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {block.serviceTier && block.serviceTier !== 'Premium Custom' && (
                            <ServiceTierBadge tier={block.serviceTier} small />
                          )}
                          {block.deadlineDate && (
                            <span
                              className={cn(
                                'text-[10px] uppercase tracking-caps',
                                block.serviceTier === 'Premium Custom'
                                  ? 'text-surface-paper/60'
                                  : 'text-ink-faint'
                              )}
                            >
                              Due {formatDate(block.deadlineDate)}
                            </span>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex h-[72px] items-center justify-center rounded-sm border-2 border-dashed border-line text-[10px] font-semibold uppercase tracking-caps text-ink-faint/50">
                        Open
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
