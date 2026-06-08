import { Link } from 'react-router-dom'
import { Bell, CreditCard, FileCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AdminNotification } from '@/types'

interface AdminNotificationBannerProps {
  notifications: AdminNotification[]
  onViewRegistrations: () => void
  onDismiss: () => void
  onViewClient?: (clientId: string, notificationId: string) => void
}

export function AdminNotificationBanner({
  notifications,
  onViewRegistrations,
  onDismiss,
  onViewClient,
}: AdminNotificationBannerProps) {
  if (notifications.length === 0) return null

  const latest = notifications[0]
  const paymentNotification = notifications.find((n) => n.type === 'payment_link_clicked')

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-sm border-2 border-accent bg-accent-light px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3 min-w-0">
        <Bell className="h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {notifications.length === 1
              ? latest.title
              : `${notifications.length} new notifications`}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">{latest.message}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {notifications.some((n) => n.type === 'registration') && (
          <Button size="sm" onClick={onViewRegistrations}>
            <UserPlus className="h-4 w-4" />
            View registrations
          </Button>
        )}
        {paymentNotification?.clientId && (
          onViewClient ? (
            <Button
              size="sm"
              onClick={() =>
                onViewClient(paymentNotification.clientId!, paymentNotification.id)
              }
            >
              <CreditCard className="h-4 w-4" />
              View client
            </Button>
          ) : (
            <Link to={`/clients/${paymentNotification.clientId}`}>
              <Button size="sm">
                <CreditCard className="h-4 w-4" />
                View client
              </Button>
            </Link>
          )
        )}
        {notifications.some((n) => n.type === 'contract_signed') && (
          <span className="flex items-center gap-1 self-center text-xs font-semibold text-emerald-700">
            <FileCheck className="h-4 w-4" />
            Contract signed
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
