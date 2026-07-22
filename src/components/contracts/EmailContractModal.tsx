import { useState } from 'react'
import { Mail, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import type { Client, ContractData } from '@/types'

interface EmailContractModalProps {
  open: boolean
  onClose: () => void
  client: Client
  contract: ContractData
  onSent: () => void
}

export function EmailContractModal({
  open,
  onClose,
  client,
  onSent,
}: EmailContractModalProps) {
  const { updateClient } = useApp()
  const [subject, setSubject] = useState(
    `Lease Agreement for ${client.businessName}`
  )
  const [body, setBody] = useState(
    `Hi ${client.name},\n\nAttached is the lease for your rental. Please review it carefully, and let me know if you have any questions. Once everything looks good, you can sign and return it so we can move forward.\n\nBest regards`
  )
  const [sent, setSent] = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulated email send — opens mail client in production you'd use an API
    const mailto = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n[Lease PDF attached — download from Leased]')}`
    window.open(mailto, '_blank')
    updateClient(client.id, { contractStatus: 'Sent', projectStatus: 'Contract Sent' })
    setSent(true)
    onSent()
    setTimeout(() => {
      onClose()
      setSent(false)
    }, 1500)
  }

  return (
    <Modal open={open} onClose={onClose} title="Email Lease to Tenant" size="lg">
      {sent ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Mail className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="font-medium text-stone-800">Lease marked as sent!</p>
          <p className="mt-1 text-sm text-stone-500">
            Your email client should open with the message ready to send.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
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
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span>
              Lease-{client.businessName.replace(/\s+/g, '-')}.pdf (attached)
            </span>
          </div>
          <p className="text-xs text-stone-400">
            This opens your default email app. Download the PDF first if you need to attach it manually.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
