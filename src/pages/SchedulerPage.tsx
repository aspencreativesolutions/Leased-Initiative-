import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw, CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { WeeklySchedulerGrid } from '@/components/scheduler/WeeklySchedulerGrid'
import { SchedulerNotesSidebar } from '@/components/scheduler/SchedulerNotesSidebar'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { useApp } from '@/context/AppContext'
import {
  addWeeks,
  countScheduledClients,
  countScheduledTasks,
  formatWeekRange,
  generateWeekSchedule,
  getMondayOfWeek,
  formatWeekStart,
  tierCounts,
} from '@/lib/scheduler'
import { loadWeekSchedule, saveWeekSchedule } from '@/lib/schedulerStorage'
import { SERVICE_TIERS } from '@/lib/serviceTiers'
import type { WeekSchedule } from '@/types'

export function SchedulerPage() {
  const { clients, contracts } = useApp()
  const [weekStart, setWeekStart] = useState(() => formatWeekStart(getMondayOfWeek()))
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null)
  const [notesCollapsed, setNotesCollapsed] = useState(false)

  const regenerate = useCallback(() => {
    const next = generateWeekSchedule(weekStart, clients, contracts)
    saveWeekSchedule(next)
    setSchedule(next)
  }, [weekStart, clients, contracts])

  useEffect(() => {
    const cached = loadWeekSchedule(weekStart)
    if (cached) {
      setSchedule(cached)
    } else {
      const next = generateWeekSchedule(weekStart, clients, contracts)
      saveWeekSchedule(next)
      setSchedule(next)
    }
  }, [weekStart, clients, contracts])

  const handleScheduleChange = useCallback((next: WeekSchedule) => {
    saveWeekSchedule(next)
    setSchedule(next)
  }, [])

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
            Weekly Scheduler
            <span className="font-display text-lg font-semibold text-ink sm:text-xl">
              {formatWeekRange(weekStart)}
            </span>
          </span>
        }
        subtitle="Mon–Fri, 9:00 a.m. – 4:00 p.m. · Prioritized by service tier and deadlines"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/calendar">
              <Button variant="outline" size="sm">
                <CalendarDays className="h-4 w-4" />
                Deadlines
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={regenerate}>
              <RefreshCw className="h-4 w-4" />
              Regenerate Week
            </Button>
          </div>
        }
      />

      <Card className="mb-4" padding="sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              aria-label="Next week"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setWeekStart(formatWeekStart(getMondayOfWeek()))}
              >
                This Week{stats ? ` - ${stats.tasks}` : ''}
              </Button>
            </div>
          </div>

          {stats && (
            <div className="flex flex-col gap-1 text-xs text-ink-muted">
              <span>{stats.clients} clients scheduled</span>
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {schedule ? (
            <WeeklySchedulerGrid schedule={schedule} onScheduleChange={handleScheduleChange} />
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
    </>
  )
}
