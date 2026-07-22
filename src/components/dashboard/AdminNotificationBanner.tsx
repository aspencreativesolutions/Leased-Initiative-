import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, CreditCard, FileCheck, FilePen, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import type { AdminNotification } from '@/types'

interface AdminNotificationBannerProps {
  notifications: AdminNotification[]
  onViewRegistrations: () => void
  onDismiss: () => void
  onViewClient?: (clientId: string, notificationId: string) => void
}

function NotificationActions({
  notification,
  onViewRegistrations,
  onViewClient,
}: {
  notification: AdminNotification
  onViewRegistrations: () => void
  onViewClient?: (clientId: string, notificationId: string) => void
}) {
  if (notification.type === 'registration') {
    return (
      <Button size="sm" onClick={onViewRegistrations}>
        <UserPlus className="h-4 w-4" />
        View registrations
      </Button>
    )
  }

  if (notification.type === 'problem_report') {
    return (
      <Link to="/studio/alerts">
        <Button size="sm">
          <AlertTriangle className="h-4 w-4" />
          View alert
        </Button>
      </Link>
    )
  }

  if (notification.type === 'rent_payment' && notification.clientId) {
    return (
      <Link to="/studio/payments">
        <Button size="sm">
          <CreditCard className="h-4 w-4" />
          View payments
        </Button>
      </Link>
    )
  }

  if (!notification.clientId) return null

  const icon =
    notification.type === 'contract_signed' ? (
      <FileCheck className="h-4 w-4" />
    ) : notification.type === 'contract_needs_detail' ? (
      <FilePen className="h-4 w-4" />
    ) : (
      <CreditCard className="h-4 w-4" />
    )
  const label =
    notification.type === 'contract_signed'
      ? 'View'
      : notification.type === 'contract_needs_detail'
        ? 'Edit lease'
        : 'View client'

  const clientLink =
    notification.type === 'contract_needs_detail' && notification.clientId
      ? `/studio/clients/${notification.clientId}/contract`
      : `/studio/clients/${notification.clientId}`

  if (onViewClient) {
    if (notification.type === 'contract_needs_detail' && notification.clientId) {
      return (
        <Link to={`/studio/clients/${notification.clientId}/contract`}>
          <Button size="sm">
            {icon}
            {label}
          </Button>
        </Link>
      )
    }

    return (
      <Button
        size="sm"
        onClick={() => onViewClient(notification.clientId!, notification.id)}
      >
        {icon}
        {label}
      </Button>
    )
  }

  return (
    <Link to={clientLink}>
      <Button size="sm">
        {icon}
        {label}
      </Button>
    </Link>
  )
}

export function AdminNotificationBanner({
  notifications,
  onViewRegistrations,
  onDismiss,
  onViewClient,
}: AdminNotificationBannerProps) {
  if (notifications.length === 0) return null

  return (
    <div className="mb-3 overflow-hidden rounded-sm border-2 border-accent bg-accent-light" data-onboarding="admin-notifications">
      <div className="flex items-center justify-between gap-2 border-b border-accent/25 px-3 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Bell className="h-4 w-4 shrink-0 text-accent" />
          <p className="text-sm font-semibold text-ink">Recent activity</p>
          <span className="rounded-sm border border-accent/30 bg-surface-paper/60 px-1 py-0 text-[10px] font-bold leading-4 text-accent">
            {notifications.length}
          </span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onDismiss}>
          Dismiss all
        </Button>
      </div>

      <ul className="divide-y divide-accent/20">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className="flex items-start gap-2 px-3 py-1.5 first:pt-1 sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-sm font-semibold text-ink">{notification.title}</p>
                {notification.createdAt && (
                  <time
                    dateTime={notification.createdAt}
                    className="shrink-0 text-[11px] text-ink-faint"
                  >
                    {formatDateTime(notification.createdAt)}
                  </time>
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-muted">
                {notification.message}
              </p>
            </div>
            <div className="flex shrink-0 pt-0.5 sm:pt-0">
              <NotificationActions
                notification={notification}
                onViewRegistrations={onViewRegistrations}
                onViewClient={onViewClient}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
