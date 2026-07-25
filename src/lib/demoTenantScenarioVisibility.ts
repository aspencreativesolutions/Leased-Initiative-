import {
  DEMO_TENANT_POV_OPTIONS,
  DEMO_TENANT_POV_SECTIONS,
  type DemoTenantPovOption,
} from '@/lib/demoTenantPov'

const STORAGE_KEY = 'leased-demo-tenant-scenario-visibility'
export const DEMO_TENANT_SCENARIO_VISIBILITY_EVENT = 'leased-demo-tenant-scenario-visibility'

export type DemoTenantScenarioVisibility = {
  /** Tenant POV keys hidden from Demo Mode (mock users remain intact). */
  hiddenKeys: string[]
}

const ALL_KEYS = new Set(DEMO_TENANT_POV_OPTIONS.map((o) => o.key))

function knownKeysOnly(keys: string[]): string[] {
  return [...new Set(keys.filter((key) => ALL_KEYS.has(key)))]
}

export function defaultDemoTenantScenarioVisibility(): DemoTenantScenarioVisibility {
  return { hiddenKeys: [] }
}

export function loadDemoTenantScenarioVisibility(): DemoTenantScenarioVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDemoTenantScenarioVisibility()
    const parsed = JSON.parse(raw) as Partial<DemoTenantScenarioVisibility>
    return {
      hiddenKeys: knownKeysOnly(Array.isArray(parsed.hiddenKeys) ? parsed.hiddenKeys : []),
    }
  } catch {
    return defaultDemoTenantScenarioVisibility()
  }
}

export function saveDemoTenantScenarioVisibility(
  visibility: DemoTenantScenarioVisibility
): DemoTenantScenarioVisibility {
  const next: DemoTenantScenarioVisibility = {
    hiddenKeys: knownKeysOnly(visibility.hiddenKeys),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEMO_TENANT_SCENARIO_VISIBILITY_EVENT, { detail: next }))
  }
  return next
}

export function isDemoTenantScenarioVisible(
  key: string,
  visibility: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): boolean {
  return !visibility.hiddenKeys.includes(key)
}

export function setDemoTenantScenarioVisible(
  key: string,
  visible: boolean,
  current: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): DemoTenantScenarioVisibility {
  const hidden = new Set(current.hiddenKeys)
  if (visible) hidden.delete(key)
  else if (ALL_KEYS.has(key)) hidden.add(key)
  return saveDemoTenantScenarioVisibility({ hiddenKeys: [...hidden] })
}

export function setDemoTenantSectionVisible(
  sectionId: string,
  visible: boolean,
  current: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): DemoTenantScenarioVisibility {
  const section = DEMO_TENANT_POV_SECTIONS.find((s) => s.id === sectionId)
  if (!section) return current
  const hidden = new Set(current.hiddenKeys)
  for (const key of section.keys) {
    if (visible) hidden.delete(key)
    else if (ALL_KEYS.has(key)) hidden.add(key)
  }
  return saveDemoTenantScenarioVisibility({ hiddenKeys: [...hidden] })
}

export function resetDemoTenantScenarioVisibility(): DemoTenantScenarioVisibility {
  return saveDemoTenantScenarioVisibility(defaultDemoTenantScenarioVisibility())
}

export function filterVisibleDemoTenantPovOptions(
  visibility: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): DemoTenantPovOption[] {
  const hidden = new Set(visibility.hiddenKeys)
  return DEMO_TENANT_POV_OPTIONS.filter((option) => !hidden.has(option.key))
}

export function filterVisibleDemoTenantPovSections(
  visibility: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): typeof DEMO_TENANT_POV_SECTIONS {
  const hidden = new Set(visibility.hiddenKeys)
  return DEMO_TENANT_POV_SECTIONS.map((section) => ({
    ...section,
    keys: section.keys.filter((key) => !hidden.has(key)),
  })).filter((section) => section.keys.length > 0)
}

export function isDemoTenantSectionFullyVisible(
  sectionId: string,
  visibility: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): boolean {
  const section = DEMO_TENANT_POV_SECTIONS.find((s) => s.id === sectionId)
  if (!section) return true
  return section.keys.every((key) => isDemoTenantScenarioVisible(key, visibility))
}

export function isDemoTenantSectionPartiallyVisible(
  sectionId: string,
  visibility: DemoTenantScenarioVisibility = loadDemoTenantScenarioVisibility()
): boolean {
  const section = DEMO_TENANT_POV_SECTIONS.find((s) => s.id === sectionId)
  if (!section) return false
  const visibleCount = section.keys.filter((key) =>
    isDemoTenantScenarioVisible(key, visibility)
  ).length
  return visibleCount > 0 && visibleCount < section.keys.length
}
