import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSignature, Loader2, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { acceptRegistration, dismissRegistration } from '@/lib/portalUsersApi'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import { formatDate } from '@/lib/utils'
import type { PendingRegistration } from '@/types'

interface NewRegistrationsModalProps {
  open: boolean
  onClose: () => void
  registrations: PendingRegistration[]
  onRefresh: () => void
  onListRefresh: () => void
  onMarkNotificationsRead?: () => void
}

export function NewRegistrationsModal({
  open,
  onClose,
  registrations,
  onRefresh,
  onListRefresh,
  onMarkNotificationsRead,
}: NewRegistrationsModalProps) {
  const navigate = useNavigate()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setAcceptingId(null)
      setDismissingId(null)
      setError('')
    } else {
      onListRefresh()
      onMarkNotificationsRead?.()
    }
  }, [open, onListRefresh, onMarkNotificationsRead])

  const handleAccept = async (registration: PendingRegistration) => {
    setAcceptingId(registration.id)
    setError('')
    try {
      const result = await acceptRegistration(registration.id)
      onRefresh()
      onClose()
      navigate(`/studio/clients/${result.client.id}/contract`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept registration')
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDismiss = async (registration: PendingRegistration) => {
    setDismissingId(registration.id)
    setError('')
    try {
      await dismissRegistration(registration.id)
      onRefresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not dismiss registration')
    } finally {
      setDismissingId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Registrations" size="lg">
      {error && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      {registrations.length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title="No pending sign-ups"
          description="When someone registers as a tenant, you'll be notified and they will appear here."
        />
      ) : (
        <ul className="divide-y divide-line">
          {registrations.map((registration) => (
            <li
              key={registration.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{registration.name}</p>
                <p className="truncate text-sm text-ink-muted">{registration.email}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  Registered {formatDate(registration.createdAt)}
                  {registration.preferredLeaseMonths != null && (
                    <>
                      {' '}
                      · Prefers {formatLeaseLengthLabel(registration.preferredLeaseMonths)}
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    dismissingId === registration.id || acceptingId === registration.id
                  }
                  onClick={() => handleDismiss(registration)}
                >
                  {dismissingId === registration.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  disabled={
                    acceptingId === registration.id || dismissingId === registration.id
                  }
                  onClick={() => handleAccept(registration)}
                >
                  {acceptingId === registration.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSignature className="h-4 w-4" />
                  )}
                  Approve Tenant and Start Lease Draft
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
