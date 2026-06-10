import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import {
  deleteClientAccount,
  fetchClientAccounts,
  type ClientAccount,
} from '@/lib/clientAccountsApi'
import { formatDate } from '@/lib/utils'

interface ClientAccountsModalProps {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

export function ClientAccountsModal({ open, onClose, onChanged }: ClientAccountsModalProps) {
  const [accounts, setAccounts] = useState<ClientAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchClientAccounts()
      setAccounts(data.accounts)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load client accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setConfirmId(null)
      loadAccounts()
    }
  }, [open, loadAccounts])

  const handleDelete = async (account: ClientAccount) => {
    setDeletingId(account.id)
    setError('')
    try {
      await deleteClientAccount(account.id)
      setConfirmId(null)
      await loadAccounts()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete account')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Client Accounts" size="lg">
      <p className="mb-4 text-sm text-ink-muted">
        Portal login accounts for your clients. Deleting an account also removes their client
        profile, contracts, files, and project history.
      </p>

      {error && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading accounts…
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No client accounts"
          description="When someone registers at the client portal, their account will appear here."
        />
      ) : (
        <ul className="divide-y divide-line">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{account.name}</p>
                <p className="truncate text-sm text-ink-muted">{account.email}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  Registered {formatDate(account.createdAt.split('T')[0])}
                  {account.linked && account.clientName
                    ? ` · Linked to ${account.clientName}`
                    : ' · Not linked to a client profile'}
                </p>
              </div>
              {confirmId === account.id ? (
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <p className="max-w-xs text-xs text-accent">
                    Delete this account
                    {account.linked ? ' and remove their client profile' : ''}? This cannot be
                    undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletingId === account.id}
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deletingId === account.id}
                      onClick={() => handleDelete(account)}
                    >
                      {deletingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete account
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setConfirmId(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
