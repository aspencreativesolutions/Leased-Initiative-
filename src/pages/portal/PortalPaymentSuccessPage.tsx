import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { capturePayPalOrder } from '@/lib/paypalApi'
import { verifyStripeSession } from '@/lib/stripeApi'
import { verifySquarePendingPayment } from '@/lib/squareApi'

export function PortalPaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const paypalToken = searchParams.get('token')
  const stripeSessionId = searchParams.get('session_id')
  const isSquareReturn = searchParams.get('square') === '1'

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!paypalToken && !stripeSessionId && !isSquareReturn) {
      setStatus('error')
      setMessage('Missing payment reference. Return from checkout to confirm payment.')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const result = stripeSessionId
          ? await verifyStripeSession(stripeSessionId)
          : isSquareReturn
            ? await verifySquarePendingPayment()
            : await capturePayPalOrder(paypalToken!)
        if (cancelled) return
        setStatus('success')
        setMessage(
          `Payment of $${result.amount} ${result.currency} confirmed. Thank you!`
        )
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'Could not confirm payment')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [paypalToken, stripeSessionId, isSquareReturn])

  const providerLabel = stripeSessionId ? 'Stripe' : isSquareReturn ? 'Square' : 'PayPal'

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card padding="lg" className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
            <h1 className="mt-4 text-xl font-semibold">Confirming payment…</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Capturing your {providerLabel} payment securely.
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold text-ink">Payment successful</h1>
            <p className="mt-2 text-sm text-ink-muted">{message}</p>
            <Link to="/portal" className="mt-6 inline-block">
              <Button>Back to dashboard</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-accent" />
            <h1 className="mt-4 text-xl font-semibold">Payment not confirmed</h1>
            <p className="mt-2 text-sm text-ink-muted">{message}</p>
            <Link to="/portal" className="mt-6 inline-block">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
