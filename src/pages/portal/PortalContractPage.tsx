import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Download, Eye, File, FileCheck, Loader2 } from 'lucide-react'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { PortalContractStatusBadge } from '@/components/portal/PortalContractStatusBadge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ContractSignatureRow } from '@/components/contracts/ContractFormField'
import { apiFetch, ApiError, getToken } from '@/lib/api'
import { getFilePreviewKind } from '@/lib/filePreview'
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
  const [replacementPreviewUrl, setReplacementPreviewUrl] = useState<string | null>(null)
  const [replacementPreviewLoading, setReplacementPreviewLoading] = useState(false)
  const [replacementPreviewError, setReplacementPreviewError] = useState('')

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
        setError(err instanceof ApiError ? err.message : 'Could not load lease')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [contractId]
  )

  useEffect(() => {
    load()
  }, [load])

  const replacementFileId = data?.contract.replacementDocumentFileId?.trim() || ''
  const replacementName =
    data?.contract.replacementDocumentName?.trim() || 'Lease document'
  const replacementMime =
    data?.contract.replacementDocumentMimeType?.trim() || 'application/octet-stream'
  const replacementPreviewKind = replacementFileId
    ? getFilePreviewKind({
        originalName: replacementName,
        mimeType: replacementMime,
      })
    : null

  useEffect(() => {
    if (!contractId || !replacementFileId || !replacementPreviewKind || replacementPreviewKind === 'unsupported') {
      setReplacementPreviewUrl(null)
      setReplacementPreviewError('')
      setReplacementPreviewLoading(false)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    const loadPreview = async () => {
      setReplacementPreviewLoading(true)
      setReplacementPreviewError('')
      try {
        const token = getToken()
        const res = await fetch(`/api/portal/contracts/${contractId}/document`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new ApiError(body.error || 'Could not load lease document', res.status)
        }
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setReplacementPreviewUrl(objectUrl)
      } catch (err) {
        if (cancelled) return
        setReplacementPreviewError(
          err instanceof ApiError ? err.message : 'Could not load lease document'
        )
      } finally {
        if (!cancelled) setReplacementPreviewLoading(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setReplacementPreviewUrl(null)
    }
  }, [contractId, replacementFileId, replacementPreviewKind])

  useEffect(() => {
    if (!data || !location.hash) return
    const id = location.hash.replace('#', '')
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [data, location.hash])

  const downloadReplacement = async () => {
    if (!contractId) return
    try {
      const token = getToken()
      const res = await fetch(`/api/portal/contracts/${contractId}/document`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new ApiError(body.error || 'Could not download lease document', res.status)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = replacementName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not download lease document')
    }
  }

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
      setError(err instanceof ApiError ? err.message : 'Could not mark lease as reviewed')
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
      setError(err instanceof ApiError ? err.message : 'Could not confirm lease')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-ink-muted">Loading lease…</div>
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
        Back to Lease Agreements
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl">{contract.projectTitle}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Lease from {settings.businessName || settings.ownerName}
          </p>
        </div>
        <PortalContractStatusBadge status={portalStatus} />
      </div>

      {needsReview && (
        <Card padding="md" className="mb-6 border-brand bg-brand/5">
          <p className="font-semibold text-ink">Updated lease — please review</p>
          <p className="mt-1 text-sm text-ink-muted">
            Your landlord has sent a revised lease. Read every section below, then confirm you
            have reviewed it before signing.
          </p>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden border-0 bg-transparent shadow-none">
        {replacementFileId ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-muted">
                Your landlord uploaded: <span className="font-medium text-ink">{replacementName}</span>
              </p>
              <Button size="sm" variant="outline" onClick={() => void downloadReplacement()}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
            {replacementPreviewKind === 'unsupported' ? (
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-10 text-center">
                <File className="h-10 w-10 text-ink-faint" aria-hidden />
                <p className="text-sm text-ink-muted">
                  Preview isn’t available for this file type. Download it to review on your device.
                </p>
              </div>
            ) : replacementPreviewLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-ink-muted">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Loading document…
              </div>
            ) : replacementPreviewError ? (
              <p className="py-8 text-center text-sm text-accent">{replacementPreviewError}</p>
            ) : replacementPreviewKind === 'image' && replacementPreviewUrl ? (
              <div className="flex justify-center bg-ink/5 p-2">
                <img
                  src={replacementPreviewUrl}
                  alt={replacementName}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </div>
            ) : replacementPreviewKind === 'pdf' && replacementPreviewUrl ? (
              <iframe
                src={replacementPreviewUrl}
                title={replacementName}
                className="h-[70vh] w-full rounded-sm border border-line bg-surface"
              />
            ) : null}
          </div>
        ) : (
          <ContractReviewView
            contract={contract}
            designerName={settings.ownerName}
            businessName={settings.businessName}
          />
        )}
      </Card>

      {isAccepted ? (
        <Card padding="lg" className="mt-6 border-emerald-200 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Lease accepted</p>
              <p className="mt-1 text-sm text-emerald-800">
                You signed this lease on{' '}
                {contract.signedAt
                  ? new Date(contract.signedAt).toLocaleDateString()
                  : 'today'}
                . Your landlord has been notified. You are now an Official Tenant for this rental.
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
              Review the Lease.
            </h2>
            <p className="mx-auto mt-4 max-w-sm font-serif text-sm italic leading-relaxed text-ink-muted">
              Read the full residential lease above, including rent, deposit, occupancy, and
              property rules. When you are ready, confirm that you have reviewed this version.
            </p>

            {error && (
              <div className="mt-6 border-b border-accent/40 pb-4 text-sm text-accent">{error}</div>
            )}

            <Button className="mt-8" onClick={handleMarkReviewed} disabled={reviewing}>
              <Eye className="h-4 w-4" />
              {reviewing ? 'Saving…' : 'I have reviewed this lease'}
            </Button>
          </div>
        </div>
      ) : readyToSign ? (
        <div className="contract-sign-shell">
          <div className="contract-sign-paper mx-auto max-w-lg">
            <header className="text-center">
              <h2 className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-ink">
                Lease Agreement.
              </h2>
              <p className="mx-auto mt-4 max-w-sm font-serif text-sm italic leading-relaxed text-ink-muted">
                By typing your full name below, you agree to the terms of this lease.
              </p>
            </header>

            {error && (
              <div className="mt-6 text-center text-sm text-accent">{error}</div>
            )}

            <form onSubmit={handleConfirm} className="mt-10 space-y-8">
              <ContractSignatureRow
                label="Tenant"
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
                  I have read and agree to all terms in this residential lease, including rent,
                  security deposit, occupancy, and termination conditions.
                </span>
              </label>
              <div className="text-center">
                <Button type="submit" disabled={submitting || !agreed || !signature.trim()}>
                  <FileCheck className="h-4 w-4" />
                  {submitting ? 'Confirming…' : 'Accept lease'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="contract-sign-shell">
          <div className="contract-sign-paper mx-auto max-w-lg text-center">
            <p className="font-serif text-sm italic text-ink-muted">
              Please review the lease above and confirm you have read it before signing.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
