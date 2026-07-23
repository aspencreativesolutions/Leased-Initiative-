import { Loader2, MapPin } from 'lucide-react'
import { DEMO_TENANT_POV_OPTIONS, DEMO_TENANT_POV_SECTIONS } from '@/lib/demoTenantPov'
import type { DemoTenantPovOption } from '@/lib/demoTenantPov'
import { cn } from '@/lib/utils'

type DemoTenantPovPickerProps = {
  selectedKey: string | null
  busyKey: string | null
  onSelect: (option: DemoTenantPovOption) => void
  className?: string
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-left sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-sm leading-snug text-ink">{value}</dd>
    </div>
  )
}

function TenantPovCard({
  option,
  selected,
  busy,
  disabled,
  onSelect,
}: {
  option: DemoTenantPovOption
  selected: boolean
  busy: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-busy={busy || undefined}
      className={cn(
        'demo-tenant-pov-card w-full rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface-paper p-4 text-left transition-colors sm:p-5',
        'hover:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
        selected && 'border-brand bg-brand/[0.04]',
        busy && 'opacity-90',
        disabled && !busy && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="heading-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {option.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{option.email}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-2 py-1 text-[11px] font-semibold text-brand">
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Opening…
            </span>
          ) : (
            option.scenario
          )}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{option.summary}</p>

      <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-ink">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
        <span>{option.address}</span>
      </p>

      <dl className="mt-4 space-y-2 border-t border-line pt-3">
        <DetailRow label="Lease start" value={option.leaseStart} />
        <DetailRow label="Term" value={option.leaseTerm} />
        {option.monthlyRent ? (
          <DetailRow label="Rent" value={option.monthlyRent} />
        ) : null}
        <DetailRow label="Payment method" value={option.paymentMethod} />
        <DetailRow label="Payment status" value={option.paymentStatus} />
      </dl>

      {option.details.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-line pt-3">
          {option.details.map((line) => (
            <li key={line} className="flex gap-2 text-xs leading-snug text-ink-muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </button>
  )
}

/**
 * Scannable list of mock tenant scenarios for Demo Mode POV selection.
 */
export function DemoTenantPovPicker({
  selectedKey,
  busyKey,
  onSelect,
  className,
}: DemoTenantPovPickerProps) {
  const byKey = new Map(DEMO_TENANT_POV_OPTIONS.map((o) => [o.key, o]))

  return (
    <div className={cn('w-full space-y-8 text-left', className)}>
      {DEMO_TENANT_POV_SECTIONS.map((section) => {
        const options = section.keys
          .map((key) => byKey.get(key))
          .filter((o): o is DemoTenantPovOption => Boolean(o))
        if (options.length === 0) return null
        return (
          <section key={section.title} className="space-y-3">
            <h2 className="label-caps text-ink-faint">{section.title}</h2>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {options.map((option) => (
                <li key={option.key}>
                  <TenantPovCard
                    option={option}
                    selected={selectedKey === option.key}
                    busy={busyKey === option.key}
                    disabled={busyKey !== null && busyKey !== option.key}
                    onSelect={() => onSelect(option)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
