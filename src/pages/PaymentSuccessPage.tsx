import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useApp } from '@/context/AppContext'
import { capturePayPalOrder } from '@/lib/paypalApi'

export function PaymentSuccessPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { getClient, applyPaymentCapture } = useApp()
  const client = id ? getClient(id) : undefined

  const token = searchParams.get('token') // PayPal order ID on return URL

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !id) {
      setStatus('error')
      setMessage('Missing payment token. Return from PayPal checkout or use embedded buttons.')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const result = await capturePayPalOrder(token)
        if (cancelled) return
        applyPaymentCapture(result.clientId || id, { capture: result })
        setStatus('success')
        setMessage(`Payment of $${result.amount} ${result.currency} confirmed.`)
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'Could not confirm payment')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, id, applyPaymentCapture])

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card padding="lg" className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
            <h1 className="mt-4 text-xl font-semibold">Confirming payment…</h1>
            <p className="mt-2 text-sm text-stone-500">Capturing your PayPal order securely.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold text-stone-800">Payment successful</h1>
            <p className="mt-2 text-sm text-stone-600">{message}</p>
            {client && (
              <p className="mt-1 text-sm text-stone-500">
                {client.name} · Payment status updated
              </p>
            )}
            <Link to={id ? `/studio/clients/${id}` : '/studio'} className="mt-6 inline-block">
              <Button>Back to client profile</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold">Payment not confirmed</h1>
            <p className="mt-2 text-sm text-stone-600">{message}</p>
            <Link to={id ? `/studio/clients/${id}` : '/studio'} className="mt-6 inline-block">
              <Button variant="outline">Back to client</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
