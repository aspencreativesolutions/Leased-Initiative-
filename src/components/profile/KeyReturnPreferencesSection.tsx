import { Camera, ClipboardCheck, KeyRound } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import {
  buildConditionReportClause,
  getConditionReportPreferences,
} from '@/lib/conditionReport'
import {
  buildDefaultKeyReturnClause,
  buildKeyReturnClause,
  getKeyReturnPreferences,
} from '@/lib/keyReturn'
import {
  buildTenantPhotoClause,
  getTenantPhotoPreferences,
} from '@/lib/tenantPhoto'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import type {
  ConditionReportPreferences,
  KeyReturnPreferences,
  TenantPhotoPreferences,
} from '@/types'

interface KeyReturnPreferencesSectionProps {
  className?: string
}

export function KeyReturnPreferencesSection({
  className,
}: KeyReturnPreferencesSectionProps) {
  const { settings, updateSettings } = useApp()
  const prefs = getKeyReturnPreferences(settings)
  const photoPrefs = getTenantPhotoPreferences(settings)
  const conditionPrefs = getConditionReportPreferences(settings)
  const defaultClause = buildDefaultKeyReturnClause(prefs)
  const clause = buildKeyReturnClause(prefs)
  const photoClause = buildTenantPhotoClause(photoPrefs)
  const conditionClause = buildConditionReportClause(conditionPrefs)

  const updateKeyReturn = (patch: Partial<KeyReturnPreferences>) => {
    const next: KeyReturnPreferences = { ...prefs, ...patch }
    // When days/fine change and wording still matches the prior default, refresh it.
    if (
      (patch.gracePeriodDays != null || patch.fineAmount != null) &&
      patch.clauseWording === undefined
    ) {
      const previousDefault = buildDefaultKeyReturnClause(prefs)
      const currentWording = (prefs.clauseWording ?? previousDefault).trim()
      if (!prefs.clauseWording || currentWording === previousDefault) {
        next.clauseWording = buildDefaultKeyReturnClause(next)
      }
    }
    updateSettings({
      keyReturn: next,
    })
  }

  const updatePhoto = (patch: Partial<TenantPhotoPreferences>) => {
    updateSettings({
      tenantPhoto: { ...photoPrefs, ...patch },
    })
  }

  const updateCondition = (patch: Partial<ConditionReportPreferences>) => {
    updateSettings({
      conditionReport: { ...conditionPrefs, ...patch },
    })
  }

  return (
    <Card className={className} data-onboarding="admin-key-return-preferences">
      <CardHeader
        title="Preferences"
        subtitle="Key return notices, tenant photos, and move-in / move-out condition reports — applied to new and uploaded leases, adjustable anytime. Override required vs optional per rental when editing a property."
      />
      <div className="space-y-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={prefs.autoNotify}
            onChange={(e) => updateKeyReturn({ autoNotify: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-brand" aria-hidden />
              Automatic key return notifications
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              When a lease ends, notify the tenant to return keys within the grace period to
              avoid the fine. You can also request a notice from the red Lease Complete tag.
            </span>
          </span>
        </label>

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Input
            label="Key return grace period (days)"
            type="number"
            min={0}
            max={365}
            value={String(prefs.gracePeriodDays)}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (!Number.isFinite(next)) return
              updateKeyReturn({
                gracePeriodDays: Math.max(0, Math.min(365, Math.round(next))),
              })
            }}
            hint="Days after the lease end date to return keys"
          />
          <Input
            label="Key return fine amount ($)"
            type="number"
            min={0}
            step={1}
            value={String(prefs.fineAmount)}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (!Number.isFinite(next)) return
              updateKeyReturn({ fineAmount: Math.max(0, Math.round(next * 100) / 100) })
            }}
            hint="Charged if keys are not returned in time"
          />
        </div>

        <Textarea
          label="Key return lease clause wording"
          rows={4}
          value={prefs.clauseWording ?? defaultClause}
          onChange={(e) => updateKeyReturn({ clauseWording: e.target.value })}
          hint='Edit and save as the lease clause (e.g. “Tenant must return keys within 7 days after lease end”). Applied to new and uploaded leases.'
        />

        <div className={cn('rounded-sm border-2 border-line bg-surface px-3 py-3')}>
          <p className="text-xs font-semibold uppercase tracking-caps text-ink-faint">
            Key return clause preview
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{clause}</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 border-t border-line pt-4">
          <input
            type="checkbox"
            checked={photoPrefs.required}
            onChange={(e) => updatePhoto({ required: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Camera className="h-4 w-4 text-brand" aria-hidden />
              Require Tenant Photo
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              Tenants must upload a photo in Shared Files. When on, the lease clause below is
              added to new and uploaded leases.
            </span>
          </span>
        </label>

        {photoPrefs.required ? (
          <div className={cn('rounded-sm border-2 border-line bg-surface px-3 py-3')}>
            <p className="text-xs font-semibold uppercase tracking-caps text-ink-faint">
              Tenant photo lease clause
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{photoClause}</p>
            <p className="mt-2 text-xs text-ink-muted">
              This wording is added to generated leases and editable copies when you upload a
              lease PDF. Change it anytime in Preferences.
            </p>
          </div>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 border-t border-line pt-4">
          <input
            type="checkbox"
            checked={conditionPrefs.required}
            onChange={(e) => updateCondition({ required: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand"
            data-onboarding="admin-condition-report-preferences"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-ink">
              <ClipboardCheck className="h-4 w-4 text-brand" aria-hidden />
              Require Condition Report (move-in / move-out inspection)
            </span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              When required, tenants must submit an electronic checklist within the windows
              below. You review submissions under Tenant Alerts before finalizing. Turn off to
              keep reports optional. Override per rental when editing a property.
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Move-in due (days after lease start)"
            type="number"
            min={1}
            max={90}
            value={String(conditionPrefs.moveInDays)}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (!Number.isFinite(next)) return
              updateCondition({
                moveInDays: Math.max(1, Math.min(90, Math.round(next))),
              })
            }}
            hint="Tenant deadline for the move-in checklist"
          />
          <Input
            label="Move-out due (days before lease end)"
            type="number"
            min={1}
            max={90}
            value={String(conditionPrefs.moveOutDays)}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (!Number.isFinite(next)) return
              updateCondition({
                moveOutDays: Math.max(1, Math.min(90, Math.round(next))),
              })
            }}
            hint="Tenant deadline for the move-out checklist"
          />
        </div>

        <div className={cn('rounded-sm border-2 border-line bg-surface px-3 py-3')}>
          <p className="text-xs font-semibold uppercase tracking-caps text-ink-faint">
            Condition report lease clause
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{conditionClause}</p>
          <p className="mt-2 text-xs text-ink-muted">
            Added to new and uploaded leases. Tenants record windows, blinds, utilities, and
            other items so problems are reported early and both parties share a clear record.
          </p>
        </div>
      </div>
    </Card>
  )
}
