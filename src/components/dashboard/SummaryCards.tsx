import { FolderKanban, FileClock, CalendarClock, BadgeCheck, Clock } from 'lucide-react'
import type { Client } from '@/types'
import { cn } from '@/lib/utils'
import { countOfficialClients, countPendingClients } from '@/lib/clientUtils'

interface SummaryCardsProps {
  clients: Client[]
}

export function SummaryCards({ clients }: SummaryCardsProps) {
  const activeProjects = clients.filter(
    (c) => c.projectStatus === 'In Progress' || c.projectStatus === 'Contract Sent'
  ).length
  const pendingContracts = clients.filter(
    (c) =>
      c.contractStatus === 'Not Started' ||
      c.contractStatus === 'Draft in Progress' ||
      c.contractStatus === 'Generated' ||
      c.contractStatus === 'Sent'
  ).length
  const officialClients = countOfficialClients(clients)
  const pendingClients = countPendingClients(clients)
  const upcomingDeadlines = clients.reduce((acc, c) => {
    const open = c.deadlines.filter((d) => !d.completed)
    const followUp = c.followUpDate ? 1 : 0
    return acc + open.length + followUp
  }, 0)

  const cards = [
    { label: 'Clients', value: officialClients, icon: BadgeCheck },
    { label: 'Pending Clients', value: pendingClients, icon: Clock },
    { label: 'Active Projects', value: activeProjects, icon: FolderKanban },
    { label: 'Pending Contracts', value: pendingContracts, icon: FileClock },
    { label: 'Upcoming Deadlines', value: upcomingDeadlines, icon: CalendarClock },
  ]

  return (
    <div className="mb-4 grid w-full min-w-0 grid-cols-2 gap-2 lg:grid-cols-5">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className={cn(
            'flex items-center justify-between gap-2 rounded-[var(--radius-sm)]',
            'border-2 border-ink bg-surface-paper px-2.5 py-2',
            'shadow-[3px_3px_0_0_rgba(17,17,17,0.85)]'
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-ink">
              {label}
            </p>
            <p className="font-display text-2xl font-black leading-none tracking-tight text-ink">
              {value}
            </p>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink bg-ink text-surface-paper">
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
        </div>
      ))}
    </div>
  )
}
