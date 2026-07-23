import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Bell } from 'lucide-react'
import { TenantAlertAttachment } from '@/components/dashboard/TenantAlertPhoto'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { useTenantAlerts } from '@/hooks/useTenantAlerts'
import { getTenantAddress } from '@/lib/clientUtils'
import { formatDateTime } from '@/lib/utils'
import type { AdminNotification, Client, ContractData } from '@/types'

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
  // Legacy alerts may only carry the note inside the composed message
  if (alert.note !== undefined && !alert.note.trim()) return 'No note provided.'
  const message = alert.message ?? ''
  const colon = message.indexOf(': ')
  if (colon >= 0) {
    const extracted = message.slice(colon + 2).trim()
    if (extracted) return extracted
  }
  return 'No note provided.'
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
            ? 'Loading problem reports…'
            : alerts.length === 0
              ? 'Problem reports from tenants appear here.'
              : unreadCount > 0
                ? `${unreadCount} unread · ${alerts.length} total`
                : `${alerts.length} ${alerts.length === 1 ? 'report' : 'reports'}`
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
          description="When a tenant logs a repair or concern, it shows up here with their name, address, optional note, and the required photo they attached."
        />
      ) : (
        <ul className="space-y-4">
          {alerts.map((alert) => {
            const client = clients.find((c) => c.id === alert.clientId)
            const contract = contracts.find((c) => c.clientId === alert.clientId)
            const name = resolveAlertTenantName(alert, client)
            const address = resolveAlertAddress(alert, client, contract)
            const description = resolveAlertDescription(alert)

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
                        {alert.problemType ? (
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
                        <p className="label-caps text-ink-faint">Note</p>
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
