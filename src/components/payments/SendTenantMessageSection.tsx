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

  function handleSend() {
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

  return (
    <div className="payment-message-shell" data-onboarding="admin-send-tenant-message">
      <div className="payment-message-shell__trigger">
        {!open ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full min-h-10 sm:w-auto sm:min-h-0"
            onClick={() => setOpen(true)}
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.25} />
            Send Message to Tenant
          </Button>
        ) : (
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Message to {firstName}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                Draft opens in Messages so replies stay on your phone.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11px] font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          'payment-message-shell__collapse',
          open && 'payment-message-shell__collapse--open'
        )}
        aria-hidden={!open}
      >
        <div className="payment-message-shell__collapse-inner">
          <div className="payment-message-shell__composer">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-caps text-ink-faint">
              Templates
            </p>
            <div
              className="mb-3 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Message templates"
            >
              {TENANT_MESSAGE_TEMPLATES.map((template) => {
                const selected = selectedTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={!open}
                    tabIndex={open ? undefined : -1}
                    onClick={() => applyTemplate(template.id)}
                    className={cn(
                      'min-w-0 max-w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2.5 py-1.5 text-left transition-colors',
                      selected
                        ? 'border-ink bg-ink text-surface-paper'
                        : 'border-line bg-surface-paper text-ink hover:border-ink-muted'
                    )}
                    title={template.summary}
                  >
                    <span className="block text-[11px] font-semibold leading-tight">
                      {template.label}
                    </span>
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
              rows={3}
              disabled={!open}
              tabIndex={open ? undefined : -1}
              placeholder={`Write a custom message to ${firstName}…`}
              className="min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y"
            />

            {error && (
              <p className="mt-2 text-[11px] font-medium text-red-600" role="alert">
                {error}
              </p>
            )}
            {justSent && !error && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
                Draft opened in Messages — send it there. Tenant replies appear on your device.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10 min-w-[4.5rem] sm:min-h-0"
                disabled={!open}
                tabIndex={open ? undefined : -1}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-h-10 min-w-[4.5rem] sm:min-h-0"
                disabled={!open}
                tabIndex={open ? undefined : -1}
                onClick={handleSend}
              >
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.25} />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
