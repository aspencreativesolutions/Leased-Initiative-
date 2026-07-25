import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_TENANT_POV_OPTIONS, DEMO_TENANT_POV_SECTIONS } from '@/lib/demoTenantPov'
import {
  filterVisibleDemoTenantPovOptions,
  filterVisibleDemoTenantPovSections,
  isDemoTenantScenarioVisible,
  isDemoTenantSectionFullyVisible,
  isDemoTenantSectionPartiallyVisible,
  loadDemoTenantScenarioVisibility,
  resetDemoTenantScenarioVisibility,
  saveDemoTenantScenarioVisibility,
  setDemoTenantScenarioVisible,
  setDemoTenantSectionVisible,
} from '@/lib/demoTenantScenarioVisibility'

const STORAGE_KEY = 'leased-demo-tenant-scenario-visibility'

function installLocalStorageMock() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
  vi.stubGlobal('localStorage', localStorage)
  vi.stubGlobal('window', {
    dispatchEvent: () => true,
  })
  return store
}

describe('demoTenantScenarioVisibility', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to all scenarios visible', () => {
    installLocalStorageMock()
    const visibility = loadDemoTenantScenarioVisibility()
    expect(visibility.hiddenKeys).toEqual([])
    expect(filterVisibleDemoTenantPovOptions(visibility)).toHaveLength(
      DEMO_TENANT_POV_OPTIONS.length
    )
    expect(filterVisibleDemoTenantPovSections(visibility)).toHaveLength(
      DEMO_TENANT_POV_SECTIONS.length
    )
  })

  it('hides a single scenario from the demo picker without removing catalog entries', () => {
    installLocalStorageMock()
    const next = setDemoTenantScenarioVisible('sample-james', false)
    expect(next.hiddenKeys).toContain('sample-james')
    expect(isDemoTenantScenarioVisible('sample-james', next)).toBe(false)
    expect(filterVisibleDemoTenantPovOptions(next).some((o) => o.key === 'sample-james')).toBe(
      false
    )
    expect(DEMO_TENANT_POV_OPTIONS.some((o) => o.key === 'sample-james')).toBe(true)
  })

  it('hides an entire section and drops empty sections from the filtered list', () => {
    installLocalStorageMock()
    const next = setDemoTenantSectionVisible('payments-edge-cases', false)
    expect(isDemoTenantSectionFullyVisible('payments-edge-cases', next)).toBe(false)
    const sections = filterVisibleDemoTenantPovSections(next)
    expect(sections.some((s) => s.id === 'payments-edge-cases')).toBe(false)
    expect(sections.length).toBe(DEMO_TENANT_POV_SECTIONS.length - 1)
  })

  it('marks a section as partially visible when only some scenarios are hidden', () => {
    installLocalStorageMock()
    const next = setDemoTenantScenarioVisible('pending', false)
    expect(isDemoTenantSectionPartiallyVisible('waiting-to-connect', next)).toBe(true)
    expect(isDemoTenantSectionFullyVisible('waiting-to-connect', next)).toBe(false)
    const waiting = filterVisibleDemoTenantPovSections(next).find(
      (s) => s.id === 'waiting-to-connect'
    )
    expect(waiting?.keys).toEqual(['pending-michael', 'pending-olivia'])
  })

  it('persists hidden keys to localStorage and can reset them', () => {
    const store = installLocalStorageMock()
    setDemoTenantScenarioVisible('active', false)
    expect(JSON.parse(store.get(STORAGE_KEY) ?? '{}').hiddenKeys).toContain('active')
    const reset = resetDemoTenantScenarioVisibility()
    expect(reset.hiddenKeys).toEqual([])
    expect(loadDemoTenantScenarioVisibility().hiddenKeys).toEqual([])
  })

  it('ignores unknown keys when saving', () => {
    installLocalStorageMock()
    const next = saveDemoTenantScenarioVisibility({
      hiddenKeys: ['active', 'not-a-real-tenant', 'active'],
    })
    expect(next.hiddenKeys).toEqual(['active'])
  })
})
