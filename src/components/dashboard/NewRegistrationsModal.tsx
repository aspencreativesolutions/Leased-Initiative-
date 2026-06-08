import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSignature, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { apiFetch, ApiError } from '@/lib/api'
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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setAcceptingId(null)
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
      const result = await apiFetch<{
        client: { id: string }
        contract: { id: string } | null
      }>(`/api/data/accept-registration/${registration.id}`, {
        method: 'POST',
      })
      onRefresh()
      onClose()
      navigate(`/clients/${result.client.id}/contract`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept registration')
    } finally {
      setAcceptingId(null)
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
          icon={Users}
          title="No pending sign-ups"
          description="When someone registers at the client portal, you'll be notified and they will appear here."
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
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                disabled={acceptingId === registration.id}
                onClick={() => handleAccept(registration)}
              >
                {acceptingId === registration.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4" />
                )}
                Accept User and Start Contract Draft
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
