import { useEffect, useState } from 'react'
import { MapPinned, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { generateId } from '@/lib/storage'
import {
  normalizeAreaCodeList,
  normalizeStateList,
} from '@/lib/contractLocationFilters'
import type { ContractRegion } from '@/types'

interface EditRegionsModalProps {
  open: boolean
  onClose: () => void
}

const emptyDraft = {
  name: '',
  areaCodes: '',
  states: '',
}

export function EditRegionsModal({ open, onClose }: EditRegionsModalProps) {
  const { settings, updateSettings } = useApp()
  const regions = settings.contractRegions ?? []
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setEditingId(null)
      setDraft(emptyDraft)
      setError('')
    }
  }, [open])

  const startCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setError('')
  }

  const startEdit = (region: ContractRegion) => {
    setEditingId(region.id)
    setDraft({
      name: region.name,
      areaCodes: region.areaCodes.join(', '),
      states: region.states.join(', '),
    })
    setError('')
  }

  const persist = (next: ContractRegion[]) => {
    updateSettings({ contractRegions: next })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) {
      setError('Region name is required.')
      return
    }
    const areaCodes = normalizeAreaCodeList(draft.areaCodes)
    const states = normalizeStateList(draft.states)
    if (areaCodes.length === 0 && states.length === 0) {
      setError('Add at least one area code or state.')
      return
    }

    const nextRegion: ContractRegion = {
      id: editingId ?? generateId(),
      name,
      areaCodes,
      states,
    }

    if (editingId) {
      persist(regions.map((r) => (r.id === editingId ? nextRegion : r)))
    } else {
      persist([...regions, nextRegion])
    }

    startCreate()
  }

  const handleDelete = (id: string) => {
    persist(regions.filter((r) => r.id !== id))
    if (editingId === id) startCreate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Regions" size="lg">
      <div className="space-y-6">
        <p className="text-sm text-ink-muted">
          Define regional areas by area code and/or state, then use them to filter contracts.
        </p>

        <form onSubmit={handleSave} className="space-y-4 rounded-[var(--radius-sm)] border-2 border-line p-4">
          <h3 className="text-sm font-semibold text-ink">
            {editingId ? 'Edit region' : 'Add region'}
          </h3>
          <Input
            label="Region name"
            required
            placeholder="e.g. Metro East"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
          <Input
            label="Area codes"
            hint="Comma-separated 3-digit codes, e.g. 212, 718, 917"
            placeholder="212, 718"
            value={draft.areaCodes}
            onChange={(e) => setDraft((d) => ({ ...d, areaCodes: e.target.value }))}
          />
          <Input
            label="States"
            hint="Comma-separated abbreviations, e.g. NY, NJ, CT"
            placeholder="NY, NJ"
            value={draft.states}
            onChange={(e) => setDraft((d) => ({ ...d, states: e.target.value }))}
          />
          {error && <p className="text-sm text-accent">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            {editingId && (
              <Button type="button" variant="ghost" onClick={startCreate}>
                Cancel edit
              </Button>
            )}
            <Button type="submit">
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add region
                </>
              )}
            </Button>
          </div>
        </form>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Saved regions</h3>
          {regions.length === 0 ? (
            <p className="text-sm text-ink-faint">No regions yet. Add one above to start filtering.</p>
          ) : (
            <ul className="divide-y divide-line rounded-[var(--radius-sm)] border-2 border-line">
              {regions.map((region) => (
                <li
                  key={region.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      <MapPinned className="h-4 w-4 shrink-0 text-ink-muted" />
                      {region.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {region.areaCodes.length > 0 && (
                        <span>Area codes: {region.areaCodes.join(', ')}</span>
                      )}
                      {region.areaCodes.length > 0 && region.states.length > 0 && ' · '}
                      {region.states.length > 0 && (
                        <span>States: {region.states.join(', ')}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(region)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="!text-accent"
                      onClick={() => handleDelete(region.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
