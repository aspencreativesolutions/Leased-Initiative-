import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileSignature, Loader2, Send, UserCheck, UserX, Users } from 'lucide-react'
import { RentalAvailabilityBadge } from '@/components/clients/RentalAvailabilityBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import { getPendingLeaseAgreementActionLabel } from '@/lib/clientUtils'
import {
  availableUnitsForApplicant,
  findPropertyByAddress,
} from '@/lib/properties'
import { acceptRegistration, dismissRegistration } from '@/lib/portalUsersApi'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import { formatDate } from '@/lib/utils'
import type { PendingRegistration } from '@/types'

interface NewRegistrationsModalProps {
  open: boolean
  onClose: () => void
  registrations: PendingRegistration[]
  onRefresh: () => void
  onListRefresh: () => void
  onMarkNotificationsRead?: () => void
}

interface JustAccepted {
  clientId: string
  name: string
  propertyAddress?: string
  leaseAction: 'draft' | 'send' | 'view' | 'generating'
  reusedLease: boolean
}

export function NewRegistrationsModal({
  open,
  onClose,
  registrations,
  onRefresh,
  onListRefresh,
  onMarkNotificationsRead,
}: NewRegistrationsModalProps) {
  const navigate = useNavigate()
  const { clients, getContractForClient, properties } = useApp()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [justAccepted, setJustAccepted] = useState<JustAccepted | null>(null)

  useEffect(() => {
    if (!open) {
      setAcceptingId(null)
      setDismissingId(null)
      setError('')
      setJustAccepted(null)
    } else {
      onListRefresh()
      onMarkNotificationsRead?.()
    }
  }, [open, onListRefresh, onMarkNotificationsRead])

  const handleAccept = async (registration: PendingRegistration) => {
    setAcceptingId(registration.id)
    setError('')
    try {
      const result = await acceptRegistration(registration.id)
      onRefresh()
      onListRefresh()
      setJustAccepted({
        clientId: result.client.id,
        name: registration.name,
        propertyAddress: registration.preferredPropertyAddress,
        leaseAction: result.leaseAction ?? (result.reusedLease ? 'send' : 'draft'),
        reusedLease: Boolean(result.reusedLease),
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept registration')
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDismiss = async (registration: PendingRegistration) => {
    setDismissingId(registration.id)
    setError('')
    try {
      await dismissRegistration(registration.id)
      onRefresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not dismiss registration')
    } finally {
      setDismissingId(null)
    }
  }

  const acceptedActionLabel = justAccepted
    ? getPendingLeaseAgreementActionLabel(justAccepted.leaseAction)
    : 'Draft Lease Agreement'

  return (
    <Modal open={open} onClose={onClose} title="New Registrations" size="lg">
      {error && (
        <p className="mb-4 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {justAccepted && (
        <div className="mb-4 rounded-sm border-[length:var(--border-width)] border-brand/30 bg-brand/5 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                {justAccepted.name} accepted
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {justAccepted.reusedLease
                  ? `A lease agreement already exists for${
                      justAccepted.propertyAddress
                        ? ` ${justAccepted.propertyAddress}`
                        : ' this address'
                    }. Their residential lease is generating — review and send it from Pending Tenants.`
                  : `They are now in Pending Tenants. Their residential lease agreement is generating automatically${
                      justAccepted.propertyAddress
                        ? ` for ${justAccepted.propertyAddress}`
                        : ''
                    }.`}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => {
                onClose()
                navigate(`/studio/clients/${justAccepted.clientId}/contract`)
              }}
            >
              {justAccepted.leaseAction === 'generating' ? (
                <FileSignature className="h-4 w-4" />
              ) : justAccepted.leaseAction === 'send' ? (
                <Send className="h-4 w-4" />
              ) : (
                <FileSignature className="h-4 w-4" />
              )}
              {justAccepted.leaseAction === 'generating'
                ? 'View Pending Tenant'
                : acceptedActionLabel}
            </Button>
          </div>
        </div>
      )}

      {registrations.length === 0 && !justAccepted ? (
        <EmptyState
          compact
          icon={Users}
          title="No pending sign-ups"
          description="When someone registers as a tenant, you'll be notified and they will appear here."
        />
      ) : registrations.length === 0 ? (
        <p className="text-sm text-ink-muted">No other pending sign-ups.</p>
      ) : (
        <ul className="divide-y divide-line">
          {registrations.map((registration) => {
            const desiredAddress = registration.preferredPropertyAddress?.trim() || ''
            const matchedProperty = findPropertyByAddress(properties, desiredAddress)
            const availableUnits = matchedProperty
              ? availableUnitsForApplicant(
                  matchedProperty,
                  clients,
                  getContractForClient
                )
              : null
            const displayAddress = matchedProperty?.address || desiredAddress

            return (
              <li
                key={registration.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-ink">{registration.name}</p>
                  <p className="truncate text-sm text-ink-muted">{registration.email}</p>
                  {registration.preferredLandlordCompany && (
                    <p className="text-sm text-ink">
                      Landlord: {registration.preferredLandlordCompany}
                    </p>
                  )}
                  {displayAddress ? (
                    <>
                      <p className="text-sm text-ink">Desired Address: {displayAddress}</p>
                      <RentalAvailabilityBadge
                        availableUnits={availableUnits}
                        propertyId={matchedProperty?.id}
                      />
                    </>
                  ) : null}
                  <p className="text-xs text-ink-faint">
                    Registered {formatDate(registration.createdAt)}
                    {registration.preferredLeaseMonths != null && (
                      <>
                        {' '}
                        · Prefers {formatLeaseLengthLabel(registration.preferredLeaseMonths)}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="min-w-[6.25rem]"
                    title={
                      displayAddress ? `Accept · ${displayAddress}` : 'Accept'
                    }
                    disabled={
                      acceptingId === registration.id || dismissingId === registration.id
                    }
                    onClick={() => handleAccept(registration)}
                  >
                    {acceptingId === registration.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 shrink-0" />
                    )}
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[6.25rem]"
                    disabled={
                      dismissingId === registration.id || acceptingId === registration.id
                    }
                    onClick={() => handleDismiss(registration)}
                  >
                    {dismissingId === registration.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                    Dismiss
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
