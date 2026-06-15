import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Eye, FileCheck } from 'lucide-react'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { PortalContractStatusBadge } from '@/components/portal/PortalContractStatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ContractSignatureRow } from '@/components/contracts/ContractFormField'
import { apiFetch, ApiError } from '@/lib/api'
import { getPortalContractStatus } from '@/lib/portalContractStatus'
import type { ContractData, PortalContractClientStatus } from '@/types'

interface ContractDetailResponse {
  contract: ContractData
  portalStatus?: PortalContractClientStatus
  canSign?: boolean
  settings: { businessName: string; ownerName: string }
}

export function PortalContractPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState<ContractDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [portalStatus, setPortalStatus] = useState<PortalContractClientStatus>('Pending Review')
  const [canSign, setCanSign] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!contractId) return
      if (!silent) setLoading(true)
      setError('')
      try {
        const result = await apiFetch<ContractDetailResponse>(
          `/api/portal/contracts/${contractId}`
        )
        setData(result)
        const status =
          result.portalStatus ?? getPortalContractStatus(result.contract)
        setPortalStatus(status)
        setCanSign(Boolean(result.canSign))
        if (result.contract.clientSignature && status === 'Accepted') {
          setSignature(result.contract.clientSignature)
        } else {
          setSignature('')
          setAgreed(false)
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load contract')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [contractId]
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data || !location.hash) return
    const id = location.hash.replace('#', '')
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [data, location.hash])

  const handleMarkReviewed = async () => {
    if (!contractId) return
    setReviewing(true)
    setError('')
    try {
      const result = await apiFetch<{
        portalStatus: PortalContractClientStatus
        canSign: boolean
      }>(`/api/portal/contracts/${contractId}/review`, { method: 'POST' })
      setPortalStatus(result.portalStatus)
      setCanSign(result.canSign)
      await load(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark contract as reviewed')
    } finally {
      setReviewing(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractId || !signature.trim() || !agreed || !canSign) return

    setSubmitting(true)
    setError('')
    try {
      await apiFetch(`/api/contracts/${contractId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ signature: signature.trim() }),
      })
      setPortalStatus('Accepted')
      setCanSign(false)
      await load(true)
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
  const isAccepted = portalStatus === 'Accepted'
  const needsReview = portalStatus === 'Pending Review'
  const readyToSign = portalStatus === 'Viewed' && canSign

  return (
    <div>
      <Link
        to="/portal"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Current Contracts
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl">{contract.projectTitle}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Contract from {settings.businessName || settings.ownerName}
          </p>
        </div>
        <PortalContractStatusBadge status={portalStatus} />
      </div>

      {needsReview && (
        <Card padding="md" className="mb-6 border-brand bg-brand/5">
          <p className="font-semibold text-ink">Updated contract — please review</p>
          <p className="mt-1 text-sm text-ink-muted">
            Your designer has sent a revised contract. Read every section below, then confirm you
            have reviewed it before signing.
          </p>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden border-0 bg-transparent shadow-none">
        <ContractReviewView
          contract={contract}
          designerName={settings.ownerName}
          businessName={settings.businessName}
        />
      </Card>

      {isAccepted ? (
        <Card padding="lg" className="mt-6 border-emerald-200 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Contract accepted</p>
              <p className="mt-1 text-sm text-emerald-800">
                You signed this contract on{' '}
                {contract.signedAt
                  ? new Date(contract.signedAt).toLocaleDateString()
                  : 'today'}
                . Your designer has been notified and the project can move forward.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/portal')}
              >
                Back to dashboard
              </Button>
            </div>
          </div>
        </Card>
      ) : needsReview ? (
        <div className="contract-sign-shell">
          <div className="contract-sign-paper mx-auto max-w-lg text-center">
            <h2 className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink">
              Review the Contract.
            </h2>
            <p className="mx-auto mt-4 max-w-sm font-serif text-sm italic leading-relaxed text-ink-muted">
              Read the full agreement above, including payment terms, scope, and revision limits.
              When you are ready, confirm that you have reviewed this version.
            </p>

            {error && (
              <div className="mt-6 border-b border-accent/40 pb-4 text-sm text-accent">{error}</div>
            )}

            <Button className="mt-8" onClick={handleMarkReviewed} disabled={reviewing}>
              <Eye className="h-4 w-4" />
              {reviewing ? 'Saving…' : 'I have reviewed this contract'}
            </Button>
          </div>
        </div>
      ) : readyToSign ? (
        <div className="contract-sign-shell">
          <div className="contract-sign-paper mx-auto max-w-lg">
            <header className="text-center">
              <h2 className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink">
                Contract Agreement.
              </h2>
              <p className="mx-auto mt-4 max-w-sm font-serif text-sm italic leading-relaxed text-ink-muted">
                By typing your full name below, you agree to the terms of this contract.
              </p>
            </header>

            {error && (
              <div className="mt-6 text-center text-sm text-accent">{error}</div>
            )}

            <form onSubmit={handleConfirm} className="mt-10 space-y-8">
              <ContractSignatureRow
                label="Client"
                hint="Signature & Date"
                value={signature}
                onChange={setSignature}
                placeholder={contract.clientName}
              />
              <label className="flex items-start gap-3 font-serif text-sm italic text-ink-muted">
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
              <div className="text-center">
                <Button type="submit" disabled={submitting || !agreed || !signature.trim()}>
                  <FileCheck className="h-4 w-4" />
                  {submitting ? 'Confirming…' : 'Accept contract'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="contract-sign-shell">
          <div className="contract-sign-paper mx-auto max-w-lg text-center">
            <p className="font-serif text-sm italic text-ink-muted">
              Please review the contract above and confirm you have read it before signing.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
