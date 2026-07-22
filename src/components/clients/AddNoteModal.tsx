import { useState } from 'react'
import { StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import type { NoteCategory } from '@/types'

const categories: NoteCategory[] = ['General', 'Payment', 'Contract', 'Project', 'Follow-Up']

export function AddNoteModal({
  open,
  onClose,
  clientId,
}: {
  open: boolean
  onClose: () => void
  clientId: string
}) {
  const { addNote } = useApp()
  const [text, setText] = useState('')
  const [category, setCategory] = useState<NoteCategory>('General')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    addNote(clientId, { text: text.trim(), category })
    setText('')
    setCategory('General')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as NoteCategory)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'Contract' ? 'Lease' : c}
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
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <StickyNote className="h-4 w-4" />
            Save Note
          </Button>
        </div>
      </form>
    </Modal>
  )
}
