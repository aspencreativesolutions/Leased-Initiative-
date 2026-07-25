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
  const [connectionCode, setConnectionCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setInviteUrl('')
      setConnectionCode('')
      setCopied(null)
      setError('')
      setSubmitting(false)
    }
  }, [open])

  const handleCreate = async () => {
    setSubmitting(true)
    setError('')
    setCopied(null)
    try {
      const result = await createTenantInvite()
      setInviteUrl(result.inviteUrl)
      setConnectionCode(result.connectionCode ?? result.invite.connectionCode ?? '')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create invite link')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async (value: string, kind: 'link' | 'code') => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
    } catch {
      setError('Could not copy — select and copy it manually')
    }
  }

  const companyName = settings?.businessName?.trim() || 'your agency'
  const inviteOnly = settings?.tenantDiscoveryMode === 'invite_only'

  return (
    <Modal open={open} onClose={onClose} title="Send Invite">
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Generate a one-time connection link and code for{' '}
          <span className="font-semibold text-ink">{companyName}</span>. The tenant chooses an
          available rental during signup
          {inviteOnly ? ' (required in Invite-Only mode)' : ''}, then appears under Waiting to
          Connect. Each invite can only be used once.
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
            {submitting ? 'Generating…' : 'Generate connection link'}
          </Button>
        ) : (
          <>
            <div>
              <p className="label-caps mb-2">Connection link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  onFocus={(event) => event.target.select()}
                />
                <Button type="button" variant="outline" onClick={() => void handleCopy(inviteUrl, 'link')}>
                  {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            {connectionCode ? (
              <div>
                <p className="label-caps mb-2">Connection code</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={connectionCode}
                    className="min-w-0 flex-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5 font-mono text-sm tracking-widest text-ink"
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopy(connectionCode, 'code')}
                  >
                    {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === 'code' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  Tenants can also enter this code on the signup page if they don’t have the link.
                </p>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setInviteUrl('')
                setConnectionCode('')
                setCopied(null)
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
