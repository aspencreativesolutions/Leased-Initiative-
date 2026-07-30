import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Calendar, CreditCard, FileText, KeyRound, Rocket, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import { markClientNotificationsRead } from '@/lib/clientNotificationsApi'
import type { ClientNotification } from '@/types'

interface PortalNotificationBannerProps {
  notifications: ClientNotification[]
  onDismiss: () => void
}

function NotificationIcon({ type }: { type: ClientNotification['type'] }) {
  const className = 'h-4 w-4 shrink-0 text-brand'
  switch (type) {
    case 'contract_sent':
      return <FileText className={className} />
    case 'invoice_sent':
    case 'final_invoice_sent':
      return <CreditCard className={className} />
    case 'project_started':
      return <Rocket className={className} />
    case 'registration_accepted':
      return <UserCheck className={className} />
    case 'deadline_reminder':
    case 'follow_up':
      return <Calendar className={className} />
    case 'key_return':
      return <KeyRound className={className} />
    default:
      return <Bell className={className} />
  }
}

export function PortalNotificationBanner({
  notifications,
  onDismiss,
}: PortalNotificationBannerProps) {
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = useCallback(async () => {
    setDismissing(true)
    try {
      await markClientNotificationsRead(notifications.map((n) => n.id))
      onDismiss()
    } finally {
      setDismissing(false)
    }
  }, [notifications, onDismiss])

  if (notifications.length === 0) return null

  return (
    <div
      data-onboarding="portal-notifications"
      className="mb-6 overflow-hidden rounded-sm border-2 border-brand/40 bg-brand/5"
    >
      <div className="flex items-center justify-between gap-2 border-b border-brand/20 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Bell className="h-4 w-4 shrink-0 text-brand" />
          <p className="text-sm font-semibold text-ink">Updates for you</p>
          <span className="rounded-sm border border-brand/30 bg-surface-paper/60 px-1.5 py-0 text-[10px] font-bold text-brand">
            {notifications.length}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={handleDismiss}
          disabled={dismissing}
        >
          Dismiss all
        </Button>
      </div>

      <ul className="divide-y divide-brand/15">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className="flex items-start gap-3 px-3 py-2.5 sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <NotificationIcon type={notification.type} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-sm font-semibold text-ink">{notification.title}</p>
                  {notification.createdAt && (
                    <time
                      dateTime={notification.createdAt}
                      className="text-[11px] text-ink-faint"
                    >
                      {formatDateTime(notification.createdAt)}
                    </time>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-ink-muted">
                  {notification.message}
                </p>
              </div>
            </div>
            {notification.actionUrl && (
              <Link to={notification.actionUrl} className="shrink-0">
                <Button size="sm" variant="outline">
                  View
                </Button>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
