import { Users, FolderKanban, FileClock, CalendarClock, BadgeCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { Client } from '@/types'

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
  const officialClients = clients.filter((c) => c.isOfficialClient).length
  const upcomingDeadlines = clients.reduce((acc, c) => {
    const open = c.deadlines.filter((d) => !d.completed)
    const followUp = c.followUpDate ? 1 : 0
    return acc + open.length + followUp
  }, 0)

  const cards = [
    { label: 'Total Clients', value: clients.length, icon: Users },
    { label: 'Official Clients', value: officialClients, icon: BadgeCheck },
    { label: 'Active Projects', value: activeProjects, icon: FolderKanban },
    { label: 'Pending Contracts', value: pendingContracts, icon: FileClock },
    { label: 'Upcoming Deadlines', value: upcomingDeadlines, icon: CalendarClock },
  ]

  return (
    <div className="mb-8 grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} padding="md" className="hover:shadow-lift transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">{label}</p>
              <p className="mt-2 font-display text-4xl font-semibold text-ink">{value}</p>
            </div>
            <div className="border-2 border-ink p-2.5 text-ink">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
