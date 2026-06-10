import { Card, CardHeader } from '@/components/ui/Card'
import {
  DeadlineGalleryCard,
  type DeadlineGalleryItem,
} from '@/components/dashboard/DeadlineGalleryCard'
import { getClientServiceTier } from '@/lib/clientUtils'
import { getDeadlineTimestamp } from '@/lib/deadlineDetails'
import { getDeadlineUrgency } from '@/lib/utils'
import type { Client, Deadline } from '@/types'

function collectDeadlines(clients: Client[]): DeadlineGalleryItem[] {
  const items: DeadlineGalleryItem[] = []

  for (const client of clients) {
    const serviceTier = getClientServiceTier(client)

    if (
      client.followUpDate &&
      !client.deadlines.some((d) => d.type === 'follow-up' && d.date === client.followUpDate)
    ) {
      const deadline: Deadline = {
        id: `follow-up-${client.id}`,
        type: 'follow-up',
        date: client.followUpDate,
        label: 'Follow-up',
      }
      items.push({
        id: deadline.id,
        clientId: client.id,
        clientName: client.name,
        projectName: client.projectName,
        serviceTier,
        deadline,
        urgency: getDeadlineUrgency(deadline),
      })
    }

    for (const d of client.deadlines) {
      if (d.completed) continue
      items.push({
        id: `${client.id}-${d.id}`,
        clientId: client.id,
        clientName: client.name,
        projectName: client.projectName,
        serviceTier,
        deadline: d,
        urgency: getDeadlineUrgency(d),
      })
    }
  }

  return items.sort((a, b) => getDeadlineTimestamp(a.deadline) - getDeadlineTimestamp(b.deadline))
}

export function UpcomingDeadlines({ clients }: { clients: Client[] }) {
  const deadlines = collectDeadlines(clients)

  return (
    <Card>
      <CardHeader
        title="Upcoming Deadlines"
        subtitle="Sorted by nearest date — expand a card for meeting links and prep details"
      />
      {deadlines.length === 0 ? (
        <p className="text-sm text-ink-muted">No upcoming deadlines. You&apos;re all caught up.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {deadlines.map((item) => (
            <DeadlineGalleryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  )
}
