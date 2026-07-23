import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/FormField'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  resolveDefaultLeaseDates,
  resolveScheduleAsOf,
} from '@/lib/leaseSchedule'
import { cn, formatDate } from '@/lib/utils'
import type { BusinessSettings } from '@/types'

type LeaseDateFields = Pick<
  BusinessSettings,
  'customDefaultLeaseDates' | 'defaultLeaseStartDate' | 'defaultLeaseEndDate'
>

interface LeaseDefaultDatesSectionProps {
  value: LeaseDateFields
  onChange: (updates: Partial<LeaseDateFields>) => void
}

export function LeaseDefaultDatesSection({ value, onChange }: LeaseDefaultDatesSectionProps) {
  const custom = Boolean(value.customDefaultLeaseDates)
  const seasonal = resolveDefaultLeaseDates(
    { customDefaultLeaseDates: false },
    DEFAULT_LEASE_LENGTH_MONTHS,
    resolveScheduleAsOf()
  )

  const setMode = (nextCustom: boolean) => {
    if (nextCustom) {
      const start =
        value.defaultLeaseStartDate?.trim() || seasonal.leaseStartDate
      const end = value.defaultLeaseEndDate?.trim() || seasonal.leaseEndDate
      onChange({
        customDefaultLeaseDates: true,
        defaultLeaseStartDate: start,
        defaultLeaseEndDate: end,
      })
      return
    }
    onChange({ customDefaultLeaseDates: false })
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-surface-paper text-ink-muted">
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Default lease calendar</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            New tenants and lease agreements start on January 1 or August 1 (ending December 31 or
            July 31) based on today&apos;s date. Existing leases are not changed.
          </p>
        </div>
      </div>

      <div
        className="inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper p-0.5"
        role="group"
        aria-label="Default lease date mode"
      >
        <button
          type="button"
          onClick={() => setMode(false)}
          className={cn(
            'rounded-[calc(var(--radius-sm)-1px)] px-3 py-1.5 text-xs font-semibold transition-colors',
            !custom
              ? 'bg-brand/10 text-brand shadow-sm'
              : 'text-ink-faint hover:text-ink'
          )}
          aria-pressed={!custom}
        >
          Seasonal
        </button>
        <button
          type="button"
          onClick={() => setMode(true)}
          className={cn(
            'rounded-[calc(var(--radius-sm)-1px)] px-3 py-1.5 text-xs font-semibold transition-colors',
            custom
              ? 'bg-brand/10 text-brand shadow-sm'
              : 'text-ink-faint hover:text-ink'
          )}
          aria-pressed={custom}
        >
          Custom calendar
        </button>
      </div>

      {!custom ? (
        <p className="text-sm text-ink-muted">
          Current seasonal default:{' '}
          <span className="font-medium text-ink">
            {formatDate(seasonal.leaseStartDate)} – {formatDate(seasonal.leaseEndDate)}
          </span>
          {` (${seasonal.leaseLengthMonths}-month term).`}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Default lease start"
            type="date"
            value={value.defaultLeaseStartDate?.slice(0, 10) || ''}
            onChange={(e) => onChange({ defaultLeaseStartDate: e.target.value })}
            hint="Applied to newly generated leases only"
            required
          />
          <Input
            label="Default lease end"
            type="date"
            value={value.defaultLeaseEndDate?.slice(0, 10) || ''}
            onChange={(e) => onChange({ defaultLeaseEndDate: e.target.value })}
            hint="Must be on or after the start date"
            required
          />
        </div>
      )}
    </div>
  )
}
