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
  formatWeekRange,
  generateWeekSchedule,
  getMondayOfWeek,
  formatWeekStart,
  tierCounts,
} from '@/lib/scheduler'
import { loadWeekSchedule, saveWeekSchedule } from '@/lib/schedulerStorage'
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

  const stats = useMemo(() => {
    if (!schedule) return null
    return {
      clients: countScheduledClients(schedule),
      tiers: tierCounts(schedule),
    }
  }, [schedule])

  return (
    <>
      <PageHeader
        title="Weekly Scheduler"
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

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[200px] text-center font-display text-lg font-semibold text-ink">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(formatWeekStart(getMondayOfWeek()))}
            >
              This Week
            </Button>
          </div>

          {stats && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <span>{stats.clients} clients scheduled</span>
              <span className="text-line">|</span>
              <span className="flex items-center gap-1.5">
                Priority:
                <ServiceTierBadge tier="Premium Custom" small />
                {stats.tiers['Premium Custom']}
                <ServiceTierBadge tier="Business" small />
                {stats.tiers.Business}
                <ServiceTierBadge tier="Starter" small />
                {stats.tiers.Starter}
              </span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-ink-faint">
          Premium Custom → Business → Starter. Lunch 12–1 p.m. · 15 min buffers between blocks.
          Set <strong>Service Tier</strong> in each client&apos;s contract template.
        </p>
      </Card>

      <div className="flex gap-4 items-start">
        <div className="min-w-0 flex-1">
          {schedule ? (
            <WeeklySchedulerGrid schedule={schedule} />
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
