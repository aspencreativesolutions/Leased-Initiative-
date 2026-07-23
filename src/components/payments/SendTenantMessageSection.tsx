import { useEffect, useId, useState } from 'react'
import { Check, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { getFirstName } from '@/lib/clientUtils'
import {
  TENANT_MESSAGE_TEMPLATES,
  openSmsCompose,
  type TenantMessageVars,
} from '@/lib/tenantMessageTemplates'
import { cn } from '@/lib/utils'

interface SendTenantMessageSectionProps {
  tenantName: string
  address: string
  phone?: string
  landlordName: string
  onSent: (message: string) => void
  /** Open the composer immediately (e.g. deep-link from Official Tenants). */
  defaultOpen?: boolean
}

export function SendTenantMessageSection({
  tenantName,
  address,
  phone,
  landlordName,
  onSent,
  defaultOpen = false,
}: SendTenantMessageSectionProps) {
  const baseId = useId()
  const firstName = getFirstName(tenantName)
  const vars: TenantMessageVars = {
    tenantName: firstName,
    address,
    landlordName,
  }

  const [open, setOpen] = useState(defaultOpen)
  const [message, setMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [justSent, setJustSent] = useState(false)

  useEffect(() => {
    if (!open) return
    setMessage('')
    setSelectedTemplateId(null)
    setError(null)
    setJustSent(false)
  }, [open, tenantName, address, landlordName])

  function applyTemplate(templateId: string) {
    const template = TENANT_MESSAGE_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    setSelectedTemplateId(templateId)
    setMessage(template.build(vars))
    setError(null)
    setJustSent(false)
  }

  function handleDone() {
    const body = message.trim()
    if (!body) {
      setError('Write a message or choose a template first.')
      return
    }
    if (!phone?.trim()) {
      setError('This tenant has no phone number on file.')
      return
    }
    const opened = openSmsCompose(phone, body)
    if (!opened) {
      setError('Could not open Messages with this phone number.')
      return
    }
    onSent(body)
    setJustSent(true)
    setError(null)
  }

  if (!open) {
    return (
      <div className="border-t border-line bg-surface/40 px-4 py-2.5 sm:px-5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.25} />
          Send Message to Tenant
        </Button>
      </div>
    )
  }

  return (
    <div
      className="border-t border-line bg-surface/50 px-4 py-3 sm:px-5"
      data-onboarding="admin-send-tenant-message"
    >
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Send Message to Tenant</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Opens Messages on your phone so replies stay in your personal conversation with{' '}
            {firstName}.
          </p>
        </div>
        <button
          type="button"
          className="text-[11px] font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
        Templates
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Message templates">
        {TENANT_MESSAGE_TEMPLATES.map((template) => {
          const selected = selectedTemplateId === template.id
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.id)}
              className={cn(
                'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 text-left transition-colors',
                selected
                  ? 'border-ink bg-ink text-surface-paper'
                  : 'border-line bg-surface-paper text-ink hover:border-ink-muted'
              )}
              title={template.summary}
            >
              <span className="block text-[11px] font-semibold leading-tight">{template.label}</span>
              <span
                className={cn(
                  'mt-0.5 block text-[10px] leading-tight',
                  selected ? 'text-surface-paper/80' : 'text-ink-faint'
                )}
              >
                {template.summary}
              </span>
            </button>
          )
        })}
      </div>

      <Textarea
        id={`${baseId}-message`}
        label="Message"
        hint="Edit freely, or write your own from scratch."
        value={message}
        onChange={(e) => {
          setMessage(e.target.value)
          setSelectedTemplateId(null)
          setJustSent(false)
          setError(null)
        }}
        rows={4}
        placeholder={`Write a custom message to ${firstName}…`}
      />

      {error && <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p>}
      {justSent && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
          Draft opened in Messages — send it there. Tenant replies appear on your device.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleDone}>
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.25} />
          Done
        </Button>
      </div>
    </div>
  )
}
