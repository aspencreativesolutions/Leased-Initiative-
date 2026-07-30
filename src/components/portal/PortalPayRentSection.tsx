import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'
import { createPortalRentInvoice } from '@/lib/portalRentApi'
import { isZelleProvider, portalPayButtonLabel } from '@/lib/paymentProvider'
import { formatDate } from '@/lib/utils'
import type { PortalRentPaymentInfo } from '@/types'

interface PortalPayRentSectionProps {
  rentPayment: PortalRentPaymentInfo
  onInvoiceCreated?: () => void
  /** Compact layout when nested inside the dashboard overview box */
  embedded?: boolean
}

function openPayment(paymentLink: string, provider?: PortalRentPaymentInfo['paymentProvider']) {
  if (isZelleProvider(provider) || paymentLink.includes('/portal/pay/zelle')) {
    const path = paymentLink.startsWith('http')
      ? new URL(paymentLink).pathname
      : paymentLink
    window.location.assign(path)
    return
  }
  window.open(paymentLink, '_blank', 'noopener,noreferrer')
}

export function PortalPayRentSection({
  rentPayment,
  onInvoiceCreated,
  embedded = false,
}: PortalPayRentSectionProps) {
  const navigate = useNavigate()
  const allowMulti = rentPayment.allowPrepaid && rentPayment.maxMonths > 1
  const [monthCount, setMonthCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const effectiveMonths = allowMulti ? monthCount : 1
  const amount =
    rentPayment.monthlyRent != null
      ? Math.round(rentPayment.monthlyRent * effectiveMonths * 100) / 100
      : null

  const payLabel =
    allowMulti && effectiveMonths > 1
      ? `Pay for the next ${effectiveMonths} months`
      : 'Pay Rent'

  const dueMessage = rentPayment.nextDueDate
    ? `Your next payment is due on ${formatDate(rentPayment.nextDueDate)}.`
    : 'Your rent payment schedule will appear once lease dates are set.'

  const openCheckout = async (paymentLink: string) => {
    if (isZelleProvider(rentPayment.paymentProvider)) {
      navigate('/portal/pay/zelle/rent')
      return
    }
    openPayment(paymentLink, rentPayment.paymentProvider)
  }

  const handlePay = async () => {
    setError('')
    const pending = rentPayment.pendingInvoice
    if (
      pending?.paymentLink &&
      (pending.monthCount ?? 1) === effectiveMonths
    ) {
      await openCheckout(pending.paymentLink)
      return
    }

    if (!rentPayment.canPay) {
      setError('Rent payment is not available for this lease yet.')
      return
    }

    setLoading(true)
    try {
      const { invoice } = await createPortalRentInvoice(effectiveMonths)
      onInvoiceCreated?.()
      if (invoice.paymentLink) {
        await openCheckout(invoice.paymentLink)
      } else if (isZelleProvider(invoice.paymentProvider ?? rentPayment.paymentProvider)) {
        navigate('/portal/pay/zelle/rent')
      } else {
        setError('Checkout link was not created. Please try again.')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start rent payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className={
        embedded
          ? 'w-full min-w-0 px-1 text-center'
          : 'mx-auto max-w-lg px-2 py-10 text-center sm:py-14'
      }
      data-onboarding="portal-pay-rent"
      aria-labelledby="pay-rent-heading"
    >
      <Wallet
        className={embedded ? 'mx-auto h-7 w-7 text-brand' : 'mx-auto h-8 w-8 text-brand'}
        aria-hidden
      />
      <h2 id="pay-rent-heading" className="sr-only">
        Pay rent
      </h2>
      <p
        className={
          embedded
            ? 'mt-3 text-lg font-semibold tracking-tight text-ink sm:text-xl'
            : 'mt-4 text-xl font-semibold tracking-tight text-ink sm:text-2xl'
        }
      >
        {dueMessage}
      </p>

      {rentPayment.canPay && amount != null && (
        <p className="mt-2 text-sm text-ink-muted">
          ${amount.toFixed(2)} {rentPayment.currency}
          {allowMulti && effectiveMonths > 1
            ? ` for ${effectiveMonths} months`
            : ' monthly rent'}
        </p>
      )}

      {allowMulti && rentPayment.canPay && (
        <div className="mx-auto mt-6 max-w-xs text-left">
          <label htmlFor="prepaid-months" className="label-caps mb-1.5 block text-center">
            Months to pay
          </label>
          <select
            id="prepaid-months"
            value={monthCount}
            onChange={(e) => setMonthCount(Number(e.target.value))}
            className="w-full rounded-sm border-2 border-ink bg-surface-paper px-3 py-2 text-center text-sm font-medium text-ink"
          >
            {Array.from({ length: rentPayment.maxMonths }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1 month (next due)' : `${n} consecutive months`}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-center text-xs text-ink-faint">
            Your lease allows paying consecutive months upfront.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button
          size="lg"
          className="min-w-[12rem]"
          disabled={loading || !rentPayment.canPay}
          onClick={() => {
            void handlePay()
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CreditCard className="h-4 w-4" aria-hidden />
          )}
          {payLabel}
        </Button>
        {rentPayment.canPay && (
          <p className="text-xs text-ink-muted">
            {portalPayButtonLabel(rentPayment.paymentProvider)} · available anytime
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-sm border border-accent/40 bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {!rentPayment.canPay && (
        <p className="mt-4 text-sm text-ink-muted">
          {rentPayment.maxMonths === 0
            ? 'You are caught up — no rent is currently due.'
            : 'Pay Rent will unlock once your landlord sets rent on the lease.'}
        </p>
      )}
    </section>
  )
}
