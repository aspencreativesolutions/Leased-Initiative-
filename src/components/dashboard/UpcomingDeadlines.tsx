import { Link } from 'react-router-dom'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn, formatDate, getDeadlineUrgency, type DeadlineUrgency } from '@/lib/utils'
import type { Client } from '@/types'

interface DeadlineItem {
  clientId: string
  clientName: string
  label: string
  date: string
  urgency: DeadlineUrgency
}

function collectDeadlines(clients: Client[]): DeadlineItem[] {
  const items: DeadlineItem[] = []

  for (const client of clients) {
    if (client.followUpDate && !client.deadlines.some((d) => d.type === 'follow-up' && d.date === client.followUpDate)) {
      items.push({
        clientId: client.id,
        clientName: client.name,
        label: 'Follow-up',
        date: client.followUpDate,
        urgency: getDeadlineUrgency({ id: '', type: 'follow-up', date: client.followUpDate, label: 'Follow-up' }),
      })
    }
    for (const d of client.deadlines) {
      if (d.completed) continue
      items.push({
        clientId: client.id,
        clientName: client.name,
        label: d.label,
        date: d.date,
        urgency: getDeadlineUrgency(d),
      })
    }
  }

  return items
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
}

const urgencyIcon = {
  overdue: AlertCircle,
  'due-soon': Clock,
  upcoming: Clock,
  completed: CheckCircle2,
}

const urgencyStyle = {
  overdue: 'border-2 border-accent bg-accent text-white',
  'due-soon': 'border-2 border-ink bg-ink text-surface-paper',
  upcoming: 'border-2 border-line bg-transparent text-ink',
  completed: 'border-2 border-line bg-transparent text-ink-faint',
}

export function UpcomingDeadlines({ clients }: { clients: Client[] }) {
  const deadlines = collectDeadlines(clients)

  return (
    <Card>
      <CardHeader title="Upcoming Deadlines" subtitle="Next important dates across clients" />
      {deadlines.length === 0 ? (
        <p className="text-sm text-ink-muted">No upcoming deadlines. You&apos;re all caught up.</p>
      ) : (
        <ul className="space-y-2">
          {deadlines.map((item, i) => {
            const Icon = urgencyIcon[item.urgency]
            return (
              <li key={`${item.clientId}-${item.date}-${i}`}>
                <Link
                  to={`/clients/${item.clientId}`}
                  className="flex items-center gap-3 rounded-sm border-2 border-line p-3 transition-colors hover:border-ink hover:bg-surface"
                >
                  <div className={cn('rounded-sm p-2', urgencyStyle[item.urgency])}>
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
                    <p className="text-xs text-ink-muted">{item.clientName}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-caps text-ink">
                    {formatDate(item.date)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
