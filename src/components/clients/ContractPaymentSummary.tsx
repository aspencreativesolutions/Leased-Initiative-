import { CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  getClientAmountPaid,
  getRemainingBalanceAmount,
  hasRemainingBalanceDue,
  isDepositInvoicePaid,
} from '@/lib/clientUtils'
import { invoiceButtonLabel, resolvePaymentProvider } from '@/lib/paymentProvider'
import { formatDate } from '@/lib/utils'
import type { Client, ContractData, PaymentProvider } from '@/types'

interface PaymentDetailsCardProps {
  client: Client
  contract?: ContractData
}

function formatMoney(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—'
  return `$${amount.toFixed(2)} ${currency}`
}

function invoiceHref(
  paymentLink: string | undefined,
  fallbackAnchor: string
): { href: string; external: boolean } {
  if (paymentLink) return { href: paymentLink, external: true }
  return { href: fallbackAnchor, external: false }
}

function InvoiceButton({
  href,
  external,
  provider,
  invoiceType,
}: {
  href: string
  external: boolean
  provider: PaymentProvider
  invoiceType: 'deposit' | 'final'
}) {
  const label = invoiceButtonLabel(provider, invoiceType)

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="block min-w-0"
    >
      <Button variant="outline" size="sm" className="w-full">
        <span className="truncate">{label}</span>
        <ExternalLink className="h-4 w-4 shrink-0" />
      </Button>
    </a>
  )
}

export function PaymentDetailsCard({ client, contract }: PaymentDetailsCardProps) {
  const currency = client.invoice?.currency ?? client.finalInvoice?.currency ?? 'USD'
  const depositPaid = isDepositInvoicePaid(client)
  const amountPaid = getClientAmountPaid(client, contract)
  const remainingAmount =
    client.finalInvoice?.paidAt || client.paymentStatus === 'Paid'
      ? 0
      : (client.finalInvoice?.amount ??
        getRemainingBalanceAmount(contract) ??
        null)
  const showBalanceInvoice =
    hasRemainingBalanceDue(contract) || Boolean(client.finalInvoice)
  const depositProvider = resolvePaymentProvider(
    client.invoice?.paymentProvider ?? contract?.paymentProvider
  )
  const finalProvider = resolvePaymentProvider(
    client.finalInvoice?.paymentProvider ?? contract?.paymentProvider ?? depositProvider
  )
  const depositLink = invoiceHref(client.invoice?.paymentLink, '#deposit-invoice')
  const finalLink = invoiceHref(client.finalInvoice?.paymentLink, '#deposit-invoice')
  const showDepositButton = Boolean(
    client.isOfficialClient || client.invoice || contract?.depositAmount
  )
  const depositPaidAt = client.invoice?.paidAt ?? client.depositPaymentConfirmedAt
  const depositAmount =
    client.invoice?.amount ?? amountPaid?.amount ?? null

  return (
    <Card>
      <CardHeader title="Payment Details" />

      {depositPaid ? (
        <div className="mb-4 rounded-sm border border-deposit-border bg-deposit-bg p-4">
          <div className="flex items-start gap-2 portal-payment-text">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 portal-payment-icon" />
            <div className="min-w-0">
              <p className="font-semibold">Down payment received</p>
              <p className="mt-0.5 text-sm portal-payment-text-muted">
                {formatMoney(depositAmount, currency)} paid
                {depositPaidAt ? ` on ${formatDate(depositPaidAt)}` : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-sm border border-line bg-surface px-4 py-3 text-sm">
          <span className="text-stone-500">Deposit</span>
          <StatusBadge type="payment" status="Unpaid" label="Unpaid" />
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-stone-500">Remaining balance</dt>
          <dd className="font-medium text-stone-800">{formatMoney(remainingAmount, currency)}</dd>
        </div>
      </dl>

      {(showDepositButton || showBalanceInvoice) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {showDepositButton && (
            <InvoiceButton
              href={depositLink.href}
              external={depositLink.external}
              provider={depositProvider}
              invoiceType="deposit"
            />
          )}
          {showBalanceInvoice && (
            <InvoiceButton
              href={finalLink.href}
              external={finalLink.external}
              provider={finalProvider}
              invoiceType="final"
            />
          )}
        </div>
      )}
    </Card>
  )
}
