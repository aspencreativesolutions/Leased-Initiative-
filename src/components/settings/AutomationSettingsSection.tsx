import { Zap } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import type { AutomationSettings } from '@/types'

interface AutomationSettingsSectionProps {
  value: AutomationSettings
  onChange: (value: AutomationSettings) => void
}

export function AutomationSettingsSection({
  value,
  onChange,
}: AutomationSettingsSectionProps) {
  const update = <K extends keyof AutomationSettings>(key: K, val: AutomationSettings[K]) => {
    onChange({ ...value, [key]: val })
  }

  return (
    <Card>
      <CardHeader
        title="Client Automation"
        subtitle="Automated follow-ups, reminders, and status updates — minimal manual work for your team"
      />
      <div className="space-y-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Zap className="h-4 w-4 text-brand" />
              Enable automation
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              Clients receive in-app notifications and optional email reminders without you
              sending each update manually.
            </span>
          </span>
        </label>

        {value.enabled && (
          <div className="space-y-4 border-t border-line pt-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={value.projectStatusUpdates}
                onChange={(e) => update('projectStatusUpdates', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
              />
              <span>
                <span className="font-semibold text-ink">Project status updates</span>
                <span className="mt-0.5 block text-sm text-ink-muted">
                  Notify clients when contracts are sent, invoices are ready, and projects start.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={value.followUpReminders}
                onChange={(e) => update('followUpReminders', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
              />
              <span>
                <span className="font-semibold text-ink">Follow-up reminders</span>
                <span className="mt-0.5 block text-sm text-ink-muted">
                  Alert clients before scheduled follow-up dates on their profile.
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Deadline reminder window</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Days before a deadline to notify the client
                </span>
                <select
                  value={value.deadlineReminderDays}
                  onChange={(e) => update('deadlineReminderDays', Number(e.target.value))}
                  className="mt-2 w-full rounded-sm border-2 border-line bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={7}>7 days before</option>
                </select>
              </label>

              <label className="flex cursor-pointer items-start gap-3 sm:pt-6">
                <input
                  type="checkbox"
                  checked={value.sendEmailReminders}
                  onChange={(e) => update('sendEmailReminders', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                <span>
                  <span className="font-semibold text-ink">Email reminders</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    Also send SMTP emails when reminders fire (requires SMTP in .env).
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
