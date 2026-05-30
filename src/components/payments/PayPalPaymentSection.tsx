import { useEffect, useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { Copy, ExternalLink, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import {
  createPayPalOrder,
  capturePayPalOrder,
  isPayPalConfigured,
  checkPayPalHealth,
} from '@/lib/paypalApi'
import { suggestedInvoiceFromContract } from '@/lib/clientUtils'
import type { Client } from '@/types'

interface PayPalPaymentSectionProps {
  client: Client
}

export function PayPalPaymentSection({ client }: PayPalPaymentSectionProps) {
  const { getContractForClient, applyPaymentCapture } = useApp()
  const contract = getContractForClient(client.id)
  const suggested = suggestedInvoiceFromContract(contract, client)

  const [amount, setAmount] = useState(
    String(client.invoice?.amount ?? suggested?.amount ?? '')
  )
  const [description, setDescription] = useState(
    client.invoice?.description ?? suggested?.description ?? client.projectName
  )
  const [paymentLink, setPaymentLink] = useState(client.invoice?.paymentLink ?? '')
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID
  const configured = isPayPalConfigured()

  const checkApi = async () => {
    const health = await checkPayPalHealth()
    setApiOk(health.ok)
    if (!health.ok) {
      setError('PayPal API server is not running or credentials are missing. See docs/PAYPAL_SETUP.md')
    }
  }

  useEffect(() => {
    if (configured) void checkApi()
  }, [configured])

  const parsedAmount = parseFloat(amount)
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0

  const handleCreateLink = async () => {
    setError(null)
    if (!validAmount) {
      setError('Enter a valid invoice amount')
      return
    }
    try {
      const { orderId, approvalUrl } = await createPayPalOrder({
        clientId: client.id,
        amount: parsedAmount,
        description,
      })
      if (approvalUrl) {
        setPaymentLink(approvalUrl)
        applyPaymentCapture(client.id, {
          invoice: {
            description,
            amount: parsedAmount,
            currency: 'USD',
            paypalOrderId: orderId,
            paymentLink: approvalUrl,
            createdAt: new Date().toISOString(),
          },
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create payment link')
    }
  }

  const copyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader title="PayPal Payments" subtitle="Official clients only" />
        <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">PayPal not configured</p>
            <p className="mt-1">
              Add <code className="text-xs bg-white/80 px-1 rounded">VITE_PAYPAL_CLIENT_ID</code> to{' '}
              <code className="text-xs bg-white/80 px-1 rounded">.env</code> and start the API server.
              See <strong>docs/PAYPAL_SETUP.md</strong>.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="PayPal Invoice & Checkout"
        subtitle="Generate a payment link or embed checkout for this client"
      />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Invoice Amount (USD)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Currency"
            value="USD"
            readOnly
            hint="Multi-currency can be added later"
          />
        </div>
        <Textarea
          label="Invoice Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        {error && (
          <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{error}</p>
        )}
        {apiOk === false && (
          <p className="text-sm text-amber-700">
            Run <code className="bg-stone-100 px-1 rounded">npm run dev</code> to start both the app
            and PayPal API server.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleCreateLink} disabled={!validAmount}>
            <ExternalLink className="h-4 w-4" />
            Generate Payment Link
          </Button>
          {paymentLink && (
            <>
              <Button variant="ghost" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  Open PayPal Checkout
                </Button>
              </a>
            </>
          )}
        </div>

        {client.invoice?.paidAt && (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Payment received on {new Date(client.invoice.paidAt).toLocaleString()}
            {client.invoice.paypalCaptureId && (
              <span className="block text-xs mt-1 opacity-80">
                Capture ID: {client.invoice.paypalCaptureId}
              </span>
            )}
          </div>
        )}

        <div className="border-t border-stone-100 pt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-700">
            <CreditCard className="h-4 w-4" />
            Embedded PayPal Checkout
          </p>
          <PayPalScriptProvider
            options={{
              clientId: clientId!,
              currency: 'USD',
              intent: 'capture',
            }}
          >
            <PayPalButtons
              disabled={!validAmount}
              style={{ layout: 'vertical', color: 'blue', shape: 'rect' }}
              createOrder={async () => {
                const { orderId } = await createPayPalOrder({
                  clientId: client.id,
                  amount: parsedAmount,
                  description,
                })
                return orderId
              }}
              onApprove={async (data) => {
                const result = await capturePayPalOrder(data.orderID)
                applyPaymentCapture(client.id, {
                  capture: result,
                  invoice: {
                    description,
                    amount: parsedAmount,
                    currency: 'USD',
                    paypalOrderId: result.orderId,
                    paypalCaptureId: result.captureId,
                    paidAt: new Date().toISOString(),
                    createdAt: client.invoice?.createdAt ?? new Date().toISOString(),
                  },
                })
              }}
              onError={(err) => {
                console.error(err)
                setError('PayPal checkout error. Check console and API server logs.')
              }}
            />
          </PayPalScriptProvider>
          <p className="mt-2 text-xs text-stone-400">
            On approval, payment is captured and this client&apos;s payment status updates automatically.
          </p>
        </div>
      </div>
    </Card>
  )
}
