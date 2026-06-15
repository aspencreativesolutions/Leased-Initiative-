import { useState } from 'react'
import { StickyNote, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { generateId } from '@/lib/storage'
import { loadSchedulerNotes, saveSchedulerNotes } from '@/lib/schedulerStorage'
import type { SchedulerNote } from '@/types'
import { cn } from '@/lib/utils'

interface SchedulerNotesSidebarProps {
  weekStart: string
  collapsed: boolean
  onToggle: () => void
}

export function SchedulerNotesSidebar({
  weekStart,
  collapsed,
  onToggle,
}: SchedulerNotesSidebarProps) {
  const [notes, setNotes] = useState<SchedulerNote[]>(() => loadSchedulerNotes())
  const [draft, setDraft] = useState('')

  const weekNotes = notes.filter((n) => !n.weekStart || n.weekStart === weekStart)
  const otherNotes = notes.filter((n) => n.weekStart && n.weekStart !== weekStart)

  const persist = (next: SchedulerNote[]) => {
    setNotes(next)
    saveSchedulerNotes(next)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    persist([
      {
        id: generateId(),
        text: draft.trim(),
        createdAt: new Date().toISOString(),
        weekStart,
      },
      ...notes,
    ])
    setDraft('')
  }

  if (collapsed) {
    return (
      <div className="shrink-0">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-sm border-2 border-ink bg-surface-paper px-2 py-4 text-ink-muted hover:border-accent hover:text-accent transition-colors"
          aria-label="Open notes sidebar"
        >
          <PanelRightOpen className="h-5 w-5" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-caps [writing-mode:vertical-rl] rotate-180">
            Notes
          </span>
        </button>
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col rounded-sm border-2 border-ink bg-surface-paper lg:w-72',
        'max-h-[calc(100vh-12rem)] lg:max-h-none'
      )}
    >
      <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-3 text-surface-paper">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4" strokeWidth={2} />
          <h2 className="font-display text-base font-semibold">Notes</h2>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-sm border-2 border-transparent p-1.5 hover:border-surface-paper/40"
          aria-label="Collapse notes sidebar"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleAdd} className="border-b-2 border-line p-3">
        <Textarea
          label="Quick note"
          placeholder="Quick note while scheduling…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <Button type="submit" size="sm" className="mt-2 w-full" disabled={!draft.trim()}>
          Add Note
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {weekNotes.length === 0 ? (
          <p className="text-xs text-ink-faint text-center py-6">No notes for this week yet.</p>
        ) : (
          weekNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-sm border-2 border-line bg-surface p-3 text-sm text-ink"
            >
              <p className="whitespace-pre-wrap">{note.text}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
        {otherNotes.length > 0 && (
          <p className="pt-2 label-caps">
            {otherNotes.length} from other weeks
          </p>
        )}
      </div>
    </aside>
  )
}
