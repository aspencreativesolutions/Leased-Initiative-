import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  Building2,
  FileText,
  Palette,
  Save,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { ThemePicker } from '@/components/settings/ThemePicker'
import { AutomationSettingsSection } from '@/components/settings/AutomationSettingsSection'
import { LeaseDefaultDatesSection } from '@/components/settings/LeaseDefaultDatesSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { defaultSettings } from '@/data/seed'
import { cn } from '@/lib/utils'
import type { AutomationSettings } from '@/types'

type SettingsCategoryId = 'business' | 'automation' | 'lease' | 'style'

interface SettingsCategory {
  id: SettingsCategoryId
  title: string
  description: string
  icon: LucideIcon
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Company details used in lease headers and signatures.',
    icon: Building2,
  },
  {
    id: 'automation',
    title: 'Client Automation',
    description: 'Reminders, follow-ups, and status updates on autopilot.',
    icon: Zap,
  },
  {
    id: 'lease',
    title: 'Lease Defaults',
    description: 'Seasonal start/end dates, payment terms, revision limits, and footers.',
    icon: FileText,
  },
  {
    id: 'style',
    title: 'App Style',
    description: 'Choose a visual finish — preview applies instantly.',
    icon: Palette,
  },
]

export function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [dateError, setDateError] = useState('')
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('business')
  const baseId = useId()
  const tabRefs = useRef<Partial<Record<SettingsCategoryId, HTMLButtonElement | null>>>({})

  const automation: AutomationSettings =
    form.automation ?? defaultSettings.automation!

  const activeMeta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory)!
  const tabPanelId = `${baseId}-panel`
  const tabId = (id: SettingsCategoryId) => `${baseId}-tab-${id}`

  useEffect(() => {
    tabRefs.current[activeCategory]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    })
  }, [activeCategory])

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
    setDateError('')
  }

  const updateLeaseDates = (
    updates: Partial<
      Pick<
        typeof form,
        'customDefaultLeaseDates' | 'defaultLeaseStartDate' | 'defaultLeaseEndDate'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      form.customDefaultLeaseDates &&
      form.defaultLeaseStartDate &&
      form.defaultLeaseEndDate &&
      form.defaultLeaseEndDate < form.defaultLeaseStartDate
    ) {
      setDateError('Lease end date must be on or after the start date.')
      return
    }
    if (
      form.customDefaultLeaseDates &&
      (!form.defaultLeaseStartDate?.trim() || !form.defaultLeaseEndDate?.trim())
    ) {
      setDateError('Choose both a start and end date for custom lease defaults.')
      return
    }
    updateSettings(form)
    setSaved(true)
    setDateError('')
    setTimeout(() => setSaved(false), 3000)
  }

  const selectCategory = (id: SettingsCategoryId) => {
    setActiveCategory(id)
  }

  const focusTab = (id: SettingsCategoryId) => {
    setActiveCategory(id)
    requestAnimationFrame(() => {
      tabRefs.current[id]?.focus()
    })
  }

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SETTINGS_CATEGORIES.length - 1
    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
        nextIndex = index === 0 ? last : index - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = last
        break
      default:
        return
    }

    e.preventDefault()
    focusTab(SETTINGS_CATEGORIES[nextIndex].id)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure business details, automation, lease defaults, and appearance."
      />

      <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
        <div
          role="tablist"
          aria-label="Settings categories"
          className={cn(
            'flex w-full min-w-0 items-stretch gap-0 overflow-x-auto border-b border-line',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          )}
        >
          {SETTINGS_CATEGORIES.map((category, index) => {
            const selected = activeCategory === category.id
            const Icon = category.icon
            return (
              <button
                key={category.id}
                ref={(el) => {
                  tabRefs.current[category.id] = el
                }}
                type="button"
                role="tab"
                id={tabId(category.id)}
                aria-selected={selected}
                aria-controls={tabPanelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectCategory(category.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors sm:px-4',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                  selected
                    ? 'border-brand bg-brand/5 font-semibold text-brand'
                    : 'border-transparent font-medium text-ink-muted hover:bg-surface hover:text-ink'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                {category.title}
              </button>
            )
          })}
        </div>

        <Card
          id={tabPanelId}
          role="tabpanel"
          aria-labelledby={tabId(activeCategory)}
          aria-label={`${activeMeta.title} settings`}
        >
          <CardHeader dense title={activeMeta.title} subtitle={activeMeta.description} />

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
              <LeaseDefaultDatesSection
                value={{
                  customDefaultLeaseDates: form.customDefaultLeaseDates,
                  defaultLeaseStartDate: form.defaultLeaseStartDate,
                  defaultLeaseEndDate: form.defaultLeaseEndDate,
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
