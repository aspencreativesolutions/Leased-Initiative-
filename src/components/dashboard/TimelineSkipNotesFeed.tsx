import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, GitBranch } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import { getTimelineStepLabel } from '@/lib/timelineSteps'
import { cn, formatDateTime } from '@/lib/utils'

export function TimelineSkipNotesFeed() {
  const { clients } = useApp()
  const [open, setOpen] = useState(false)

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
    <Card className="p-3 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-start justify-between gap-3 text-left',
          open && 'mb-4 border-b border-line pb-3'
        )}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="heading-display text-xl">Timeline Updates</h2>
            <span className="inline-flex items-center rounded-sm border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
              {skipNotes.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {open
              ? 'Recent timeline skips — click a note to jump to that step'
              : `${skipNotes.length} recent update${skipNotes.length !== 1 ? 's' : ''} — expand to view`}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-ink-faint">
          <GitBranch className="h-5 w-5" strokeWidth={1.75} />
          {open ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </span>
      </button>

      {open && (
        <ul className="divide-y divide-line">
          {skipNotes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/studio/clients/${note.clientId}#timeline-step-${note.timelineStepId}`}
                className="block px-1 py-3 transition-colors hover:bg-surface"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink">{note.clientName}</span>
                  <span className="text-xs text-ink-faint">
                    → {getTimelineStepLabel(note.timelineStepId!)}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDateTime(note.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted whitespace-pre-wrap">
                  {note.text}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
