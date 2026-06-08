import { useState } from 'react'
import { Send, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { apiFetch, ApiError } from '@/lib/api'
import type { Client, ContractData } from '@/types'

interface SendContractModalProps {
  open: boolean
  onClose: () => void
  client: Client
  contract: ContractData
  onSent: () => void
}

export function SendContractModal({
  open,
  onClose,
  client,
  contract,
  onSent,
}: SendContractModalProps) {
  const { updateClient, refresh, saveContract } = useApp()
  const [mode, setMode] = useState<'portal' | 'email'>('portal')
  const [subject, setSubject] = useState(
    `Website Project Contract for ${client.businessName}`
  )
  const [body, setBody] = useState(
    `Hi ${client.name},\n\nYour contract is ready in your Client Craft portal. Please sign in to review and confirm it.\n\nPortal: ${window.location.origin}/portal/login\n\nBest regards`
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendToPortal = async () => {
    setSending(true)
    setError('')
    try {
      await saveContract(contract)
      const result = await apiFetch<{
        message: string
        contract?: ContractData
        sentAt?: string
      }>(`/api/contracts/${contract.id}/send`, {
        method: 'POST',
      })
      const sentContract: ContractData = {
        ...contract,
        ...(result.contract ?? {}),
        sentAt: result.sentAt ?? result.contract?.sentAt ?? new Date().toISOString(),
        viewedAt: undefined,
        confirmedByClient: false,
        clientSignature: undefined,
        clientSignDate: undefined,
        signedAt: undefined,
      }
      await saveContract(sentContract)
      updateClient(client.id, { contractStatus: 'Sent', projectStatus: 'Contract Sent' })
      await refresh()
      setSuccess(result.message)
      onSent()
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 2000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send contract')
    } finally {
      setSending(false)
    }
  }

  const handleEmailFallback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const mailto = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n[Contract PDF attached — download from Client Craft]')}`
      window.open(mailto, '_blank')
      await saveContract(contract)
      const result = await apiFetch<{
        message: string
        contract?: ContractData
        sentAt?: string
      }>(`/api/contracts/${contract.id}/send`, {
        method: 'POST',
      })
      const sentContract: ContractData = {
        ...contract,
        ...(result.contract ?? {}),
        sentAt: result.sentAt ?? result.contract?.sentAt ?? new Date().toISOString(),
      }
      await saveContract(sentContract)
      updateClient(client.id, { contractStatus: 'Sent', projectStatus: 'Contract Sent' })
      await refresh()
      setSuccess('Email opened and contract sent to the client portal.')
      onSent()
      setTimeout(() => {
        onClose()
        setSuccess('')
      }, 2000)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not send contract to portal. Use Client portal mode instead.'
      )
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setError('')
    setSuccess('')
    setMode('portal')
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Send Contract to Client"
      size="lg"
    >
      {success ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="font-medium text-stone-800">{success}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('portal')}
              className={`flex-1 rounded-sm border-2 px-3 py-2 text-xs font-bold uppercase tracking-caps ${
                mode === 'portal'
                  ? 'border-ink bg-ink text-surface-paper'
                  : 'border-line text-ink-muted'
              }`}
            >
              Client portal
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 rounded-sm border-2 px-3 py-2 text-xs font-bold uppercase tracking-caps ${
                mode === 'email'
                  ? 'border-ink bg-ink text-surface-paper'
                  : 'border-line text-ink-muted'
              }`}
            >
              Email (fallback)
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'portal' ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                Sends the contract to <strong>{client.name}</strong>&apos;s client portal account.
                They must register at <code className="text-xs">/portal/register</code> with email{' '}
                <strong>{client.email}</strong> if they haven&apos;t already.
              </p>
              <Input label="Client email" value={client.email} readOnly />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSendToPortal} disabled={sending}>
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : 'Send to client account'}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailFallback} className="space-y-4">
              <Input label="To" value={client.email} readOnly />
              <Input
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <Textarea
                label="Message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                required
              />
              <p className="text-xs text-stone-400">
                Opens your email app. Download the PDF first if you need to attach it manually.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="secondary">
                  <Mail className="h-4 w-4" />
                  Open email
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}
