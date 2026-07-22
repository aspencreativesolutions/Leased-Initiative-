import { useState } from 'react'
import { ExternalLink, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import {
  generateDepositInvoice,
  generateFinalInvoice,
  sendFinalInvoiceToPortal,
  sendInvoiceToPortal,
} from '@/lib/invoicesApi'
import {
  getRemainingBalanceAmount,
  hasRemainingBalanceDue,
  isDepositInvoicePaid,
} from '@/lib/clientUtils'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { paymentProviderLabel, resolvePaymentProvider } from '@/lib/paymentProvider'
import type { Client } from '@/types'

interface ClientInvoiceCardProps {
  client: Client
}

export function ClientInvoiceCard({ client }: ClientInvoiceCardProps) {
  const { refresh, getContractForClient } = useApp()
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const contract = getContractForClient(client.id)
  const invoice = client.invoice
  const finalInvoice = client.finalInvoice
  const depositPaid = isDepositInvoicePaid(client)
  const remainingDue = hasRemainingBalanceDue(contract)
  const expectedRemaining = getRemainingBalanceAmount(contract)
  const provider = resolvePaymentProvider(invoice?.paymentProvider ?? finalInvoice?.paymentProvider)
  const providerName = paymentProviderLabel(provider)

  if (!client.isOfficialClient) {
    return null
  }

  if (depositPaid && !remainingDue && !finalInvoice) {
    return null
  }

  if (depositPaid && finalInvoice?.paidAt) {
    return null
  }

  const handleGenerateDeposit = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      await generateDepositInvoice(client.id)
      await refresh()
      setSuccess('Deposit invoice generated from lease.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateDepositLink = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      await generateDepositInvoice(client.id)
      await refresh()
      setSuccess(`${providerName} payment link created.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create payment link')
    } finally {
      setGenerating(false)
    }
  }

  const handleSendDeposit = async () => {
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

  const handleGenerateFinal = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      await generateFinalInvoice(client.id)
      await refresh()
      setSuccess('Remaining balance invoice generated.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate remaining balance invoice')
    } finally {
      setGenerating(false)
    }
  }

  const handleSendFinal = async () => {
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

  if (depositPaid) {
    return (
      <Card className="border-brand/30">
        <CardHeader
          title="Remaining Balance Invoice"
          subtitle="Generate and send the final project balance after the deposit is paid"
        />

        {!finalInvoice ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              The deposit is paid
              {invoice?.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ''}. Generate an invoice for
              the remaining balance
              {expectedRemaining != null
                ? ` ($${expectedRemaining.toFixed(2)} USD)`
                : ''}{' '}
              when the project is ready to bill.
            </p>
            <Button onClick={handleGenerateFinal} disabled={generating}>
              {generating ? 'Generating…' : 'Generate remaining balance invoice'}
            </Button>
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
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-faint">Remaining balance</dt>
                <dd className="font-semibold text-ink">
                  ${finalInvoice.amount.toFixed(2)} {finalInvoice.currency}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-faint">Description</dt>
                <dd className="text-ink">{finalInvoice.description}</dd>
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
                onClick={handleSendFinal}
                disabled={sending || !finalInvoice.paymentLink || Boolean(finalInvoice.sentToPortalAt)}
              >
                <Send className="h-4 w-4" />
                {sending
                  ? 'Sending…'
                  : finalInvoice.sentToPortalAt
                    ? 'Invoice link sent'
                    : 'Send Invoice Link'}
              </Button>
              {finalInvoice.sentToPortalAt && (
                <p className="self-center text-xs text-ink-muted">
                  Sent to portal {formatDate(finalInvoice.sentToPortalAt)}
                </p>
              )}
              {finalInvoice.paymentLink && !finalInvoice.sentToPortalAt && (
                <a href={finalInvoice.paymentLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Preview {providerName} link
                  </Button>
                </a>
              )}
            </div>

            {!finalInvoice.paymentLink && (
              <p className="text-sm text-accent">
                {providerName} link not available. Check credentials in .env and restart the server,
                then regenerate the invoice.
              </p>
            )}
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Deposit Invoice"
        subtitle="Auto-generated when the tenant signed their lease"
      />

      {!invoice ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            No invoice yet. It is created automatically when the client signs. For signed clients,
            generate it from the lease below.
          </p>
          <Button onClick={handleGenerateDeposit} disabled={generating}>
            {generating ? 'Generating…' : 'Generate deposit invoice'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
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
                onClick={handleSendDeposit}
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
              <Button variant="outline" onClick={handleCreateDepositLink} disabled={generating}>
                {generating ? 'Creating link…' : `Create ${providerName} link`}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
