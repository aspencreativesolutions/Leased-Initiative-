import { useEffect, useMemo, useState } from 'react'
import { MapPinned, Pencil, Plus, Trash2, X } from 'lucide-react'
import { RegionRadiusMapPicker } from '@/components/contracts/RegionRadiusMapPicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import {
  contractMatchesLocationFilter,
  formatGroupCriteriaLines,
  formatGroupCriteriaSummary,
  formatStateName,
  getAddressState,
  isValidRegionRadius,
  normalizeAreaCodeList,
  regionHasCriteria,
  US_STATES,
} from '@/lib/contractLocationFilters'
import { generateId } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { ContractRegion, ContractRegionRadius, Property } from '@/types'

interface EditRegionsModalProps {
  open: boolean
  onClose: () => void
}

const cardClass =
  'space-y-3 rounded-[var(--radius-sm)] border-2 border-line bg-surface-paper p-4'

function countMatchingProperties(group: ContractRegion, properties: Property[]): number {
  return properties.filter((property) => {
    const state =
      property.addressDetails?.state?.trim().toUpperCase() ||
      getAddressState(property.address)
    return contractMatchesLocationFilter(
      {
        areaCode: null,
        state,
        lat: property.addressDetails?.lat ?? null,
        lng: property.addressDetails?.lng ?? null,
      },
      { kind: 'region', value: group.id },
      [group]
    )
  }).length
}

