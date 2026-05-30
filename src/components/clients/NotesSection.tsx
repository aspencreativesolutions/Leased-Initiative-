import { useState } from 'react'
import { StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select, Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { formatDate } from '@/lib/utils'
import type { Client, NoteCategory } from '@/types'

const categories: NoteCategory[] = ['General', 'Payment', 'Contract', 'Project', 'Follow-Up']

const categoryColors: Record<NoteCategory, string> = {
  General: 'bg-stone-100 text-stone-600',
  Payment: 'bg-sky-50 text-sky-700',
  Contract: 'bg-indigo-50 text-indigo-700',
  Project: 'bg-blue-50 text-blue-700',
  'Follow-Up': 'bg-orange-50 text-orange-700',
}

export function NotesSection({ client }: { client: Client }) {
  const { addNote } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [text, setText] = useState('')
  const [category, setCategory] = useState<NoteCategory>('General')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    addNote(client.id, { text: text.trim(), category })
    setText('')
    setCategory('General')
    setModalOpen(false)
  }

  const sortedNotes = [...client.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <>
      <Card>
        <CardHeader
          title="Notes"
          subtitle="Internal notes and timeline"
          action={
            <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
              Add Note
            </Button>
          }
        />
        {sortedNotes.length === 0 ? (
          <p className="text-sm text-stone-500">No notes yet. Add one to track important details.</p>
        ) : (
          <ul className="space-y-3">
            {sortedNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-stone-100 bg-stone-50/50 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {note.category && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[note.category]}`}
                    >
                      {note.category}
                    </span>
                  )}
                  <span className="text-xs text-stone-400">{formatDate(note.createdAt.split('T')[0])}</span>
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{note.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Note">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as NoteCategory)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Textarea
            label="Note"
            required
            placeholder="Write your note..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <StickyNote className="h-4 w-4" />
              Save Note
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
