import { Link } from 'react-router-dom'
import { Calendar, AlertCircle, Clock, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn, formatDate, getDeadlineUrgency } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import type { Client, Deadline } from '@/types'

interface CalendarItem {
  client: Client
  deadline: Deadline | { type: 'follow-up'; date: string; label: string; id: string }
}

export function CalendarPage() {
  const { clients } = useApp()

  const items: CalendarItem[] = []
  for (const client of clients) {
    if (client.followUpDate) {
      items.push({
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
      if (!d.completed) items.push({ client, deadline: d })
    }
  }

  items.sort((a, b) => a.deadline.date.localeCompare(b.deadline.date))

const urgencyStyle = {
  overdue: 'border-2 border-accent bg-accent-light',
  'due-soon': 'border-2 border-ink bg-surface',
  upcoming: 'border-2 border-line bg-surface-paper',
  completed: 'border-2 border-line bg-transparent',
}

  const urgencyIcon = {
    overdue: AlertCircle,
    'due-soon': Clock,
    upcoming: Calendar,
    completed: Calendar,
  }

  return (
    <>
      <PageHeader
        title="Calendar & Deadlines"
        subtitle="All follow-ups, project deadlines, and payment dates."
        action={
          <Link to="/scheduler">
            <Button variant="outline" size="sm">
              <CalendarClock className="h-4 w-4" />
              Weekly Scheduler
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader title="All Deadlines" subtitle="Sorted by date" />
        {items.length === 0 ? (
          <p className="text-sm text-ink-muted">No deadlines scheduled.</p>
        ) : (
          <ul className="space-y-3">
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
                    to={`/clients/${client.id}`}
                    className={cn(
                      'flex items-center gap-4 rounded-sm border-2 p-4 transition-colors hover:border-ink hover:bg-surface',
                      urgencyStyle[urgency]
                    )}
                  >
                    <div className="rounded-sm border-2 border-ink bg-ink p-2 text-surface-paper">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{deadline.label}</p>
                      <p className="text-sm text-ink-muted">
                        {client.name} · {client.businessName}
                      </p>
                      {'notes' in deadline && deadline.notes && (
                        <p className="mt-1 text-xs text-ink-faint">{deadline.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold uppercase tracking-caps text-ink">
                        {formatDate(deadline.date)}
                      </p>
                      <p className="text-[10px] uppercase tracking-caps text-ink-faint">{urgency.replace('-', ' ')}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
