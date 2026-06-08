import { useState } from 'react'
import { Save, Building2 } from 'lucide-react'
import { ThemePicker } from '@/components/settings/ThemePicker'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'

export function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <PageHeader title="Settings" />

      <div className="w-full min-w-0 space-y-8">
        <ThemePicker />

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader
              title="Business Information"
              subtitle="Used in contract headers and signatures"
            />
            <div className="space-y-4">
              <Input
                label="Business Name"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                required
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
            </div>
          </Card>

          <Card>
            <CardHeader title="Contract Defaults" />
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
                label="Default Contract Footer"
                value={form.defaultContractFooter}
                onChange={(e) => update('defaultContractFooter', e.target.value)}
                rows={4}
              />
            </div>
          </Card>

          <div className="flex items-center gap-4">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            {saved && (
              <span className="text-sm font-semibold text-accent">Settings saved!</span>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-ink" strokeWidth={1.5} />
              <div>
                <p className="font-display text-lg font-semibold text-ink">Preview</p>
                <p className="text-sm text-ink-muted">
                  Contracts will show: <strong>{form.businessName}</strong> · {form.email}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
