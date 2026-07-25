import { useEffect, useState } from 'react'
import { FileCheck, Loader2 } from 'lucide-react'
import { SignaturePad } from '@/components/portal/SignaturePad'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { apiFetch, ApiError } from '@/lib/api'

interface PortalLeaseSignModalProps {
  open: boolean
  onClose: () => void
  contractId: string
  projectTitle: string
  /** Prefill printed name (tenant legal name) */
  defaultName: string
  /** True when the lease still needs a review step before the API will accept a signature */
  needsReview: boolean
  onSigned: () => void
}

/**
 * Draw-to-sign popup for leases awaiting signature.
 * Saves the drawn signature image with the tenant’s printed name.
 */
export function PortalLeaseSignModal({
  open,
  onClose,
  contractId,
  projectTitle,
  defaultName,
  needsReview,
  onSigned,
}: PortalLeaseSignModalProps) {
  const [printedName, setPrintedName] = useState(defaultName)
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPrintedName(defaultName)
    setSignatureImage(null)
    setAgreed(false)
    setError('')
    setSubmitting(false)
  }, [open, defaultName, contractId])

  const canSubmit =
    Boolean(printedName.trim()) && Boolean(signatureImage) && agreed && !submitting

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit || !signatureImage) return

    setSubmitting(true)
    setError('')
    try {
      if (needsReview) {
        await apiFetch(`/api/portal/contracts/${contractId}/review`, { method: 'POST' })
      }
      await apiFetch(`/api/contracts/${contractId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          signature: printedName.trim(),
          signatureImage,
        }),
      })
      onSigned()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete your signature')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Sign lease agreement" size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink">{projectTitle}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Draw your signature below. It will be saved with your name to complete this lease.
          </p>
        </div>

        {error ? (
          <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </div>
        ) : null}

        <SignaturePad onChange={setSignatureImage} disabled={submitting} />

        <Input
          label="Full legal name"
          value={printedName}
          onChange={(e) => setPrintedName(e.target.value)}
          placeholder="Type your full name"
          required
          disabled={submitting}
          hint="Printed under your drawn signature on the agreement"
        />

        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
            required
            disabled={submitting}
          />
          <span>
            I have reviewed this residential lease and agree to its terms, including rent,
            security deposit, occupancy, and termination conditions.
            {needsReview
              ? ' Checking this box also confirms I have reviewed the current lease version.'
              : null}
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileCheck className="h-4 w-4" aria-hidden />
            )}
            {submitting ? 'Signing…' : 'Complete signature'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
