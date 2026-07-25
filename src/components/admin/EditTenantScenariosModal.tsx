import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DEMO_TENANT_POV_OPTIONS, DEMO_TENANT_POV_SECTIONS } from '@/lib/demoTenantPov'
import {
  DEMO_TENANT_SCENARIO_VISIBILITY_EVENT,
  isDemoTenantScenarioVisible,
  isDemoTenantSectionFullyVisible,
  isDemoTenantSectionPartiallyVisible,
  loadDemoTenantScenarioVisibility,
  resetDemoTenantScenarioVisibility,
  setDemoTenantScenarioVisible,
  setDemoTenantSectionVisible,
  type DemoTenantScenarioVisibility,
} from '@/lib/demoTenantScenarioVisibility'
import { cn } from '@/lib/utils'

type EditTenantScenariosModalProps = {
  open: boolean
  onClose: () => void
}

function SectionVisibilityCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (visible: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      className="mt-1 h-4 w-4 accent-[var(--brand)]"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  )
}

export function EditTenantScenariosModal({ open, onClose }: EditTenantScenariosModalProps) {
  const [visibility, setVisibility] = useState<DemoTenantScenarioVisibility>(() =>
    loadDemoTenantScenarioVisibility()
  )

  useEffect(() => {
    if (!open) return
    setVisibility(loadDemoTenantScenarioVisibility())
  }, [open])

  useEffect(() => {
    const sync = () => setVisibility(loadDemoTenantScenarioVisibility())
    window.addEventListener(DEMO_TENANT_SCENARIO_VISIBILITY_EVENT, sync)
    return () => window.removeEventListener(DEMO_TENANT_SCENARIO_VISIBILITY_EVENT, sync)
  }, [])

  const byKey = new Map(DEMO_TENANT_POV_OPTIONS.map((option) => [option.key, option]))
  const hiddenCount = visibility.hiddenKeys.length
  const totalCount = DEMO_TENANT_POV_OPTIONS.length

  return (
    <Modal open={open} onClose={onClose} title="Edit Tenant Scenarios" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Choose which tenant scenarios appear in Demo Mode. Hiding a scenario removes it from the
          public picker only — mock users stay intact and remain available in Admin Mode.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">
            {totalCount - hiddenCount} of {totalCount} scenarios visible
            {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ''}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={hiddenCount === 0}
            onClick={() => setVisibility(resetDemoTenantScenarioVisibility())}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Show all
          </Button>
        </div>

        <div className="space-y-3">
          {DEMO_TENANT_POV_SECTIONS.map((section) => {
            const sectionVisible = isDemoTenantSectionFullyVisible(section.id, visibility)
            const sectionPartial = isDemoTenantSectionPartiallyVisible(section.id, visibility)

            return (
              <section
                key={section.id}
                className="overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface"
              >
                <label className="flex cursor-pointer items-start gap-3 border-b border-line px-3.5 py-3 sm:px-4">
                  <SectionVisibilityCheckbox
                    checked={sectionVisible}
                    indeterminate={sectionPartial}
                    onChange={(visible) =>
                      setVisibility(setDemoTenantSectionVisible(section.id, visible))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="heading-display block text-base font-semibold tracking-tight text-ink">
                      {section.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {section.keys.length} scenario{section.keys.length === 1 ? '' : 's'}
                      {sectionPartial ? ' · partially visible' : sectionVisible ? '' : ' · hidden'}
                    </span>
                  </span>
                </label>

                <ul className="divide-y divide-line">
                  {section.keys.map((key) => {
                    const option = byKey.get(key)
                    if (!option) return null
                    const visible = isDemoTenantScenarioVisible(key, visibility)

                    return (
                      <li key={key}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors sm:px-4',
                            'hover:bg-brand/[0.03]',
                            !visible && 'bg-surface-paper/60'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-[var(--brand)]"
                            checked={visible}
                            onChange={(e) =>
                              setVisibility(setDemoTenantScenarioVisible(key, e.target.checked))
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'text-sm font-semibold text-ink',
                                  !visible && 'text-ink-muted'
                                )}
                              >
                                {option.name}
                              </span>
                              <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                {option.scenario}
                              </span>
                              {!visible ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                                  <EyeOff className="h-3 w-3" aria-hidden />
                                  Hidden
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                                  <Eye className="h-3 w-3" aria-hidden />
                                  Visible
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-xs leading-snug text-ink-muted">
                              {option.summary}
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <div className="flex justify-end border-t border-line pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
