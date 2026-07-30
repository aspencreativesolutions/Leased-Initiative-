import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PaymentProviderLogo } from '@/components/payments/PaymentProviderLogo'
import { ApiError } from '@/lib/api'
import {
  fetchPortalZellePay,
  markPortalZellePaid,
  setPortalZelleCadence,
  type PortalZellePayPayload,
  type ZelleInvoiceType,
} from '@/lib/portalZelleApi'
import { formatDate } from '@/lib/utils'
import type { ZelleCadence } from '@/types'

function resolveInvoiceType(raw: string | undefined): ZelleInvoiceType {
  if (raw === 'deposit' || raw === 'final') return raw
  return 'rent'
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function PortalZellePayPage() {
  const { invoiceType: invoiceTypeParam } = useParams<{ invoiceType: string }>()
  const invoiceType = resolveInvoiceType(invoiceTypeParam)
  const navigate = useNavigate()

  const [data, setData] = useState<PortalZellePayPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marking, setMarking] = useState(false)
  const [savingCadence, setSavingCadence] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showAutoGuide, setShowAutoGuide] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchPortalZellePay(invoiceType)
      setData(payload)
      setShowAutoGuide(payload.zelleCadence === 'automatic' && !payload.zelleAutoGuidedAt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load Zelle payment details')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [invoiceType])

  const handleCopy = async (key: string, value: string) => {
    const ok = await copyText(value)
    if (ok) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleMarkPaid = async () => {
    setMarking(true)
    setError('')
    try {
      await markPortalZellePaid(invoiceType)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark payment as sent')
    } finally {
      setMarking(false)
    }
  }

  const handleCadence = async (cadence: ZelleCadence, completeGuide = false) => {
    setSavingCadence(true)
    setError('')
    try {
      const result = await setPortalZelleCadence({ cadence, completeGuide })
      setData((prev) =>
        prev
          ? {
              ...prev,
              zelleCadence: result.zelleCadence,
              zelleAutoGuidedAt: result.zelleAutoGuidedAt,
            }
          : prev
      )
      if (cadence === 'automatic' && !completeGuide) setShowAutoGuide(true)
      if (completeGuide) setShowAutoGuide(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save payment preference')
    } finally {
      setSavingCadence(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-ink-muted">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden />
        <p className="mt-3 text-sm">Loading Zelle payment details…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <p className="text-sm text-red-700">{error || 'Payment details unavailable.'}</p>
        <Button type="button" variant="outline" onClick={() => navigate('/portal')}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Button>
      </div>
    )
  }

  const amountLabel = `$${Number(data.amount).toFixed(2)} ${data.currency}`
  const dueLabel =
    data.dueDates?.length > 0
      ? data.dueDates.map((d) => formatDate(d)).join(', ')
      : null

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link
          to="/portal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-caps text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Dashboard
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <PaymentProviderLogo provider="zelle" size="md" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Pay with Zelle</h1>
            <p className="text-sm text-ink-muted">{data.description}</p>
          </div>
        </div>
      </div>

      <div className="paper-box space-y-4 px-4 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
            Amount
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xl font-semibold text-ink">{amountLabel}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy('amount', Number(data.amount).toFixed(2))}
            >
              {copied === 'amount' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </Button>
          </div>
          {dueLabel ? (
            <p className="mt-1 text-sm text-ink-muted">Due {dueLabel}</p>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
            Send to {data.landlordName}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="font-medium text-ink">
              {data.zelleDisplayName ? `${data.zelleDisplayName} · ` : ''}
              {data.zelleHandle}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy('handle', data.zelleHandle)}
            >
              {copied === 'handle' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </Button>
          </div>
        </div>

        {data.zelleMemo ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
              Memo / note (required)
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-medium text-ink">{data.zelleMemo}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy('memo', data.zelleMemo!)}
              >
                {copied === 'memo' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
          <li>Open your bank app and go to Zelle.</li>
          <li>Send to the handle above for the exact amount.</li>
          <li>Paste the memo so your landlord can match the payment.</li>
          <li>Return here and tap I sent the payment.</li>
        </ol>

        <p className="text-xs text-ink-muted">
          Status updates when you mark paid and your landlord confirms — usually within minutes of
          the transfer clearing.
        </p>

        {data.zelleMarkedPaidAt ? (
          <p className="rounded-[var(--radius-sm)] border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            Marked as sent on {new Date(data.zelleMarkedPaidAt).toLocaleString()}. Waiting for
            landlord confirmation.
          </p>
        ) : (
          <Button type="button" className="w-full" disabled={marking} onClick={handleMarkPaid}>
            {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            I sent the payment
          </Button>
        )}
      </div>

      <div className="paper-box space-y-3 px-4 py-5 sm:px-6">
        <h2 className="text-sm font-semibold text-ink">Monthly payment preference</h2>
        <p className="text-sm text-ink-muted">
          Choose manual reminders each month, or get a checklist to schedule recurring Zelle in
          your bank app (Leased cannot pull funds automatically).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={data.zelleCadence === 'manual' ? 'primary' : 'outline'}
            size="sm"
            disabled={savingCadence}
            onClick={() => handleCadence('manual')}
          >
            Manual each month
          </Button>
          <Button
            type="button"
            variant={data.zelleCadence === 'automatic' ? 'primary' : 'outline'}
            size="sm"
            disabled={savingCadence}
            onClick={() => handleCadence('automatic')}
          >
            Set up automatic
          </Button>
        </div>

        {(showAutoGuide || (data.zelleCadence === 'automatic' && !data.zelleAutoGuidedAt)) && (
          <div className="mt-2 space-y-2 rounded-[var(--radius-sm)] border border-line px-3 py-3 text-sm">
            <p className="font-medium text-ink">Bank-app automatic setup</p>
            <ol className="list-decimal space-y-1 pl-5 text-ink">
              <li>Open Zelle in your bank app.</li>
              <li>Add {data.zelleHandle} as a recipient.</li>
              <li>
                Schedule a recurring payment for {amountLabel}
                {dueLabel ? ` on ${dueLabel.split(',')[0]}` : ''} each month.
              </li>
              <li>Include memo {data.zelleMemo || 'from this page'} on each transfer when possible.</li>
            </ol>
            <Button
              type="button"
              size="sm"
              disabled={savingCadence}
              onClick={() => handleCadence('automatic', true)}
            >
              {savingCadence ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              I’ve set this up in my bank
            </Button>
          </div>
        )}

        {data.zelleAutoGuidedAt ? (
          <p className="text-xs text-ink-muted">
            Automatic setup marked complete on{' '}
            {new Date(data.zelleAutoGuidedAt).toLocaleDateString()}. You’ll still get due-date
            reminders until your landlord confirms each payment.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
