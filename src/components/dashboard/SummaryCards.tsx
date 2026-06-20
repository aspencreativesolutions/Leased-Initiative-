import { FolderKanban, FileClock, CalendarClock, BadgeCheck, Clock } from 'lucide-react'
import type { Client } from '@/types'
import { cn } from '@/lib/utils'
import { countOfficialClients, countPendingClients } from '@/lib/clientUtils'
import type { DashboardFilter } from '@/lib/dashboardFilters'

interface SummaryCardsProps {
  clients: Client[]
  activeFilter: DashboardFilter | null
  onFilterChange: (filter: DashboardFilter | null) => void
  /** Render inside the Clients & Pending section header */
  embedded?: boolean
}

export function SummaryCards({
  clients,
  activeFilter,
  onFilterChange,
  embedded = false,
}: SummaryCardsProps) {
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

  const cards: {
    id: DashboardFilter
    label: string
    shortLabel: string
    value: number
    icon: typeof BadgeCheck
  }[] = [
    { id: 'clients', label: 'Clients', shortLabel: 'Clients', value: officialClients, icon: BadgeCheck },
    { id: 'pending', label: 'Pending Clients', shortLabel: 'Pending', value: pendingClients, icon: Clock },
    { id: 'active', label: 'Active Projects', shortLabel: 'Active', value: activeProjects, icon: FolderKanban },
    {
      id: 'contracts',
      label: 'Pending Contracts',
      shortLabel: 'Contracts',
      value: pendingContracts,
      icon: FileClock,
    },
    {
      id: 'due',
      label: 'Upcoming Deadlines',
      shortLabel: 'Due',
      value: upcomingDeadlines,
      icon: CalendarClock,
    },
  ]

  return (
    <div
      className={cn(
        'grid w-full min-w-0 grid-cols-5 gap-0.5 sm:grid-cols-2 lg:grid-cols-5',
        embedded ? 'sm:gap-1.5' : 'mb-2 sm:mb-4 sm:gap-2'
      )}
    >
      {cards.map(({ id, label, shortLabel, value, icon: Icon }) => {
        const isActive = activeFilter === id

        return (
          <button
            key={id}
            type="button"
            onClick={() => onFilterChange(isActive ? null : id)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center justify-between gap-1 rounded-[var(--radius-sm)] text-left transition-colors',
              'border-2 bg-surface-paper',
              embedded
                ? 'max-sm:flex-col max-sm:justify-center max-sm:px-0.5 max-sm:py-1 max-sm:text-center sm:gap-1.5 sm:px-2 sm:py-1.5 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)]'
                : 'max-sm:flex-col max-sm:justify-center max-sm:px-0.5 max-sm:py-1 max-sm:text-center sm:gap-2 sm:px-2.5 sm:py-2 shadow-[1px_1px_0_0_rgba(17,17,17,0.85)] sm:shadow-[3px_3px_0_0_rgba(17,17,17,0.85)]',
              isActive
                ? 'border-brand bg-brand/10 ring-1 ring-brand ring-offset-0 sm:ring-2 sm:ring-offset-1 sm:ring-offset-surface'
                : 'border-ink hover:border-brand/50 hover:bg-surface'
            )}
          >
            <div className="min-w-0 max-sm:w-full">
              <p className="truncate text-[8px] font-black uppercase leading-none tracking-[0.06em] text-ink sm:text-[9px] sm:leading-tight sm:tracking-[0.14em]">
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </p>
              <div
                className={cn(
                  'summary-stat-icon mt-0.5 flex shrink-0 items-center max-sm:justify-center sm:mt-1',
                  isActive && 'summary-stat-icon--active'
                )}
              >
                <Icon
                  className={cn(embedded ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5')}
                  strokeWidth={2.5}
                />
              </div>
            </div>
            <p
              className={cn(
                'shrink-0 font-display text-sm font-black leading-none tracking-tight text-ink sm:text-2xl',
                embedded ? 'max-sm:mt-0.5' : 'max-sm:mt-0.5'
              )}
            >
              {value}
            </p>
          </button>
        )
      })}
    </div>
  )
}
