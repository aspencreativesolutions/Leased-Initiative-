import { useState } from 'react'
import { CheckCircle, ExternalLink, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import { sendFinalInvoiceToPortal } from '@/lib/invoicesApi'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { paymentProviderLabel, resolvePaymentProvider } from '@/lib/paymentProvider'
import type { Client } from '@/types'

interface ClientFinalInvoiceCardProps {
  client: Client
}

export function ClientFinalInvoiceCard({ client }: ClientFinalInvoiceCardProps) {
  const { refresh } = useApp()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const invoice = client.finalInvoice
  if (!invoice) return null

  const providerName = paymentProviderLabel(resolvePaymentProvider(invoice.paymentProvider))

  const handleSend = async () => {
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const result = await sendFinalInvoiceToPortal(client.id)
      await refresh()
      setSuccess(result.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send final invoice')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-brand/30">
      <CardHeader
        title="Final Invoice"
        subtitle="Auto-generated when the project was marked complete"
      />

      {invoice.paidAt ? (
        <div className="flex gap-3 rounded-sm border-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Final balance received</p>
            <p className="mt-1">
              ${invoice.amount.toFixed(2)} {invoice.currency} on {formatDate(invoice.paidAt)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-faint">Remaining balance</dt>
              <dd className="font-semibold text-ink">
                ${invoice.amount.toFixed(2)} {invoice.currency}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-faint">Description</dt>
              <dd className="text-ink">{invoice.description}</dd>
            </div>
          </dl>

          {error && (
            <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-sm border-2 border-brand bg-brand/10 px-3 py-2 text-sm text-brand">
              {success}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSend}
              disabled={sending || !invoice.paymentLink || Boolean(invoice.sentToPortalAt)}
            >
              <Send className="h-4 w-4" />
              {sending
                ? 'Sending…'
                : invoice.sentToPortalAt
                  ? 'Final invoice sent'
                  : 'Send Final Invoice'}
            </Button>
            {invoice.sentToPortalAt && (
              <p className="self-center text-xs text-ink-muted">
                Sent to portal {formatDate(invoice.sentToPortalAt)}
              </p>
            )}
            {invoice.paymentLink && !invoice.sentToPortalAt && (
              <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  Preview {providerName} link
                </Button>
              </a>
            )}
          </div>

          {!invoice.paymentLink && (
            <p className="text-sm text-accent">
              {providerName} link not available. Check credentials in .env and restart the server.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