export function EditRegionsModal({ open, onClose }: EditRegionsModalProps) {
  const { settings, updateSettings, properties } = useApp()
  const groups = settings.contractRegions ?? []
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [states, setStates] = useState<string[]>([])
  const [areaCodes, setAreaCodes] = useState<string[]>([])
  const [areaCodeDraft, setAreaCodeDraft] = useState('')
  const [radius, setRadius] = useState<ContractRegionRadius | undefined>(undefined)
  const [error, setError] = useState('')
  const [stateQuery, setStateQuery] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setStates([])
    setAreaCodes([])
    setAreaCodeDraft('')
    setRadius(undefined)
    setError('')
    setStateQuery('')
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  const startCreate = () => {
    resetForm()
  }

  const startEdit = (group: ContractRegion) => {
    setEditingId(group.id)
    setName(group.name)
    setStates([...group.states].sort())
    setAreaCodes([...group.areaCodes].sort())
    setAreaCodeDraft('')
    setRadius(
      group.radius && isValidRegionRadius(group.radius) ? group.radius : undefined
    )
    setError('')
    setStateQuery('')
  }

  const persist = (next: ContractRegion[]) => {
    updateSettings({ contractRegions: next })
  }

  const draftCriteria = useMemo(
    () => ({
      areaCodes,
      states,
      ...(isValidRegionRadius(radius) ? { radius } : {}),
    }),
    [areaCodes, states, radius]
  )

  const liveSummaryLines = useMemo(
    () => formatGroupCriteriaLines(draftCriteria),
    [draftCriteria]
  )

  const filteredStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase()
    if (!q) return US_STATES
    return US_STATES.filter(
      (state) =>
        state.name.toLowerCase().includes(q) || state.code.toLowerCase().includes(q)
    )
  }, [stateQuery])

  const toggleState = (code: string) => {
    setStates((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code].sort()
    )
    setError('')
  }

  const addAreaCodesFromDraft = () => {
    const next = normalizeAreaCodeList(areaCodeDraft)
    if (next.length === 0) return
    setAreaCodes((prev) => [...new Set([...prev, ...next])].sort())
    setAreaCodeDraft('')
    setError('')
  }

  const removeAreaCode = (code: string) => {
    setAreaCodes((prev) => prev.filter((item) => item !== code))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Group name is required.')
      return
    }

    const nextRadius = isValidRegionRadius(radius) ? radius : undefined
    const nextGroup: ContractRegion = {
      id: editingId ?? generateId(),
      name: trimmedName,
      areaCodes,
      states,
      ...(nextRadius ? { radius: nextRadius } : {}),
    }

    if (!regionHasCriteria(nextGroup)) {
      setError('Add at least one state, area code, or map radius.')
      return
    }

    if (editingId) {
      persist(groups.map((group) => (group.id === editingId ? nextGroup : group)))
    } else {
      persist([...groups, nextGroup])
    }

    startCreate()
  }

  const handleDelete = (id: string) => {
    persist(groups.filter((group) => group.id !== id))
    if (editingId === id) startCreate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Groups" size="xl">
      <div className="space-y-6">
        <p className="text-sm text-ink-muted">
          Build reusable rental groups from states, area codes, and map radius — mix any
          combination — then filter rentals and leases by group.
        </p>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Current Groups</h3>
          {groups.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border-2 border-dashed border-line bg-surface-paper px-4 py-6 text-center">
              <p className="text-sm font-medium text-ink">No groups have been created yet.</p>
              <p className="mt-1.5 text-sm text-ink-muted">
                Create a group using states, area codes, map radius, or any combination of them.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {groups.map((group) => {
                const matchCount = countMatchingProperties(group, properties)
                const summary = formatGroupCriteriaSummary(group)
                return (
                  <li key={group.id} className={cardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="flex items-center gap-2 font-semibold text-ink">
                          <MapPinned className="h-4 w-4 shrink-0 text-ink-muted" />
                          {group.name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {matchCount} matching{' '}
                          {matchCount === 1 ? 'property' : 'properties'}
                        </p>
                        {summary ? (
                          <p className="text-sm text-ink-muted">{summary}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(group)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="!text-accent"
                          onClick={() => handleDelete(group.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">
              {editingId ? 'Edit group' : 'Create a group'}
            </h3>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={startCreate}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className={cardClass}>
            <div>
              <h4 className="text-sm font-semibold text-ink">Add States</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Select one or more states to include in this group.
              </p>
            </div>
            <Input
              label=""
              aria-label="Search states"
              placeholder="Search states…"
              value={stateQuery}
              onChange={(e) => setStateQuery(e.target.value)}
            />
            {states.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {states.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleState(code)}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border-2 border-brand bg-brand/10 px-2.5 py-1 text-xs font-semibold text-ink"
                  >
                    {formatStateName(code)}
                    <X className="h-3 w-3" aria-hidden />
                    <span className="sr-only">Remove {formatStateName(code)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="max-h-44 overflow-y-auto rounded-[var(--radius-sm)] border-2 border-line p-2">
              <div className="grid gap-1 sm:grid-cols-2">
                {filteredStates.map((state) => {
                  const selected = states.includes(state.code)
                  return (
                    <button
                      key={state.code}
                      type="button"
                      onClick={() => toggleState(state.code)}
                      aria-pressed={selected}
                      className={cn(
                        'flex items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'bg-brand/10 font-semibold text-ink'
                          : 'text-ink hover:bg-surface'
                      )}
                    >
                      <span>{state.name}</span>
                      <span className="text-xs text-ink-faint">{state.code}</span>
                    </button>
                  )
                })}
                {filteredStates.length === 0 ? (
                  <p className="px-2.5 py-2 text-sm text-ink-faint sm:col-span-2">
                    No states match that search.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div>
              <h4 className="text-sm font-semibold text-ink">Add Area Codes</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Add one or more 3-digit US phone area codes (matched from tenant phone numbers).
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label=""
                aria-label="Area code"
                placeholder="e.g. 439"
                value={areaCodeDraft}
                onChange={(e) => setAreaCodeDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAreaCodesFromDraft()
                  }
                }}
                className="min-w-0 flex-1"
              />
              <Button type="button" variant="outline" onClick={addAreaCodesFromDraft}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {areaCodes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {areaCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => removeAreaCode(code)}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border-2 border-brand bg-brand/10 px-2.5 py-1 text-xs font-semibold text-ink"
                  >
                    {code}
                    <X className="h-3 w-3" aria-hidden />
                    <span className="sr-only">Remove area code {code}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-faint">No area codes added yet.</p>
            )}
          </div>

          <div className={cardClass}>
            <div>
              <h4 className="text-sm font-semibold text-ink">Add by Map Radius</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Search a location, drop or move the pin, adjust the radius, and preview which
                rentals fall inside. Include it alongside states and area codes in the same group.
              </p>
            </div>
            <RegionRadiusMapPicker
              value={radius}
              onChange={setRadius}
              onClear={() => setRadius(undefined)}
              commitOnMount={false}
              properties={properties}
            />
          </div>

          <div className={cardClass}>
            <div>
              <h4 className="text-sm font-semibold text-ink">Combine Criteria</h4>
              <p className="mt-1 text-xs text-ink-muted">
                All selected criteria belong to the same group and can be mixed freely.
              </p>
            </div>
            {liveSummaryLines.length === 0 ? (
              <p className="text-sm text-ink-faint">
                Select states, area codes, and/or a map radius to build this group.
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium text-ink">This group includes:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {liveSummaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={cardClass}>
            <Input
              label="Group name"
              required
              placeholder="e.g. Eastern Ohio, Tri-State Properties, College Housing"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit">
                {editingId ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Save changes
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save Group
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
