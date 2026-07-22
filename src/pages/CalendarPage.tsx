import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, AlertCircle, Clock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { MobileWeeklyScheduler } from '@/components/scheduler/MobileWeeklyScheduler'
import { WeeklySchedulerGrid } from '@/components/scheduler/WeeklySchedulerGrid'
import { SchedulerNotesSidebar } from '@/components/scheduler/SchedulerNotesSidebar'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { cn, formatDate, getDeadlineUrgency } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import {
  addWeeks,
  countScheduledClients,
  countScheduledTasks,
  formatWeekRange,
  formatWeekStart,
  generateWeekSchedule,
  getMondayOfWeek,
  tierCounts,
} from '@/lib/scheduler'
import { loadWeekSchedule, saveWeekSchedule } from '@/lib/schedulerStorage'
import { SERVICE_TIERS } from '@/lib/serviceTiers'
import type { Client, Deadline, WeekSchedule } from '@/types'

interface CalendarItem {
  client: Client
  deadline: Deadline | { type: 'follow-up'; date: string; label: string; id: string }
}

const urgencyStyle = {
  overdue: 'border-accent bg-accent-light',
  'due-soon': 'border-ink bg-surface',
  upcoming: 'border-line bg-surface-paper',
  completed: 'border-line bg-transparent',
}

const urgencyIcon = {
  overdue: AlertCircle,
  'due-soon': Clock,
  upcoming: Calendar,
  completed: Calendar,
}

export function CalendarPage() {
  const { clients, contracts } = useApp()
  const [weekStart, setWeekStart] = useState(() => formatWeekStart(getMondayOfWeek()))
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [notesCollapsed, setNotesCollapsed] = useState(false)

  useEffect(() => {
    const cached = loadWeekSchedule(weekStart)
    if (cached) {
      setSchedule(cached)
    } else {
      const next = generateWeekSchedule(weekStart, clients, contracts)
      saveWeekSchedule(next)
      setSchedule(next)
    }
    setSelectedDayIndex(null)
  }, [weekStart, clients, contracts])

  const handleScheduleChange = useCallback((next: WeekSchedule) => {
    saveWeekSchedule(next)
    setSchedule(next)
  }, [])

  const items: CalendarItem[] = useMemo(() => {
    const collected: CalendarItem[] = []
    for (const client of clients) {
      if (client.followUpDate) {
        collected.push({
          client,
          deadline: {
            id: 'follow-up',
            type: 'follow-up',
            date: client.followUpDate,
            label: 'Follow-up',
          },
        })
      }
      for (const d of client.deadlines) {
        if (!d.completed) collected.push({ client, deadline: d })
      }
    }
    collected.sort((a, b) => a.deadline.date.localeCompare(b.deadline.date))
    return collected
  }, [clients])

  const regenerate = useCallback(() => {
    const next = generateWeekSchedule(weekStart, clients, contracts)
    saveWeekSchedule(next)
    setSchedule(next)
  }, [weekStart, clients, contracts])

  const stats = useMemo(() => {
    if (!schedule) return null
    return {
      clients: countScheduledClients(schedule),
      tasks: countScheduledTasks(schedule),
      tiers: tierCounts(schedule),
    }
  }, [schedule])

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            Calendar
            <span className="font-display text-lg font-semibold text-ink sm:text-xl">
              {formatWeekRange(weekStart)}
            </span>
          </span>
        }
        subtitle="Appointments, lease timelines, and deadlines in one place. Mon–Fri, 9:00 a.m. – 4:00 p.m."
        action={
          <Button variant="outline" size="sm" onClick={regenerate}>
            <RefreshCw className="h-4 w-4" />
            Regenerate Week
          </Button>
        }
      />

      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart((w) => addWeeks(w, -1))}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-0 truncate text-center text-sm font-semibold text-ink sm:text-base">
                {formatWeekRange(weekStart)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(formatWeekStart(getMondayOfWeek()))}
            >
              This Week{stats ? ` · ${stats.tasks}` : ''}
            </Button>
          </div>

          {stats && (
            <div className="flex flex-col gap-1 text-xs text-ink-muted">
              <span>{stats.clients} tenants scheduled</span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[10px] font-medium text-ink-faint">Priority</span>
                {SERVICE_TIERS.map((tier) => (
                  <div key={tier} className="flex items-center gap-1">
                    <ServiceTierBadge tier={tier} tiny />
                    <span className="text-[10px] tabular-nums">{stats.tiers[tier]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {schedule ? (
            <>
              <div className="md:hidden">
                <Card className="p-3">
                  <MobileWeeklyScheduler
                    schedule={schedule}
                    onDaySelect={setSelectedDayIndex}
                    onScheduleChange={handleScheduleChange}
                  />
                </Card>
              </div>
              <div className="hidden md:block">
                <WeeklySchedulerGrid schedule={schedule} onScheduleChange={handleScheduleChange} />
              </div>
            </>
          ) : (
            <div className="rounded-sm border-2 border-line bg-surface-paper p-12 text-center text-ink-muted">
              Building schedule…
            </div>
          )}
        </div>
        <SchedulerNotesSidebar
          weekStart={weekStart}
          collapsed={notesCollapsed}
          onToggle={() => setNotesCollapsed((c) => !c)}
        />
      </div>

      {selectedDayIndex === null && (
        <Card>
          <CardHeader title="All Deadlines" subtitle="Lease timelines and follow-ups, sorted by date" dense />
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">No deadlines scheduled.</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map(({ client, deadline }) => {
                const urgency = getDeadlineUrgency(
                  'completed' in deadline && deadline.completed
                    ? deadline
                    : { ...deadline, completed: false }
                )
                const Icon = urgencyIcon[urgency]
                return (
                  <li key={`${client.id}-${deadline.id}-${deadline.date}`}>
                    <Link
                      to={`/studio/clients/${client.id}`}
                      className={cn(
                        'flex items-center gap-2 rounded-sm border p-2 transition-colors hover:border-ink hover:bg-surface',
                        urgencyStyle[urgency]
                      )}
                    >
                      <div className="rounded-sm border border-ink bg-ink p-1 text-surface-paper">
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight text-ink">{deadline.label}</p>
                        <p className="text-xs leading-snug text-ink-muted">
                          {client.name} · {client.businessName}
                        </p>
                        {'notes' in deadline && deadline.notes && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-faint">{deadline.notes}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-caps text-ink">
                          {formatDate(deadline.date)}
                        </p>
                        <p className="text-[9px] uppercase tracking-caps text-ink-faint">
                          {urgency.replace('-', ' ')}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}
    </>
  )
}
