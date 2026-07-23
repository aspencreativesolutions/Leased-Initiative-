import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { createTenantInvite } from '@/lib/portalUsersApi'
import { useApp } from '@/context/AppContext'

interface SendInviteModalProps {
  open: boolean
  onClose: () => void
}

export function SendInviteModal({ open, onClose }: SendInviteModalProps) {
  const { settings } = useApp()
  const [inviteUrl, setInviteUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setInviteUrl('')
      setCopied(false)
      setError('')
      setSubmitting(false)
    }
  }, [open])

  const handleCreate = async () => {
    setSubmitting(true)
    setError('')
    setCopied(false)
    try {
      const result = await createTenantInvite()
      setInviteUrl(result.inviteUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create invite link')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setError('Could not copy link — select and copy it manually')
    }
  }

  const companyName = settings?.businessName?.trim() || 'your agency'

  return (
    <Modal open={open} onClose={onClose} title="Send Invite">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Generate a link so a tenant can register already linked to{' '}
          <span className="font-semibold text-ink">{companyName}</span>. They’ll choose a
          rental from your list during signup, then appear under Waiting to Connect for your
          approval.
        </p>

        {error && (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        {!inviteUrl ? (
          <Button type="button" onClick={handleCreate} disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {submitting ? 'Generating…' : 'Generate invite link'}
          </Button>
        ) : (
          <>
            <div>
              <p className="label-caps mb-2">Invite link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  onFocus={(event) => event.target.select()}
                />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setInviteUrl('')
                setCopied(false)
              }}
            >
              Create another invite
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
