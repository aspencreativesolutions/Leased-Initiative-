import { useState } from 'react'
import { CheckCircle, ExternalLink, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import { generateDepositInvoice, sendInvoiceToPortal } from '@/lib/invoicesApi'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { paymentProviderLabel, resolvePaymentProvider } from '@/lib/paymentProvider'
import type { Client } from '@/types'

interface ClientInvoiceCardProps {
  client: Client
}

export function ClientInvoiceCard({ client }: ClientInvoiceCardProps) {
  const { refresh } = useApp()
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const invoice = client.invoice
  const provider = resolvePaymentProvider(invoice?.paymentProvider)
  const providerName = paymentProviderLabel(provider)

  if (!client.isOfficialClient) {
    return null
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      await generateDepositInvoice(client.id)
      await refresh()
      setSuccess('Deposit invoice generated from contract.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  const handleCreatePayPalLink = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      await generateDepositInvoice(client.id)
      await refresh()
      setSuccess(`${providerName} payment link created.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create PayPal link')
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const result = await sendInvoiceToPortal(client.id)
      await refresh()
      setSuccess(result.message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send invoice')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Deposit Invoice"
        subtitle="Auto-generated when the client signed their contract"
      />

      {!invoice ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            No invoice yet. It is created automatically when the client signs. For signed clients,
            generate it from the contract below.
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate deposit invoice'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {client.paymentStatus === 'Deposit Paid' && invoice.paidAt ? (
            <div className="flex gap-3 rounded-sm border-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Down payment received</p>
                <p className="mt-1">
                  ${invoice.amount.toFixed(2)} {invoice.currency} on{' '}
                  {formatDate(invoice.paidAt)}
                </p>
              </div>
            </div>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-faint">Amount</dt>
                <dd className="font-semibold text-ink">
                  ${invoice.amount.toFixed(2)} {invoice.currency}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-faint">Services</dt>
                <dd className="text-ink">{invoice.description}</dd>
              </div>
            </dl>
          )}

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

          {!invoice.paidAt && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSend}
                disabled={sending || !invoice.paymentLink || Boolean(invoice.sentToPortalAt)}
              >
                <Send className="h-4 w-4" />
                {sending
                  ? 'Sending…'
                  : invoice.sentToPortalAt
                    ? 'Invoice link sent'
                    : 'Send Invoice Link'}
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
          )}

          {!invoice.paymentLink && !invoice.paidAt && (
            <div className="space-y-3">
              <p className="text-sm text-accent">
                {providerName} link not available. Add credentials to <code>.env</code>, restart{' '}
                <code>npm run dev</code>, then create the link below.
              </p>
              <Button variant="outline" onClick={handleCreatePayPalLink} disabled={generating}>
                {generating ? 'Creating link…' : `Create ${providerName} link`}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
