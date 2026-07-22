import { useState } from 'react'
import { Loader2, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { removeClientRecord } from '@/lib/clientAccountsApi'

interface RemoveClientModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
  hasLinkedAccount: boolean
  onRemoved: () => void
}

export function RemoveClientModal({
  open,
  onClose,
  clientId,
  clientName,
  hasLinkedAccount,
  onRemoved,
}: RemoveClientModalProps) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  const handleRemove = async () => {
    setRemoving(true)
    setError('')
    try {
      await removeClientRecord(clientId)
      onRemoved()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not remove client'
      setError(
        message.includes('API route not found')
          ? 'Server needs a restart to load the latest API. Stop the app (Ctrl+C) and run npm run dev again.'
          : message
      )
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Remove client">
      {error && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      <p className="text-sm text-ink-muted">
        Remove <strong className="text-ink">{clientName}</strong> from your client roster? Their
        leases, files, invoices, and project history will be deleted.
      </p>
      {hasLinkedAccount && (
        <p className="mt-3 text-sm text-ink-muted">
          Their portal login account will be kept — they can still sign in, but will no longer see
          this project until you accept or add them again.
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" disabled={removing} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" disabled={removing} onClick={handleRemove}>
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserMinus className="h-4 w-4" />
          )}
          Remove client
        </Button>
      </div>
    </Modal>
  )
}
