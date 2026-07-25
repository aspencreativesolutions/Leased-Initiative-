import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  CheckCircle2,
  FileSignature,
  Loader2,
  Send,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { OccupancyPreferenceTag } from '@/components/clients/OccupancyPreferenceTag'
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
import {
  isPublicDemoSession,
  requestPendingTenantDemoCue,
} from '@/lib/publicDemo'
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
  draftLease: boolean
}

type SortOrder = 'newest' | 'oldest'

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
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  useEffect(() => {
    if (!open) {
      setAcceptingId(null)
      setDismissingId(null)
      setError('')
      setJustAccepted(null)
      setSortOrder('newest')
    } else {
      onListRefresh()
      onMarkNotificationsRead?.()
    }
  }, [open, onListRefresh, onMarkNotificationsRead])

  const sortedRegistrations = useMemo(() => {
    const list = [...registrations]
    list.sort((a, b) => {
      const delta =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? -delta : delta
    })
    return list
  }, [registrations, sortOrder])

  const handleAccept = async (
    registration: PendingRegistration,
    draftLease: boolean
  ) => {
    setAcceptingId(registration.id)
    setError('')
    try {
      const result = await acceptRegistration(registration.id, { draftLease })
      await Promise.resolve(onRefresh())
      onListRefresh()
      setJustAccepted({
        clientId: result.client.id,
        name: registration.name,
        propertyAddress: registration.preferredPropertyAddress,
        leaseAction: result.leaseAction ?? (result.reusedLease ? 'send' : 'draft'),
        reusedLease: Boolean(result.reusedLease),
        draftLease,
      })
      requestPendingTenantDemoCue(registration.name)
      if (isPublicDemoSession()) {
        onClose()
        navigate('/studio/clients#tenants-waiting-lease')
      }
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
                {!justAccepted.draftLease
                  ? `They are now in Pending Tenants. Draft their lease whenever you’re ready.`
                  : justAccepted.reusedLease
                    ? `A lease agreement already exists for${
                        justAccepted.propertyAddress
                          ? ` ${justAccepted.propertyAddress}`
                          : ' this address'
                      }. Their residential lease is generating — status will be Lease Drafted so you can Review & Send from Pending Tenants.`
                    : `They are now in Pending Tenants. Their residential lease is generating — you’ll see Lease Drafted with Review & Send Lease when it’s ready${
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
                navigate(
                  justAccepted.draftLease
                    ? `/studio/clients/${justAccepted.clientId}/contract`
                    : '/studio/clients#tenants-waiting-lease'
                )
              }}
            >
              {justAccepted.leaseAction === 'generating' ? (
                <FileSignature className="h-4 w-4" />
              ) : justAccepted.leaseAction === 'send' ? (
                <Send className="h-4 w-4" />
              ) : (
                <FileSignature className="h-4 w-4" />
              )}
              {!justAccepted.draftLease
                ? 'View Pending Tenants'
                : justAccepted.leaseAction === 'generating'
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
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-caps text-ink-muted">
              {sortedRegistrations.length} waiting
            </p>
            <div
              role="group"
              aria-label="Sort by"
              className="inline-flex items-center gap-1.5"
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-caps text-ink-muted">
                <ArrowDownUp className="h-3 w-3" aria-hidden />
                Sort by
              </span>
              <div className="inline-flex rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface p-0.5">
                <button
                  type="button"
                  aria-pressed={sortOrder === 'newest'}
                  onClick={() => setSortOrder('newest')}
                  className={
                    sortOrder === 'newest'
                      ? 'rounded-[calc(var(--radius-sm)-2px)] bg-brand px-2 py-1 text-[11px] font-semibold text-surface-paper'
                      : 'rounded-[calc(var(--radius-sm)-2px)] px-2 py-1 text-[11px] font-semibold text-ink-muted hover:text-ink'
                  }
                >
                  Newest
                </button>
                <button
                  type="button"
                  aria-pressed={sortOrder === 'oldest'}
                  onClick={() => setSortOrder('oldest')}
                  className={
                    sortOrder === 'oldest'
                      ? 'rounded-[calc(var(--radius-sm)-2px)] bg-brand px-2 py-1 text-[11px] font-semibold text-surface-paper'
                      : 'rounded-[calc(var(--radius-sm)-2px)] px-2 py-1 text-[11px] font-semibold text-ink-muted hover:text-ink'
                  }
                >
                  Oldest
                </button>
              </div>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {sortedRegistrations.map((registration) => {
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
              const busy =
                acceptingId === registration.id || dismissingId === registration.id

              return (
                <li
                  key={registration.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
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
                          · Prefers{' '}
                          {formatLeaseLengthLabel(registration.preferredLeaseMonths)}
                        </>
                      )}
                    </p>
                    {registration.preferredOccupancyMode ? (
                      <div className="space-y-1">
                        <OccupancyPreferenceTag mode={registration.preferredOccupancyMode} />
                        {(registration.preferredOccupancyMode === 'roommates' ||
                          registration.preferredOccupancyMode === 'open_to_roommates' ||
                          registration.preferredOccupancyMode === 'private_room' ||
                          registration.preferredOccupancyMode === 'shared_room') &&
                        (registration.roommateInviteCount ??
                          registration.roommateInvitePhones?.length ??
                          0) > 0 ? (
                          <p className="text-xs font-medium text-brand">
                            {`Invited ${registration.roommateInviteCount ?? registration.roommateInvitePhones?.length} friend${
                              (registration.roommateInviteCount ??
                                registration.roommateInvitePhones?.length ??
                                0) === 1
                                ? ''
                                : 's'
                            } to share`}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
                    <Button
                      size="sm"
                      className="min-w-[9.5rem]"
                      title={
                        displayAddress
                          ? `Accept & Draft Lease · ${displayAddress}`
                          : 'Accept & Draft Lease'
                      }
                      disabled={busy}
                      onClick={() => void handleAccept(registration, true)}
                    >
                      {acceptingId === registration.id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4 shrink-0" />
                      )}
                      Accept & Draft Lease
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-w-[9.5rem]"
                      disabled={busy}
                      onClick={() => void handleAccept(registration, false)}
                    >
                      Accept & Draft Later
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-[9.5rem]"
                      disabled={busy}
                      onClick={() => void handleDismiss(registration)}
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
        </>
      )}
    </Modal>
  )
}
