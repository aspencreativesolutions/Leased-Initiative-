import { useState } from 'react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  formatLeaseLengthLabel,
  listDefaultLeaseOptions,
  monthsBetweenLeaseDates,
  normalizeCustomLeaseEras,
  resolveDefaultLeaseDates,
  resolveScheduleAsOf,
  seasonalLeaseOptionId,
} from '@/lib/leaseSchedule'
import { generateId } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import type { BusinessSettings, CustomLeaseEra } from '@/types'

type LeaseDateFields = Pick<
  BusinessSettings,
  | 'customDefaultLeaseDates'
  | 'defaultLeaseStartDate'
  | 'defaultLeaseEndDate'
  | 'customLeaseEras'
>

interface LeaseDefaultDatesSectionProps {
  value: LeaseDateFields
  onChange: (updates: Partial<LeaseDateFields>) => void
}

export function LeaseDefaultDatesSection({ value, onChange }: LeaseDefaultDatesSectionProps) {
  const asOf = resolveScheduleAsOf()
  const seasonal = resolveDefaultLeaseDates(
    { customDefaultLeaseDates: false },
    DEFAULT_LEASE_LENGTH_MONTHS,
    asOf
  )
  const eras = normalizeCustomLeaseEras(value)
  const options = listDefaultLeaseOptions(
    { ...value, customLeaseEras: eras, customDefaultLeaseDates: false },
    asOf
  )
  const seasonalOptions = options.filter((option) => option.kind === 'seasonal')
  const customOptions = options.filter((option) => option.kind === 'custom')

  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [formError, setFormError] = useState('')

  const persistEras = (nextEras: CustomLeaseEra[]) => {
    onChange({
      customLeaseEras: nextEras,
      customDefaultLeaseDates: false,
      defaultLeaseStartDate: '',
      defaultLeaseEndDate: '',
    })
  }

  const handleAddEra = () => {
    const start = draftStart.trim().slice(0, 10)
    const end = draftEnd.trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      setFormError('Enter both a start and end date.')
      return
    }
    if (end < start) {
      setFormError('Lease end date must be on or after the start date.')
      return
    }
    const duplicate = eras.some(
      (era) => era.startDate === start && era.endDate === end
    )
    if (duplicate) {
      setFormError('That lease era is already in your defaults.')
      return
    }
    const months = monthsBetweenLeaseDates(start, end)
    persistEras([
      ...eras,
      {
        id: generateId(),
        startDate: start,
        endDate: end,
        label: `${formatDate(start)} – ${formatDate(end)} (${formatLeaseLengthLabel(months)})`,
      },
    ])
    setDraftStart('')
    setDraftEnd('')
    setFormError('')
  }

  const handleRemoveEra = (id: string) => {
    persistEras(eras.filter((era) => era.id !== id))
  }

  return (
    <div
      className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4"
      data-onboarding="lease-calendar-settings"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-surface-paper text-ink-muted">
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Default Lease Calendar Settings</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Seasonal terms start on January 1 or August 1. Add custom lease eras for non-seasonal
            windows — they appear here and when you add a rental or generate a lease.
          </p>
        </div>
      </div>

      <p className="text-sm text-ink-muted">
        Current seasonal default:{' '}
        <span className="font-medium text-ink">
          {formatDate(seasonal.leaseStartDate)} – {formatDate(seasonal.leaseEndDate)}
        </span>
        {` (${seasonal.leaseLengthMonths}-month term).`}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface-paper p-3">
          <div>
            <p className="text-sm font-semibold text-ink">Current Seasonal Options</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Standard lease lengths offered with the seasonal calendar, plus any custom eras you
              add.
            </p>
          </div>

          <ul className="space-y-2" aria-label="Current seasonal options">
            {seasonalOptions.map((option) => {
              const isActiveDefault = option.id === seasonalLeaseOptionId(DEFAULT_LEASE_LENGTH_MONTHS)
              return (
                <li
                  key={option.id}
                  className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{option.label}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(option.leaseStartDate)} – {formatDate(option.leaseEndDate)}
                      {isActiveDefault ? ' · Active seasonal default' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                    Seasonal
                  </span>
                </li>
              )
            })}
            {customOptions.map((option) => (
              <li
                key={option.id}
                className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{option.label}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(option.leaseStartDate)} – {formatDate(option.leaseEndDate)} ·{' '}
                    {formatLeaseLengthLabel(option.leaseLengthMonths)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEra(option.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted transition-colors hover:bg-surface hover:text-accent"
                  aria-label={`Remove ${option.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface-paper p-3">
          <div>
            <p className="text-sm font-semibold text-ink">Add a new lease era</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Set a custom start and end date. Once added, it joins your default lease options for
              rentals and new leases.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Input
              label="Lease start"
              type="date"
              value={draftStart}
              onChange={(e) => {
                setDraftStart(e.target.value)
                setFormError('')
              }}
            />
            <Input
              label="Lease end"
              type="date"
              value={draftEnd}
              onChange={(e) => {
                setDraftEnd(e.target.value)
                setFormError('')
              }}
            />
          </div>

          {formError ? (
            <p className="text-xs text-accent" role="alert">
              {formError}
            </p>
          ) : null}

          <Button type="button" variant="outline" onClick={handleAddEra} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add lease era
          </Button>
        </div>
      </div>
    </div>
  )
}
