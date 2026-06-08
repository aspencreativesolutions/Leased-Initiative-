import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import { getTimelineStepLabel } from '@/lib/timelineSteps'
import { formatDate } from '@/lib/utils'

export function TimelineSkipNotesFeed() {
  const { clients } = useApp()

  const skipNotes = useMemo(() => {
    return clients
      .flatMap((client) =>
        (client.notes ?? [])
          .filter((note) => note.timelineStepId)
          .map((note) => ({
            ...note,
            clientId: client.id,
            clientName: client.name,
            projectName: client.projectName,
          }))
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 8)
  }, [clients])

  if (skipNotes.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader
        title="Timeline Updates"
        subtitle="Recent timeline skips — click a note to jump to that step"
        action={<GitBranch className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />}
      />
      <ul className="divide-y divide-line">
        {skipNotes.map((note) => (
          <li key={note.id}>
            <Link
              to={`/clients/${note.clientId}#timeline-step-${note.timelineStepId}`}
              className="block px-1 py-3 transition-colors hover:bg-surface"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold text-ink">{note.clientName}</span>
                <span className="text-xs text-ink-faint">
                  → {getTimelineStepLabel(note.timelineStepId!)}
                </span>
                <span className="text-xs text-ink-muted">{formatDate(note.createdAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted whitespace-pre-wrap">
                {note.text}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
