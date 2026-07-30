import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import { furnishedStatusLabel } from '@/lib/propertyListingDisplay'
import { propertyToWriteInput } from '@/lib/propertiesApi'
import { formatUsd } from '@/lib/rentalRent'
import { resolveFurnishedFlag } from '@/lib/rentalBeds'
import type { Property } from '@/types'

interface TakeOffMarketModalProps {
  property: Property | null
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function TakeOffMarketModal({
  property,
  open,
  onClose,
  onSaved,
}: TakeOffMarketModalProps) {
  const { updateProperty } = useApp()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('')
    setError('')
    setSubmitting(false)
  }, [open, property?.id])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleConfirm = async () => {
    if (!property || submitting) return
    setSubmitting(true)
    setError('')
    const trimmedReason = reason.trim()
    try {
      await updateProperty(
        property.id,
        propertyToWriteInput(property, {
          offMarket: true,
          offMarketReason: trimmedReason || null,
          offMarketAt: new Date().toISOString(),
        })
      )
      onSaved?.()
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not take this rental off market'
      )
      setSubmitting(false)
    }
  }

  if (!property) return null

  const furnished = resolveFurnishedFlag(property)
  const rent =
    property.monthlyRent != null && property.monthlyRent > 0
      ? formatUsd(property.monthlyRent)
      : '—'

  return (
    <Modal open={open} onClose={handleClose} title="Take Off Market" size="md">
      <div className="space-y-4">
        <div className="rounded-[var(--radius-sm)] border-2 border-line bg-surface px-4 py-3 text-sm text-ink">
          <p className="font-semibold text-ink">{property.address}</p>
          <dl className="mt-2 space-y-1 text-ink-muted">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-ink">Type</dt>
              <dd>
                {property.propertyType} · {furnishedStatusLabel(furnished)}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-ink">Monthly rent</dt>
              <dd className="tabular-nums">{rent}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-ink">Beds / occupancy</dt>
              <dd>
                {property.bedrooms} bed
                {property.bedrooms === 1 ? '' : 's'} · max {property.maxTenants}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-sm text-ink-muted">
          This property will be added to an off-market tab.
        </p>

        <Textarea
          label="Reason (optional)"
          hint="Shown on the rental tile when provided."
          id="off-market-reason"
          name="offMarketReason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Holding for returning tenant, renovations…"
          disabled={submitting}
        />

        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Confirm Take Off Market'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
