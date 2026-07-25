import { useEffect, useId, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, MapPin } from 'lucide-react'
import { DEMO_TENANT_POV_OPTIONS } from '@/lib/demoTenantPov'
import type { DemoTenantPovOption } from '@/lib/demoTenantPov'
import {
  DEMO_TENANT_SCENARIO_VISIBILITY_EVENT,
  filterVisibleDemoTenantPovSections,
  loadDemoTenantScenarioVisibility,
} from '@/lib/demoTenantScenarioVisibility'
import { cn } from '@/lib/utils'

type DemoTenantPovPickerProps = {
  selectedKey: string | null
  busyKey: string | null
  onSelect: (option: DemoTenantPovOption) => void
  className?: string
}

const FEATURED_SECTION_ID = 'start-application'

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
        {option.monthlyRent ? <DetailRow label="Rent" value={option.monthlyRent} /> : null}
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

      <p className="mt-4 text-xs font-semibold text-brand">
        {busy ? 'Opening this point of view…' : 'Click to open this point of view'}
      </p>
    </button>
  )
}

function StatusPointList({ points }: { points: string[] }) {
  if (points.length === 0) return null
  return (
    <ul className="mt-2 space-y-1">
      {points.slice(0, 3).map((point) => (
        <li key={point} className="flex gap-2 text-sm leading-snug text-ink-muted">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/70" aria-hidden />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  )
}

/** Direct-select row for Start Application (Ava) — no nested expand. */
function StartApplicationReadyRow({
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
        'flex w-full items-center gap-3 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface-paper px-3.5 py-3.5 text-left transition-colors sm:px-4 sm:py-4',
        'hover:border-brand hover:bg-brand/[0.03] focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
        selected && 'border-brand bg-brand/[0.04]',
        busy && 'opacity-90',
        disabled && !busy && 'cursor-not-allowed opacity-50'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="heading-display text-base font-semibold tracking-tight text-ink sm:text-lg">
            {option.name}
          </span>
          <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-2 py-0.5 text-[11px] font-semibold text-brand">
            Featured
          </span>
        </span>
        <span className="mt-0.5 block text-sm font-medium text-brand">
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Opening…
            </span>
          ) : (
            'Start Application Ready'
          )}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
    </button>
  )
}

function TenantPovUserRow({
  option,
  expanded,
  onToggle,
  selected,
  busy,
  disabled,
  onSelect,
}: {
  option: DemoTenantPovOption
  expanded: boolean
  onToggle: () => void
  selected: boolean
  busy: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const panelId = useId()

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface-paper',
        (expanded || selected) && 'border-brand/40'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={busy}
        className={cn(
          'flex w-full items-start gap-2 px-3.5 py-3 text-left transition-colors sm:px-4 sm:py-3.5',
          'hover:bg-brand/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          busy && 'opacity-80'
        )}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="heading-display text-base font-semibold tracking-tight text-ink sm:text-lg">
              {option.name}
            </span>
            <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-2 py-0.5 text-[11px] font-semibold text-brand">
              {option.scenario}
            </span>
          </span>
          <StatusPointList points={option.statusPoints} />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className="border-t border-line px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
          <TenantPovCard
            option={option}
            selected={selected}
            busy={busy}
            disabled={disabled}
            onSelect={onSelect}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Scenario picker for Demo Mode tenant POV selection.
 * Start Application shows Ava as a direct click row; other sections nest expand → card.
 */
export function DemoTenantPovPicker({
  selectedKey,
  busyKey,
  onSelect,
  className,
}: DemoTenantPovPickerProps) {
  const byKey = new Map(DEMO_TENANT_POV_OPTIONS.map((o) => [o.key, o]))
  const [sections, setSections] = useState(() =>
    filterVisibleDemoTenantPovSections(loadDemoTenantScenarioVisibility())
  )
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set())
  const [openUsers, setOpenUsers] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const sync = () => {
      setSections(filterVisibleDemoTenantPovSections(loadDemoTenantScenarioVisibility()))
    }
    window.addEventListener(DEMO_TENANT_SCENARIO_VISIBILITY_EVENT, sync)
    return () => window.removeEventListener(DEMO_TENANT_SCENARIO_VISIBILITY_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!busyKey && !selectedKey) return
    const focusKey = busyKey ?? selectedKey
    if (!focusKey) return
    const section = sections.find((s) => s.keys.includes(focusKey))
    if (!section || section.id === FEATURED_SECTION_ID) return
    setOpenSections((prev) => {
      if (prev.has(section.id)) return prev
      const next = new Set(prev)
      next.add(section.id)
      return next
    })
    setOpenUsers((prev) => {
      if (prev.has(focusKey)) return prev
      const next = new Set(prev)
      next.add(focusKey)
      return next
    })
  }, [busyKey, selectedKey, sections])

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const toggleUser = (userKey: string) => {
    setOpenUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userKey)) next.delete(userKey)
      else next.add(userKey)
      return next
    })
  }

  if (sections.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface-paper px-4 py-6 text-center text-sm text-ink-muted',
          className
        )}
      >
        No tenant scenarios are visible right now. An admin can restore them via Edit Tenant
        Scenarios.
      </div>
    )
  }

  return (
    <div className={cn('w-full space-y-3 text-left', className)}>
      {sections.map((section) => {
        const options = section.keys
          .map((key) => byKey.get(key))
          .filter((o): o is DemoTenantPovOption => Boolean(o))
        if (options.length === 0) return null

        const isStartApplication = section.id === FEATURED_SECTION_ID
        const sectionOpen = isStartApplication || openSections.has(section.id)
        const panelId = `demo-tenant-section-${section.id}`
        const countLabel = `${options.length} mock user${options.length === 1 ? '' : 's'}`

        return (
          <section
            key={section.id}
            className="overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink/15 bg-surface-paper"
          >
            {isStartApplication ? (
              <div className="border-b border-line px-4 py-3.5 sm:px-5">
                <p className="heading-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  {section.title}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Click Ava Mitchell to open her portal at Start Application
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={sectionOpen}
                aria-controls={panelId}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-3.5 text-left transition-colors sm:px-5',
                  'hover:bg-brand/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30',
                  sectionOpen && 'border-b border-line'
                )}
              >
                {sectionOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="heading-display block text-lg font-semibold tracking-tight text-ink sm:text-xl">
                    {section.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{countLabel}</span>
                </span>
              </button>
            )}

            {sectionOpen ? (
              <div id={panelId} className="space-y-2.5 px-3 py-3 sm:px-4 sm:py-4">
                {options.map((option) =>
                  isStartApplication ? (
                    <StartApplicationReadyRow
                      key={option.key}
                      option={option}
                      selected={selectedKey === option.key}
                      busy={busyKey === option.key}
                      disabled={busyKey !== null && busyKey !== option.key}
                      onSelect={() => onSelect(option)}
                    />
                  ) : (
                    <TenantPovUserRow
                      key={option.key}
                      option={option}
                      expanded={openUsers.has(option.key)}
                      onToggle={() => toggleUser(option.key)}
                      selected={selectedKey === option.key}
                      busy={busyKey === option.key}
                      disabled={busyKey !== null && busyKey !== option.key}
                      onSelect={() => onSelect(option)}
                    />
                  )
                )}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
