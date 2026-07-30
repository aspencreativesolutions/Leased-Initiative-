import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Bell, ClipboardCheck, Loader2 } from 'lucide-react'
import { TenantAlertAttachment } from '@/components/dashboard/TenantAlertPhoto'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { useTenantAlerts } from '@/hooks/useTenantAlerts'
import { ApiError } from '@/lib/api'
import { getTenantAddress } from '@/lib/clientUtils'
import {
  conditionReportKindLabel,
  conditionReportStatusLabel,
} from '@/lib/conditionReport'
import {
  fetchAdminConditionReport,
  reviewConditionReport,
} from '@/lib/conditionReportsApi'
import { formatDateTime } from '@/lib/utils'
import type {
  AdminNotification,
  Client,
  ConditionReport,
  ContractData,
} from '@/types'

function resolveAlertTenantName(
  alert: AdminNotification,
  client: Client | undefined
): string {
  return alert.tenantName?.trim() || client?.name?.trim() || 'Unknown tenant'
}

function resolveAlertAddress(
  alert: AdminNotification,
  client: Client | undefined,
  contract: ContractData | undefined
): string {
  if (alert.address?.trim()) return alert.address.trim()
  if (client) return getTenantAddress(client, contract)
  return '—'
}

function resolveAlertDescription(alert: AdminNotification): string {
  if (alert.note?.trim()) return alert.note.trim()
  if (alert.note !== undefined && !alert.note.trim()) return 'No note provided.'
  const message = alert.message ?? ''
  const colon = message.indexOf(': ')
  if (colon >= 0) {
    const extracted = message.slice(colon + 2).trim()
    if (extracted) return extracted
  }
  return 'No note provided.'
}

function ConditionReportReviewPanel({
  reportId,
  onReviewed,
}: {
  reportId: string
  onReviewed: () => void
}) {
  const [report, setReport] = useState<ConditionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminConditionReport(reportId)
      setReport(data.report)
      setNotes(data.report.landlordNotes ?? '')
      setLoaded(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load report')
    } finally {
      setLoading(false)
    }
  }

  const review = async (action: 'approve' | 'request_changes') => {
    setBusy(true)
    setError('')
    try {
      await reviewConditionReport({ reportId, action, landlordNotes: notes })
      onReviewed()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save review')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded && !loading) {
    return (
      <Button size="sm" variant="outline" onClick={() => void load()}>
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
        Review checklist
      </Button>
    )
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading checklist…
      </p>
    )
  }

  if (!report) {
    return (
      <p className="text-sm text-accent">{error || 'Report not found.'}</p>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-sm border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">
          {conditionReportKindLabel(report.kind)} checklist
        </span>
        <span className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
          {conditionReportStatusLabel(report.status)}
        </span>
      </div>
      <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
        {report.items.map((item) => (
          <li key={item.id} className="border-t border-line pt-2 first:border-t-0 first:pt-0">
            <p className="font-medium text-ink">
              {item.area} — {item.label}
            </p>
            <p className="text-ink-muted">
              {item.condition ? item.condition.replace('_', ' ') : 'Not rated'}
              {item.notes ? ` · ${item.notes}` : ''}
              {(item.photoFileIds?.length ?? 0) > 0
                ? ` · ${item.photoFileIds!.length} photo(s)`
                : ''}
            </p>
            {(item.photoFileIds ?? []).slice(0, 2).map((fileId) => (
              <div key={fileId} className="mt-1">
                <TenantAlertAttachment
                  fileId={fileId}
                  alt={`${item.label} photo`}
                />
              </div>
            ))}
          </li>
        ))}
      </ul>
      {report.status === 'submitted' ? (
        <>
          <Textarea
            label="Review notes (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            hint="Shown to the tenant if you request changes"
          />
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void review('approve')}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void review('request_changes')}
            >
              Request changes
            </Button>
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-muted">
          This report is {conditionReportStatusLabel(report.status).toLowerCase()}.
        </p>
      )}
    </div>
  )
}

