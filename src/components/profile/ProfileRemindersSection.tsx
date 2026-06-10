import { useState } from 'react'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { defaultProfileReminders } from '@/data/seed'
import { generateId } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import type { ProfileReminder } from '@/types'

function resolveReminders(reminders: ProfileReminder[] | undefined): ProfileReminder[] {
  if (reminders === undefined) return defaultProfileReminders
  return reminders
}

export function ProfileRemindersSection() {
  const { settings, updateSettings } = useApp()
  const reminders = resolveReminders(settings.profileReminders)

  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)

  const persist = (next: ProfileReminder[]) => {
    updateSettings({ profileReminders: next })
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const next: ProfileReminder = {
      id: generateId(),
      text: trimmed,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
    }
    persist([next, ...reminders])
    setText('')
    setDueDate('')
    setAdding(false)
  }

  const handleDelete = (id: string) => {
    persist(reminders.filter((r) => r.id !== id))
  }

  return (
    <Card>
      <CardHeader
        title="Basic reminders"
        subtitle="Quick notes for yourself — renewals, deadlines, and admin to-dos"
        action={
          !adding ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add reminder
            </Button>
          ) : undefined
        }
      />

      {adding && (
        <form onSubmit={handleAdd} className="mb-5 space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface p-4">
          <Textarea
            label="Reminder"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="What do you need to remember?"
            required
          />
          <Input
            label="Due date (optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={!text.trim()}>
              Save reminder
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false)
                setText('')
                setDueDate('')
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {reminders.map((reminder) => (
          <li
            key={reminder.id}
            className="flex gap-3 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3"
          >
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              {reminder.dueDate && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">
                  Due {formatDate(reminder.dueDate)}
                </p>
              )}
              <p className="text-sm text-ink whitespace-pre-wrap">{reminder.text}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start"
              onClick={() => handleDelete(reminder.id)}
              aria-label="Delete reminder"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
