import { useId, useState } from 'react'
import {
  Building2,
  ChevronDown,
  FileText,
  Palette,
  Save,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { ThemePicker } from '@/components/settings/ThemePicker'
import { AutomationSettingsSection } from '@/components/settings/AutomationSettingsSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { defaultSettings } from '@/data/seed'
import { cn } from '@/lib/utils'
import type { AutomationSettings } from '@/types'

type SettingsCategoryId = 'business' | 'style' | 'automation' | 'lease'

interface SettingsCategory {
  id: SettingsCategoryId
  title: string
  description: string
  icon: LucideIcon
}

/** 2×2 order: Business | App Style / Client Automation | Lease Defaults */
const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Company details used in lease headers and signatures.',
    icon: Building2,
  },
  {
    id: 'style',
    title: 'App Style',
    description: 'Choose a visual finish — preview applies instantly.',
    icon: Palette,
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
    description: 'Default payment terms, revision limits, and footers.',
    icon: FileText,
  },
]

export function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId | null>(null)
  const detailId = useId()

  const automation: AutomationSettings =
    form.automation ?? defaultSettings.automation!

  const activeMeta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory)

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  const updateAutomation = (value: AutomationSettings) => {
    setForm((f) => ({ ...f, automation: value }))
    setSaved(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleCategory = (id: SettingsCategoryId) => {
    setActiveCategory((current) => (current === id ? null : id))
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Pick a category to configure — keep the rest tucked away."
      />

      <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
          aria-label="Settings categories"
        >
          {SETTINGS_CATEGORIES.map((category) => {
            const selected = activeCategory === category.id
            return (
              <SettingsCategoryCard
                key={category.id}
                category={category}
                selected={selected}
                controlsId={selected ? detailId : undefined}
                onSelect={() => toggleCategory(category.id)}
              />
            )
          })}
        </div>

        {activeMeta && (
          <Card id={detailId} aria-label={`${activeMeta.title} settings`}>
            <CardHeader
              dense
              title={activeMeta.title}
              subtitle={activeMeta.description}
              action={
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:border-ink hover:text-ink"
                >
                  Close
                  <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
                </button>
              }
            />

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
        )}
      </form>
    </>
  )
}

function SettingsCategoryCard({
  category,
  selected,
  controlsId,
  onSelect,
}: {
  category: SettingsCategory
  selected: boolean
  controlsId?: string
  onSelect: () => void
}) {
  const Icon = category.icon

  return (
    <button
      type="button"
      aria-controls={controlsId}
      aria-expanded={selected}
      onClick={onSelect}
      className={cn(
        'group paper-box flex h-full min-h-[8.5rem] flex-col p-5 text-left transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lift',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        selected
          ? 'border-brand bg-brand/5 shadow-lift ring-1 ring-brand/30'
          : 'hover:border-ink-muted'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] transition-colors',
            selected
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-line bg-surface text-ink-muted group-hover:border-ink-muted group-hover:text-ink'
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200',
            selected && 'rotate-180 text-brand'
          )}
          aria-hidden
        />
      </div>
      <h2 className="mt-3 font-display text-lg font-semibold leading-tight text-ink">
        {category.title}
      </h2>
      <p className="mt-1 flex-1 text-sm leading-snug text-ink-muted">{category.description}</p>
    </button>
  )
}
