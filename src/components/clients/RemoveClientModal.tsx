import { useState } from 'react'
import { Archive, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { archiveClientRecord, removeClientRecord } from '@/lib/clientAccountsApi'

interface RemoveClientModalProps {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
  hasLinkedAccount: boolean
  onRemoved: () => void
  /** Called after a successful archive (tenant moves to Past Tenants). */
  onArchived?: () => void
}

type BusyAction = 'archive' | 'delete' | null

export function RemoveClientModal({
  open,
  onClose,
  clientId,
  clientName,
  hasLinkedAccount,
  onRemoved,
  onArchived,
}: RemoveClientModalProps) {
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState('')
  const [needsForceArchive, setNeedsForceArchive] = useState(false)

  const handleArchive = async (force = false) => {
    setBusy('archive')
    setError('')
    try {
      await archiveClientRecord(clientId, { force })
      setNeedsForceArchive(false)
      onArchived?.()
      onRemoved()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'condition_report_pending') {
        setNeedsForceArchive(true)
        setError(err.message)
      } else {
        const message = err instanceof ApiError ? err.message : 'Could not archive tenant'
        setError(
          message.includes('API route not found')
            ? 'Server needs a restart to load the latest API. Stop the app (Ctrl+C) and run npm run dev again.'
            : message
        )
      }
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    setBusy('delete')
    setError('')
    try {
      await removeClientRecord(clientId)
      onRemoved()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not delete tenant'
      setError(
        message.includes('API route not found')
          ? 'Server needs a restart to load the latest API. Stop the app (Ctrl+C) and run npm run dev again.'
          : message
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Remove Tenant">
      {error && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      <p className="text-sm text-ink">
        Would you like to archive this tenant or permanently delete them?
      </p>
      <p className="mt-3 text-sm text-ink-muted">
        <strong className="text-ink">{clientName}</strong>
        {' — '}
        Archive keeps their history under <strong className="text-ink">Past Tenants</strong> in
        Company Profile (labeled Archived). Delete permanently removes their leases, files,
        invoices, and project history.
      </p>
      {hasLinkedAccount && (
        <p className="mt-3 text-sm text-ink-muted">
          Their portal login account will be kept either way — they can still sign in, but will no
          longer see this project until you accept or add them again.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={busy !== null} onClick={onClose}>
          Cancel
        </Button>
        {needsForceArchive ? (
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => void handleArchive(true)}
          >
            {busy === 'archive' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archive anyway
          </Button>
        ) : (
          <Button variant="outline" disabled={busy !== null} onClick={() => void handleArchive()}>
            {busy === 'archive' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archive
          </Button>
        )}
        <Button variant="danger" disabled={busy !== null} onClick={handleDelete}>
          {busy === 'delete' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </Button>
      </div>
    </Modal>
  )
}
