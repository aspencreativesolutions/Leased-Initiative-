import { CheckCircle, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { trackPaymentLinkClick } from '@/lib/portalApi'
import { portalPayButtonLabel } from '@/lib/paymentProvider'
import { cn, formatDate } from '@/lib/utils'
import type { PortalInvoice } from '@/types'

interface PortalInvoiceSectionProps {
  invoice: PortalInvoice | null | undefined
  title?: string
}

export function PortalInvoiceSection({
  invoice,
  title = 'Invoice',
}: PortalInvoiceSectionProps) {
  if (!invoice) return null

  const isDeposit = invoice.invoiceType !== 'final'

  if (invoice.paidAt) {
    const detailLabel =
      invoice.invoiceType === 'final' ? 'Final balance received' : 'Down payment received'
    const paidBoxClass = cn(
      isDeposit ? 'border-deposit-border bg-deposit-bg portal-payment-card' : 'border-emerald-200 bg-emerald-50'
    )

    return (
      <section className="mb-8">
        <Card padding="md" className={paidBoxClass}>
          <div
            className={cn(
              'flex items-start gap-2',
              isDeposit ? 'portal-payment-text' : 'text-emerald-900'
            )}
          >
            <CheckCircle
              className={cn('mt-0.5 h-4 w-4 shrink-0', isDeposit && 'portal-payment-icon')}
            />
            <div>
              <p className="font-semibold">{detailLabel}</p>
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  isDeposit ? 'portal-payment-text-muted' : 'text-emerald-800'
                )}
              >
                ${invoice.amount.toFixed(2)} {invoice.currency} paid on{' '}
                {formatDate(invoice.paidAt)}
              </p>
            </div>
          </div>
        </Card>
      </section>
    )
  }

  if (!invoice.paymentLink) return null

  return (
    <section className="mb-8" data-onboarding={isDeposit ? 'portal-invoice' : undefined}>
      <h2
        className={cn(
          'label-caps mb-3 flex items-center gap-2',
          isDeposit ? 'portal-payment-text' : undefined
        )}
      >
        <Receipt className={cn('h-4 w-4', isDeposit && 'portal-payment-icon')} />
        {title}
      </h2>
      <Card
        padding="lg"
        className={cn(isDeposit ? 'border-deposit portal-payment-card' : 'border-accent')}
      >
        <p className={cn('font-semibold', isDeposit ? 'portal-payment-text' : 'text-ink')}>
          {invoice.invoiceType === 'final' ? 'Final balance due' : 'Down payment due'}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{invoice.description}</p>
        <p className={cn('mt-3 text-2xl font-bold', isDeposit ? 'portal-payment-text' : 'text-ink')}>
          ${invoice.amount.toFixed(2)}{' '}
          <span
            className={cn(
              'text-sm font-medium',
              isDeposit ? 'portal-payment-text-muted' : 'text-ink-muted'
            )}
          >
            {invoice.currency}
          </span>
        </p>
        {invoice.sentToPortalAt && (
          <p className="mt-2 text-xs text-ink-faint">
            Issued {formatDate(invoice.sentToPortalAt)}
          </p>
        )}
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await trackPaymentLinkClick()
            } catch {
              /* still open checkout if tracking fails */
            }
            window.open(invoice.paymentLink, '_blank', 'noopener,noreferrer')
          }}
        >
          <CreditCard className="h-4 w-4" />
          {portalPayButtonLabel(invoice.paymentProvider)}
        </Button>
        <p className="mt-3 text-xs text-ink-muted">
          You&apos;ll return here automatically after payment. Your designer will be notified.
        </p>
      </Card>
    </section>
  )
}
