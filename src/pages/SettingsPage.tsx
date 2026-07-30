import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, Save } from 'lucide-react'
import { ThemePicker } from '@/components/settings/ThemePicker'
import { AutomationSettingsSection } from '@/components/settings/AutomationSettingsSection'
import { LeaseDefaultDatesSection } from '@/components/settings/LeaseDefaultDatesSection'
import { LeaseAgreementTemplatesSection } from '@/components/settings/LeaseAgreementTemplatesSection'
import { TenantDiscoverySection } from '@/components/settings/TenantDiscoverySection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { defaultSettings } from '@/data/seed'
import { normalizeCustomLeaseEras } from '@/lib/leaseSchedule'
import type { AutomationSettings, TenantDiscoveryMode } from '@/types'

type SettingsCategoryId = 'business' | 'automation' | 'lease' | 'style'

interface SettingsCategory {
  id: SettingsCategoryId
  title: string
  description: string
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Company details used in lease headers and signatures.',
  },
  {
    id: 'automation',
    title: 'Client Automation',
    description: 'Reminders, follow-ups, and status updates on autopilot.',
  },
  {
    id: 'lease',
    title: 'Lease Defaults',
    description: 'Templates, lease calendar settings, payment terms, revision limits, and footers.',
  },
  {
    id: 'style',
    title: 'App Style',
    description: 'Choose a visual finish — preview applies instantly.',
  },
]

function resolveCategory(tab: string | null): SettingsCategoryId {
  if (tab && SETTINGS_CATEGORIES.some((category) => category.id === tab)) {
    return tab as SettingsCategoryId
  }
  return 'business'
}

export function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(() => ({
    ...settings,
    customLeaseEras: normalizeCustomLeaseEras(settings),
    customDefaultLeaseDates: false,
    defaultLeaseStartDate: '',
    defaultLeaseEndDate: '',
  }))
  const [saved, setSaved] = useState(false)
  const [dateError, setDateError] = useState('')
  const activeCategory = resolveCategory(searchParams.get('tab'))
  const fromPendingTenants = searchParams.get('from') === 'pending-tenants'

  const automation: AutomationSettings =
    form.automation ?? defaultSettings.automation!

  const activeMeta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory)!

  useEffect(() => {
    if (activeCategory !== 'lease') return
    if (searchParams.get('from') !== 'pending-tenants' && !window.location.hash.includes('lease-agreement-templates')) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('lease-agreement-templates')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeCategory, searchParams])

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
    setDateError('')
  }

  const updateLeaseDates = (
    updates: Partial<
      Pick<
        typeof form,
        | 'customDefaultLeaseDates'
        | 'defaultLeaseStartDate'
        | 'defaultLeaseEndDate'
        | 'customLeaseEras'
      >
    >
  ) => {
    setForm((f) => ({ ...f, ...updates }))
    setSaved(false)
    setDateError('')
  }

  const updateAutomation = (value: AutomationSettings) => {
    setForm((f) => ({ ...f, automation: value }))
    setSaved(false)
  }

  const updateDiscoveryMode = (mode: TenantDiscoveryMode) => {
    setForm((f) => ({ ...f, tenantDiscoveryMode: mode }))
    setSaved(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const eras = normalizeCustomLeaseEras(form)
    for (const era of eras) {
      if (!era.startDate?.trim() || !era.endDate?.trim()) {
        setDateError('Each custom lease era needs both a start and end date.')
        return
      }
      if (era.endDate < era.startDate) {
        setDateError('Lease end date must be on or after the start date for every custom era.')
        return
      }
    }
    updateSettings({
      ...form,
      customDefaultLeaseDates: false,
      defaultLeaseStartDate: '',
      defaultLeaseEndDate: '',
      customLeaseEras: eras,
    })
    setSaved(true)
    setDateError('')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <PageHeader
        title={activeMeta.title}
        subtitle={activeMeta.description}
      />

      <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
        <Card
          aria-label={`${activeMeta.title} settings`}
          data-onboarding={`admin-settings-${activeCategory}`}
        >
          {activeCategory === 'business' && (
            <div className="space-y-4">
              <Input
                label="Business Name"
                value={form.businessName}
                readOnly
                hint="Registered company name — cannot be changed here. Contact support for a special request."
              />
              <Input
                label="Owner Name"
                value={form.ownerName}
                onChange={(e) => update('ownerName', e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
              <Textarea
                label="Business Address"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                rows={2}
              />
              <Input
                label="Logo URL (optional)"
                hint="Paste a URL to your logo for future use"
                value={form.logoUrl || ''}
                onChange={(e) => update('logoUrl', e.target.value)}
                placeholder="https://..."
              />
              <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-7 w-7 shrink-0 text-ink" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold text-ink">Preview</p>
                    <p className="truncate text-sm text-ink-muted">
                      Leases will show: <strong>{form.businessName}</strong> · {form.email}
                    </p>
                  </div>
                </div>
              </div>
              <TenantDiscoverySection
                value={form.tenantDiscoveryMode === 'invite_only' ? 'invite_only' : 'public'}
                onChange={updateDiscoveryMode}
              />
            </div>
          )}

          {activeCategory === 'style' && <ThemePicker embedded />}

          {activeCategory === 'automation' && (
            <AutomationSettingsSection
              embedded
              value={automation}
              onChange={updateAutomation}
            />
          )}

          {activeCategory === 'lease' && (
            <div className="space-y-4">
              <LeaseAgreementTemplatesSection fromPendingTenants={fromPendingTenants} />
              <LeaseDefaultDatesSection
                value={{
                  customDefaultLeaseDates: form.customDefaultLeaseDates,
                  defaultLeaseStartDate: form.defaultLeaseStartDate,
                  defaultLeaseEndDate: form.defaultLeaseEndDate,
                  customLeaseEras: form.customLeaseEras,
                }}
                onChange={updateLeaseDates}
              />
              <Textarea
                label="Default Payment Terms"
                value={form.defaultPaymentTerms}
                onChange={(e) => update('defaultPaymentTerms', e.target.value)}
                rows={3}
              />
              <Input
                label="Default Revision Limit"
                value={form.defaultRevisionLimit}
                onChange={(e) => update('defaultRevisionLimit', e.target.value)}
              />
              <Textarea
                label="Default Lease Footer"
                value={form.defaultContractFooter}
                onChange={(e) => update('defaultContractFooter', e.target.value)}
                rows={4}
              />
              {dateError && (
                <p className="text-sm font-semibold text-accent" role="alert">
                  {dateError}
                </p>
              )}
            </div>
          )}

          {activeCategory !== 'style' && (
            <div className="mt-5 flex items-center gap-4 border-t border-line pt-4">
              <Button type="submit">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
              {saved && (
                <span className="text-sm font-semibold text-accent">Settings saved!</span>
              )}
            </div>
          )}
        </Card>
      </form>
    </>
  )
}
