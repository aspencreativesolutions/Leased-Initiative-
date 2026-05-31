import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, FileCheck } from 'lucide-react'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { apiFetch, ApiError } from '@/lib/api'
import type { ContractData } from '@/types'

interface ContractDetailResponse {
  contract: ContractData
  settings: { businessName: string; ownerName: string }
}

export function PortalContractPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ContractDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const load = useCallback(async () => {
    if (!contractId) return
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch<ContractDetailResponse>(`/api/portal/contracts/${contractId}`)
      setData(result)
      setConfirmed(result.contract.confirmedByClient ?? false)
      if (result.contract.clientSignature) {
        setSignature(result.contract.clientSignature)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load contract')
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    load()
  }, [load])

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractId || !signature.trim() || !agreed) return

    setSubmitting(true)
    setError('')
    try {
      await apiFetch(`/api/contracts/${contractId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ signature: signature.trim() }),
      })
      setConfirmed(true)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm contract')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-ink-muted">Loading contract…</div>
  }

  if (error && !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-accent">{error}</p>
        <Link to="/portal" className="mt-4 inline-block text-brand hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (!data) return null

  const { contract, settings } = data

  return (
    <div>
      <Link
        to="/portal"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my contracts
      </Link>

      <div className="mb-6">
        <h1 className="heading-display text-2xl">{contract.projectTitle}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Contract from {settings.businessName || settings.ownerName}
        </p>
      </div>

      <Card padding="lg">
        <ContractReviewView
          contract={contract}
          designerName={settings.ownerName}
          businessName={settings.businessName}
        />
      </Card>

      {confirmed ? (
        <Card padding="lg" className="mt-6 border-emerald-200 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Contract confirmed</p>
              <p className="mt-1 text-sm text-emerald-800">
                You signed this contract on{' '}
                {contract.signedAt
                  ? new Date(contract.signedAt).toLocaleDateString()
                  : 'today'}
                . Your designer has been notified and the project can move forward.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/portal')}>
                Back to dashboard
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="mt-6">
          <h2 className="heading-display text-lg">Confirm & sign</h2>
          <p className="mt-2 text-sm text-ink-muted">
            By typing your full name below, you agree to the terms of this contract.
          </p>

          {error && (
            <div className="mt-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              {error}
            </div>
          )}

          <form onSubmit={handleConfirm} className="mt-4 space-y-4">
            <Input
              label="Your full name (electronic signature)"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={contract.clientName}
              required
            />
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
                required
              />
              <span>
                I have read and agree to all terms in this contract, including payment schedule,
                revision limits, and termination conditions.
              </span>
            </label>
            <Button type="submit" disabled={submitting || !agreed || !signature.trim()}>
              <FileCheck className="h-4 w-4" />
              {submitting ? 'Confirming…' : 'Confirm contract'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