export function TenantAlertsPage() {
  const { clients, contracts } = useApp()
  const { alerts, unreadCount, loading, error, refresh } = useTenantAlerts()
  const { markRead } = useAdminNotifications()

  const handleMarkRead = async (alert: AdminNotification) => {
    if (alert.read) return
    await markRead({ ids: [alert.id] })
    await refresh()
  }

  return (
    <div className="w-full min-w-0" data-onboarding="admin-tenant-alerts">
      <PageHeader
        title="Tenant Alerts"
        subtitle={
          loading && alerts.length === 0
            ? 'Loading alerts…'
            : alerts.length === 0
              ? 'Maintenance requests and condition reports appear here.'
              : unreadCount > 0
                ? `${unreadCount} unread · ${alerts.length} total`
                : `${alerts.length} ${alerts.length === 1 ? 'alert' : 'alerts'}`
        }
      />

      {error ? (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

      {alerts.length === 0 && !loading ? (
        <EmptyState
          icon={Bell}
          title="No tenant alerts yet"
          description="When a tenant logs a repair or submits a move-in / move-out condition report, it shows up here so you can review photos and finalize the record."
        />
      ) : (
        <ul className="space-y-4">
          {alerts.map((alert) => {
            const client = clients.find((c) => c.id === alert.clientId)
            const contract = contracts.find((c) => c.clientId === alert.clientId)
            const name = resolveAlertTenantName(alert, client)
            const address = resolveAlertAddress(alert, client, contract)
            const description = resolveAlertDescription(alert)
            const isCondition = alert.type === 'condition_report'

            return (
              <li key={alert.id}>
                <Card
                  className={
                    alert.read
                      ? 'border-line'
                      : 'border-accent/50 bg-accent-light/30'
                  }
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {!alert.read ? (
                          <span className="inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-accent-light px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-caps text-accent">
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            New
                          </span>
                        ) : null}
                        {isCondition ? (
                          <span className="rounded-sm border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
                            Condition report
                            {alert.conditionReportKind
                              ? ` · ${conditionReportKindLabel(alert.conditionReportKind)}`
                              : ''}
                          </span>
                        ) : alert.problemType ? (
                          <span className="rounded-sm border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps text-ink-muted">
                            {alert.problemType}
                          </span>
                        ) : null}
                        {alert.createdAt ? (
                          <time
                            dateTime={alert.createdAt}
                            className="text-[11px] text-ink-faint"
                          >
                            {formatDateTime(alert.createdAt)}
                          </time>
                        ) : null}
                      </div>

                      <div>
                        <p className="label-caps text-ink-faint">Tenant</p>
                        <p className="text-sm font-semibold text-ink">{name}</p>
                      </div>

                      <div>
                        <p className="label-caps text-ink-faint">Address</p>
                        <p className="text-sm text-ink">{address}</p>
                      </div>

                      <div>
                        <p className="label-caps text-ink-faint">
                          {isCondition ? 'Summary' : 'Note'}
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-ink">{description}</p>
                      </div>

                      {alert.fileId ? (
                        <div>
                          <p className="mb-1.5 label-caps text-ink-faint">Photo</p>
                          <TenantAlertAttachment
                            fileId={alert.fileId}
                            fileName={alert.fileName}
                            alt={`Photo from ${name}'s repair report`}
                          />
                        </div>
                      ) : null}

                      {isCondition && alert.conditionReportId ? (
                        <ConditionReportReviewPanel
                          reportId={alert.conditionReportId}
                          onReviewed={() => {
                            void handleMarkRead(alert)
                            void refresh()
                          }}
                        />
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      {alert.clientId ? (
                        <Link to={`/studio/clients/${alert.clientId}`}>
                          <Button
                            size="sm"
                            onClick={() => {
                              void handleMarkRead(alert)
                            }}
                          >
                            View tenant
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </Link>
                      ) : null}
                      {!alert.read ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void handleMarkRead(alert)
                          }}
                        >
                          Mark as read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
