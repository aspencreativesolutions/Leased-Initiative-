import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Eye,
  FileSignature,
  LayoutGrid,
  LayoutList,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Send,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { PendingClientBadge } from '@/components/clients/PendingClientBadge'
import { SendInviteModal } from '@/components/clients/SendInviteModal'
import { OccupancyPreferenceTag } from '@/components/clients/OccupancyPreferenceTag'
import { RentalAvailabilityBadge } from '@/components/clients/RentalAvailabilityBadge'
import {
  clientNameMarkersClass,
} from '@/components/clients/clientBadgeStyles'
import { LeaseAgreementPreviewModal } from '@/components/contracts/LeaseAgreementPreviewModal'
import { SendContractModal } from '@/components/contracts/SendContractModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHelpIcon } from '@/components/ui/SectionHelpIcon'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import {
  consumeLeaseAgreementPreviewRequest,
  peekLeaseAgreementPreviewRequest,
  requestLeaseAgreementPreview,
} from '@/lib/leaseAgreementPreview'
import {
  acceptRegistration,
  dismissRegistration,
  fetchPortalUsers,
} from '@/lib/portalUsersApi'
import { formatLeaseLengthLabel } from '@/lib/leaseSchedule'
import {
  availableUnitsForApplicant,
  findPropertyByAddress,
} from '@/lib/properties'
import {
  RENTAL_APPLICANTS_PROPERTY_PARAM,
  RENTAL_APPLICANTS_SECTION_PARAM,
  type RentalApplicantsFocusTarget,
} from '@/lib/rentalApplicantsFocus'
import { cn, formatDate } from '@/lib/utils'
import {
  consumeWaitingConnectHighlightEmail,
  isPublicDemoSession,
  peekPendingTenantDemoCue,
  peekWaitingConnectHighlightEmail,
  requestPendingTenantDemoCue,
} from '@/lib/publicDemo'
import type { Client, ContractData, PendingRegistration, PortalUserAccepted, PortalUsersOverview, Property } from '@/types'

const WAITING_CONNECT_VIEW_KEY = 'leased-waiting-connect-view'
type WaitingConnectView = 'list' | 'gallery'

const WAITING_CONNECT_HIGHLIGHT_MS = 4500
const PENDING_TENANT_HIGHLIGHT_MS = 4500

function roommateInviteNote(registration: PendingRegistration): string | null {
  const mode = String(registration.preferredOccupancyMode ?? '').toLowerCase()
  const isRoommate =
    mode === 'roommates' ||
    mode === 'open_to_roommates' ||
    mode === 'private_room' ||
    mode === 'shared_room'
  if (!isRoommate) return null
  const count =
    registration.roommateInviteCount ??
    registration.roommateInvitePhones?.length ??
    0
  if (count <= 0) return 'Wants roommates · no friend invites sent yet'
  return `Invited ${count} friend${count === 1 ? '' : 's'} to share`
}

function registrationMatchesProperty(
  registration: PendingRegistration,
  propertyId: string | null,
  properties: Property[]
): boolean {
  if (!propertyId) return false
  return (
    findPropertyByAddress(properties, registration.preferredPropertyAddress)?.id ===
    propertyId
  )
}

function pendingApplicantMatchesProperty(
  applicant: PortalUserAccepted,
  propertyId: string | null,
  properties: Property[]
): boolean {
  if (!propertyId) return false
  const address = applicant.propertyAddress || applicant.projectName
  return findPropertyByAddress(properties, address)?.id === propertyId
}

function sortWaitingRegistrations(
  registrations: PendingRegistration[],
  highlightEmail: string | null,
  highlightPropertyId: string | null,
  properties: Property[]
): PendingRegistration[] {
  const highlight = highlightEmail?.trim().toLowerCase() || null
  return [...registrations].sort((a, b) => {
    if (highlight) {
      const aMatch = a.email.trim().toLowerCase() === highlight
      const bMatch = b.email.trim().toLowerCase() === highlight
      if (aMatch !== bMatch) return aMatch ? -1 : 1
    }
    if (highlightPropertyId) {
      const aMatch = registrationMatchesProperty(a, highlightPropertyId, properties)
      const bMatch = registrationMatchesProperty(b, highlightPropertyId, properties)
      if (aMatch !== bMatch) return aMatch ? -1 : 1
    }
    const aAt = new Date(a.applicationSubmittedAt || a.createdAt).getTime()
    const bAt = new Date(b.applicationSubmittedAt || b.createdAt).getTime()
    return bAt - aAt
  })
}

function sortProspectiveApplicants(
  applicants: PortalUserAccepted[],
  highlightName: string | null,
  highlightPropertyId: string | null,
  properties: Property[]
): PortalUserAccepted[] {
  const highlight = highlightName?.trim().toLowerCase() || null
  return [...applicants].sort((a, b) => {
    if (highlight) {
      const aMatch = a.name.trim().toLowerCase() === highlight
      const bMatch = b.name.trim().toLowerCase() === highlight
      if (aMatch !== bMatch) return aMatch ? -1 : 1
    }
    if (highlightPropertyId) {
      const aMatch = pendingApplicantMatchesProperty(a, highlightPropertyId, properties)
      const bMatch = pendingApplicantMatchesProperty(b, highlightPropertyId, properties)
      if (aMatch !== bMatch) return aMatch ? -1 : 1
    }
    return new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
  })
}

const WAITING_TO_CONNECT_HELP =
  'Invite claims and Start Application submissions awaiting your approval — accept to generate their lease'
const PENDING_TENANTS_HELP =
  'Tenants awaiting a signed lease — from Waiting to Connect, Add Tenant, or lease import'

function readWaitingConnectView(): WaitingConnectView {
  try {
    const raw = sessionStorage.getItem(WAITING_CONNECT_VIEW_KEY)
    if (raw === 'list' || raw === 'gallery') return raw
  } catch {
    /* sessionStorage unavailable */
  }
  return 'gallery'
}

/**
 * Nested under Dashboard: registration queue (Waiting to Connect) and
 * approved applicants still awaiting a signed lease (Pending Tenants).
 * When both are shown, they sit side by side on large screens.
 */
export function TenantPipelineSections({
  showWaitingToConnect = true,
  pendingSectionTitle = 'Pending Tenants',
  pendingSectionId = 'tenants-waiting-lease',
}: {
  /** When false, only accepted-but-not-official pending tenants are shown (dashboard subsection). */
  showWaitingToConnect?: boolean
  pendingSectionTitle?: string
  pendingSectionId?: string
} = {}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { clients, getContractForClient, properties, refresh, settings } = useApp()
  const [overview, setOverview] = useState<PortalUsersOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [waitingView, setWaitingView] = useState<WaitingConnectView>(readWaitingConnectView)
  const [highlightEmail, setHighlightEmail] = useState<string | null>(() =>
    peekWaitingConnectHighlightEmail()?.trim().toLowerCase() || null
  )
  const [highlightBreathing, setHighlightBreathing] = useState(
    () => Boolean(peekWaitingConnectHighlightEmail())
  )
  const [highlightPropertyId, setHighlightPropertyId] = useState<string | null>(null)
  const [highlightPropertyTarget, setHighlightPropertyTarget] =
    useState<RentalApplicantsFocusTarget | null>(null)
  const [pendingHighlightName, setPendingHighlightName] = useState<string | null>(null)
  const [pendingSyncing, setPendingSyncing] = useState(false)
  const [resendTarget, setResendTarget] = useState<{
    client: Client
    contract: ContractData
  } | null>(null)
  const [previewClientId, setPreviewClientId] = useState<string | null>(null)
  const [pendingPreviewClientId, setPendingPreviewClientId] = useState<string | null>(() =>
    peekLeaseAgreementPreviewRequest()
  )
  const [waitingAddOpen, setWaitingAddOpen] = useState(false)
  const [waitingInviteOpen, setWaitingInviteOpen] = useState(false)

  const previewClient = previewClientId
    ? clients.find((c) => c.id === previewClientId) ?? null
    : null
  const previewContract = previewClientId
    ? getContractForClient(previewClientId) ?? null
    : null

  // Open Lease Agreement Preview once the drafted contract is available/ready.
  useEffect(() => {
    const requestedId = pendingPreviewClientId || peekLeaseAgreementPreviewRequest()
    if (!requestedId) return
    const client = clients.find((c) => c.id === requestedId)
    const contract = getContractForClient(requestedId)
    if (!client || !contract) return
    if (contract.leaseGenerationStatus === 'generating') return
    consumeLeaseAgreementPreviewRequest()
    setPendingPreviewClientId(null)
    setPreviewClientId(requestedId)
  }, [pendingPreviewClientId, clients, getContractForClient])
  const setWaitingConnectView = (view: WaitingConnectView) => {
    setWaitingView(view)
    try {
      sessionStorage.setItem(WAITING_CONNECT_VIEW_KEY, view)
    } catch {
      /* sessionStorage unavailable */
    }
  }

  const refreshOverview = useCallback(async () => {
    try {
      const data = await fetchPortalUsers()
      setOverview(data)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load tenant sign-ups')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount and whenever store clients/properties change (lease signed → official,
  // occupancy shifts → availability badges).
  const clientsPipelineKey = clients
    .map((c) => `${c.id}:${c.isOfficialClient ? 1 : 0}:${c.contractStatus}`)
    .join('|')
  const propertiesOccupancyKey = properties
    .map((p) => `${p.id}:${p.address}:${p.maxTenants}`)
    .join('|')

  useEffect(() => {
    void refreshOverview()
  }, [refreshOverview, clientsPipelineKey, propertiesOccupancyKey])

  const pending = sortWaitingRegistrations(
    overview?.pending ?? [],
    highlightEmail,
    highlightPropertyTarget === 'waiting' ? highlightPropertyId : null,
    properties
  )

  useEffect(() => {
    if (loading || !showWaitingToConnect) return
    const email = peekWaitingConnectHighlightEmail()?.trim().toLowerCase()
    if (!email) return
    setHighlightEmail(email)
    setHighlightBreathing(true)
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById('tenants-waiting-connect')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    // Keep applicant pinned at top until accept; only the breathe animation is timed.
    const breatheTimer = window.setTimeout(() => {
      setHighlightBreathing(false)
    }, WAITING_CONNECT_HIGHLIGHT_MS)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(breatheTimer)
    }
  }, [loading, showWaitingToConnect])

  // Rentals → View Applicants: flash matching Waiting / Pending items for this property.
  const applicantsPropertyParam =
    searchParams.get(RENTAL_APPLICANTS_PROPERTY_PARAM)?.trim() || ''
  const applicantsSectionParam =
    searchParams.get(RENTAL_APPLICANTS_SECTION_PARAM)?.trim() || ''

  useEffect(() => {
    if (loading || !applicantsPropertyParam) return
    const target: RentalApplicantsFocusTarget =
      applicantsSectionParam === 'pending' ? 'pending' : 'waiting'
    if (target === 'waiting' && !showWaitingToConnect) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(RENTAL_APPLICANTS_PROPERTY_PARAM)
          next.delete(RENTAL_APPLICANTS_SECTION_PARAM)
          return next
        },
        { replace: true }
      )
      return
    }

    setHighlightPropertyId(applicantsPropertyParam)
    setHighlightPropertyTarget(target)
    if (target === 'waiting') {
      setHighlightBreathing(true)
    }

    const sectionId =
      target === 'waiting' ? 'tenants-waiting-connect' : pendingSectionId
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    const clearMs =
      target === 'waiting' ? WAITING_CONNECT_HIGHLIGHT_MS : PENDING_TENANT_HIGHLIGHT_MS
    const clearTimer = window.setTimeout(() => {
      setHighlightPropertyId(null)
      setHighlightPropertyTarget(null)
      setHighlightBreathing(false)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(RENTAL_APPLICANTS_PROPERTY_PARAM)
          next.delete(RENTAL_APPLICANTS_SECTION_PARAM)
          return next
        },
        { replace: true }
      )
    }, clearMs)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(clearTimer)
    }
  }, [
    applicantsPropertyParam,
    applicantsSectionParam,
    loading,
    pendingSectionId,
    setSearchParams,
    showWaitingToConnect,
  ])

  // Accepted / manually added tenants who have not signed yet. Signed → Official Tenants.
  const prospectiveApplicants = sortProspectiveApplicants((() => {
    const fromOverview = (overview?.accepted ?? []).filter(
      (user) =>
        !user.isOfficialClient &&
        user.contractStatus !== 'Signed' &&
        user.contractStatus !== 'Completed'
    )
    const linkedIds = new Set(fromOverview.map((user) => user.clientId))
    const localPending: PortalUserAccepted[] = clients
      .filter((client) => {
        if (linkedIds.has(client.id)) return false
        if (client.isOfficialClient) return false
        if (
          client.contractStatus === 'Signed' ||
          client.contractStatus === 'Completed' ||
          client.contractStatus === 'Cancelled'
        ) {
          return false
        }
        return true
      })
      .map((client) => {
        const contract = getContractForClient(client.id)
        const leaseAction =
          contract?.leaseGenerationStatus === 'generating'
            ? ('generating' as const)
            : contract
              ? ('send' as const)
              : ('draft' as const)
        const propertyAddress =
          (contract?.clientAddress && String(contract.clientAddress).trim()) ||
          client.projectName ||
          ''
        return {
          userId: `manual-${client.id}`,
          name: client.name,
          email: client.email,
          registeredAt: client.createdAt,
          clientId: client.id,
          clientName: client.name,
          projectName: client.projectName,
          propertyAddress: propertyAddress || undefined,
          contractStatus: client.contractStatus,
          hasLeaseAgreement: Boolean(contract) && leaseAction === 'send',
          leaseAction,
          leaseGenerationStatus: contract?.leaseGenerationStatus,
          isOfficialClient: false,
          timelineStageId:
            leaseAction === 'generating' ? 'lease_generating' : 'inquiry',
          timelineStageLabel:
            leaseAction === 'generating' ? 'Generating Lease Agreement' : 'Inquiry',
          acceptedAt: client.createdAt,
          handlerName: overview?.handlerName ?? '',
          handlerEmail: overview?.handlerEmail ?? '',
        }
      })
    return [...fromOverview, ...localPending]
  })(),
    pendingHighlightName,
    highlightPropertyTarget === 'pending' ? highlightPropertyId : null,
    properties
  )

  useEffect(() => {
    if (loading) return
    const name = peekPendingTenantDemoCue()
    if (!name) return
    setPendingHighlightName(name)
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(pendingSectionId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    const clearTimer = window.setTimeout(() => {
      setPendingHighlightName(null)
    }, PENDING_TENANT_HIGHLIGHT_MS)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(clearTimer)
    }
  }, [loading, pendingSectionId, prospectiveApplicants.length])

  const hasGeneratingLease = prospectiveApplicants.some(
    (user) => user.leaseAction === 'generating'
  )

  // Poll while any lease is generating so status flips to Lease Drafted automatically.
  useEffect(() => {
    if (!hasGeneratingLease) return
    const id = window.setInterval(() => {
      void refreshOverview()
      void refresh()
    }, 800)
    return () => window.clearInterval(id)
  }, [hasGeneratingLease, refreshOverview, refresh])
  const handleAccept = async (
    registration: PendingRegistration,
    draftLease: boolean
  ) => {
    setAcceptingId(registration.id)
    setError('')
    setPendingSyncing(true)
    const acceptedEmail = registration.email.trim().toLowerCase()

    // Optimistic: move into Pending Tenants immediately with Lease Drafted + Review & Send.
    setOverview((prev) => {
      const now = new Date().toISOString()
      const base = prev ?? {
        handlerName: settings.ownerName || '',
        handlerEmail: settings.email || '',
        pending: [],
        accepted: [],
        pendingCount: 0,
        acceptedCount: 0,
      }
      const optimistic: PortalUserAccepted = {
        userId: registration.id,
        name: registration.name,
        email: registration.email,
        registeredAt: registration.createdAt,
        clientId: `optimistic-${registration.id}`,
        clientName: registration.name,
        projectName:
          registration.preferredPropertyAddress?.trim() || `${registration.name} Lease`,
        propertyAddress: registration.preferredPropertyAddress?.trim() || undefined,
        contractStatus: draftLease ? 'Draft in Progress' : 'Not Started',
        hasLeaseAgreement: Boolean(draftLease),
        // Show as drafted immediately — generation continues in the background.
        leaseAction: draftLease ? 'send' : 'draft',
        leaseGenerationStatus: draftLease ? 'ready' : undefined,
        isOfficialClient: false,
        timelineStageId: draftLease ? 'lease_ready' : 'inquiry',
        timelineStageLabel: draftLease ? 'Lease Drafted' : 'Inquiry',
        acceptedAt: now,
        handlerName: base.handlerName,
        handlerEmail: base.handlerEmail,
      }
      return {
        ...base,
        pending: base.pending.filter((p) => p.id !== registration.id),
        pendingCount: Math.max(0, (base.pendingCount ?? base.pending.length) - 1),
        accepted: [optimistic, ...base.accepted.filter((a) => a.userId !== registration.id)],
        acceptedCount: (base.acceptedCount ?? base.accepted.length) + 1,
      }
    })
    setPendingHighlightName(registration.name)
    if (highlightEmail === acceptedEmail) {
      consumeWaitingConnectHighlightEmail()
      setHighlightEmail(null)
      setHighlightBreathing(false)
    }
    requestPendingTenantDemoCue(registration.name)
    if (isPublicDemoSession()) {
      document
        .getElementById(pendingSectionId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    try {
      const result = await acceptRegistration(registration.id, { draftLease })
      try {
        await refresh()
        await refreshOverview()
      } finally {
        setPendingSyncing(false)
      }
      if (draftLease && result.client?.id) {
        requestLeaseAgreementPreview(result.client.id)
        setPendingPreviewClientId(result.client.id)
      }
    } catch (err) {
      setPendingSyncing(false)
      setError(err instanceof ApiError ? err.message : 'Could not accept registration')
      await refreshOverview()
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDismiss = async (registration: PendingRegistration) => {
    setDismissingId(registration.id)
    setError('')
    try {
      await dismissRegistration(registration.id)
      await refreshOverview()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not dismiss registration')
    } finally {
      setDismissingId(null)
    }
  }

  const waitingSection = showWaitingToConnect ? (
    <section
      id="tenants-waiting-connect"
      data-onboarding="tenants-waiting-connect"
      className="min-w-0 scroll-mt-28 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface/40 p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserPlus className="h-4 w-4 shrink-0 text-ink-muted" />
            <h2 className="heading-display text-lg">Waiting to Connect</h2>
            {!loading && pending.length > 0 && (
              <span className="waiting-connect-count--attention rounded-full bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent">
                {pending.length}
              </span>
            )}
          </div>
          {/* Mobile: Link / Add live with this section (removed from global header) */}
          <div
            className="flex items-center gap-1.5 md:hidden"
            data-tenant-actions
            aria-label="Tenant action buttons"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-onboarding="dashboard-send-invite"
              className="h-8 !gap-1 !px-2.5 !py-0 text-[11px] font-semibold"
              aria-label="Send Invite Link"
              onClick={() => setWaitingInviteOpen(true)}
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              Link
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-onboarding="dashboard-add-client"
              className="h-8 !gap-1 !px-2.5 !py-0 text-[11px] font-semibold"
              aria-label="Add Tenant"
              onClick={() => setWaitingAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              Add
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            role="group"
            aria-label="Waiting to Connect display"
            className="inline-flex rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper p-0.5"
          >
            <button
              type="button"
              title="List View"
              aria-label="List View"
              aria-pressed={waitingView === 'list'}
              onClick={() => setWaitingConnectView('list')}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] transition-colors',
                waitingView === 'list'
                  ? 'bg-brand text-surface-paper'
                  : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
              )}
            >
              <LayoutList className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              title="Gallery View"
              aria-label="Gallery View"
              aria-pressed={waitingView === 'gallery'}
              onClick={() => setWaitingConnectView('gallery')}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] transition-colors',
                waitingView === 'gallery'
                  ? 'bg-brand text-surface-paper'
                  : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
              )}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <SectionHelpIcon label={WAITING_TO_CONNECT_HELP} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={Users}
            title="No one waiting to connect"
            description="When someone uses your invite link, enters an invite code, or sends a Start Application from their portal, they appear here until you accept or dismiss them."
          />
        </Card>
      ) : (
        <div key={waitingView} className="waiting-connect-view">
          {waitingView === 'list' ? (
            <ul className="flex flex-col gap-2">
              {pending.map((registration) => (
                <WaitingConnectListRow
                  key={registration.id}
                  registration={registration}
                  clients={clients}
                  properties={properties}
                  getContractForClient={getContractForClient}
                  acceptingId={acceptingId}
                  dismissingId={dismissingId}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                  highlighted={
                    Boolean(
                      (highlightEmail &&
                        registration.email.trim().toLowerCase() === highlightEmail) ||
                        (highlightPropertyTarget === 'waiting' &&
                          registrationMatchesProperty(
                            registration,
                            highlightPropertyId,
                            properties
                          ))
                    )
                  }
                  breathe={
                    Boolean(
                      highlightBreathing &&
                        ((highlightEmail &&
                          registration.email.trim().toLowerCase() === highlightEmail) ||
                          (highlightPropertyTarget === 'waiting' &&
                            registrationMatchesProperty(
                              registration,
                              highlightPropertyId,
                              properties
                            )))
                    )
                  }
                />
              ))}
            </ul>
          ) : (
            <ul className="waiting-connect-gallery">
              {pending.map((registration) => (
                <WaitingConnectGalleryTile
                  key={registration.id}
                  registration={registration}
                  clients={clients}
                  properties={properties}
                  getContractForClient={getContractForClient}
                  acceptingId={acceptingId}
                  dismissingId={dismissingId}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                  highlighted={
                    Boolean(
                      (highlightEmail &&
                        registration.email.trim().toLowerCase() === highlightEmail) ||
                        (highlightPropertyTarget === 'waiting' &&
                          registrationMatchesProperty(
                            registration,
                            highlightPropertyId,
                            properties
                          ))
                    )
                  }
                  breathe={
                    Boolean(
                      highlightBreathing &&
                        ((highlightEmail &&
                          registration.email.trim().toLowerCase() === highlightEmail) ||
                          (highlightPropertyTarget === 'waiting' &&
                            registrationMatchesProperty(
                              registration,
                              highlightPropertyId,
                              properties
                            )))
                    )
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  ) : null

  const pendingSection = (
    <section
      id={pendingSectionId}
      data-onboarding={pendingSectionId}
      className={cn(
        'min-w-0 scroll-mt-28 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface/40 p-4 sm:p-5',
        pendingHighlightName && 'pending-tenants-section--demo-highlight'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileSignature className="h-4 w-4 shrink-0 text-ink-muted" />
          <h2 className="heading-display text-lg">{pendingSectionTitle}</h2>
          {!loading && prospectiveApplicants.length > 0 && (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              {prospectiveApplicants.length}
            </span>
          )}
          {pendingHighlightName ? (
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">
              {pendingHighlightName} is now a pending tenant!
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pendingSyncing || acceptingId ? (
            <Loader2
              className="h-4 w-4 animate-spin text-brand"
              aria-label="Updating pending tenants"
            />
          ) : null}
          <SectionHelpIcon label={PENDING_TENANTS_HELP} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : prospectiveApplicants.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={FileSignature}
            title="No pending tenants"
            description="Accept someone from Waiting to Connect, or use Add Tenant to generate a lease — they appear here until it is signed."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-3 sm:px-4">Tenant</th>
                <th className="hidden px-3 py-3 sm:table-cell sm:px-4">Desired address</th>
                <th className="hidden px-3 py-3 md:table-cell md:px-4">Lease Status</th>
                <th className="px-3 py-3 text-right sm:px-4">Lease Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {prospectiveApplicants.map((user) => (
                <ProspectiveApplicantRow
                  key={user.userId}
                  user={user}
                  contract={getContractForClient(user.clientId)}
                  highlighted={
                    Boolean(
                      (pendingHighlightName &&
                        user.name.trim().toLowerCase() ===
                          pendingHighlightName.trim().toLowerCase()) ||
                        (highlightPropertyTarget === 'pending' &&
                          pendingApplicantMatchesProperty(
                            user,
                            highlightPropertyId,
                            properties
                          ))
                    )
                  }
                  onView={(client) => setPreviewClientId(client.id)}
                  onReviewAndSend={(client) => setPreviewClientId(client.id)}
                  onEdit={() => navigate(`/studio/clients/${user.clientId}/contract`)}
                  onSend={(client, contract) => setResendTarget({ client, contract })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {showWaitingToConnect ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
          {waitingSection}
          {pendingSection}
        </div>
      ) : (
        pendingSection
      )}

      {previewClient && previewContract ? (
        <LeaseAgreementPreviewModal
          open
          onClose={() => setPreviewClientId(null)}
          client={previewClient}
          contract={previewContract}
          onSend={() => {
            setResendTarget({ client: previewClient, contract: previewContract })
          }}
          onEditDraft={() => {
            const clientId = previewClient.id
            setPreviewClientId(null)
            navigate(`/studio/clients/${clientId}/contract`)
          }}
        />
      ) : null}

      {resendTarget && (
        <SendContractModal
          open
          onClose={() => setResendTarget(null)}
          client={resendTarget.client}
          contract={resendTarget.contract}
          onSent={() => {
            setResendTarget(null)
            setPreviewClientId(null)
            void refresh()
            void refreshOverview()
          }}
        />
      )}

      <AddClientModal open={waitingAddOpen} onClose={() => setWaitingAddOpen(false)} />
      <SendInviteModal open={waitingInviteOpen} onClose={() => setWaitingInviteOpen(false)} />
    </div>
  )
}

type WaitingConnectItemProps = {
  registration: PendingRegistration
  clients: Client[]
  properties: ReturnType<typeof useApp>['properties']
  getContractForClient: ReturnType<typeof useApp>['getContractForClient']
  acceptingId: string | null
  dismissingId: string | null
  onAccept: (registration: PendingRegistration, draftLease: boolean) => void
  onDismiss: (registration: PendingRegistration) => void
  highlighted?: boolean
  /** Timed breathe animation (separate from pinned highlight) */
  breathe?: boolean
}

function waitingConnectApplicantMeta(props: WaitingConnectItemProps) {
  const { registration, clients, properties, getContractForClient } = props
  const desiredAddress = registration.preferredPropertyAddress?.trim() || ''
  const matchedProperty = findPropertyByAddress(properties, desiredAddress)
  const availableUnits = matchedProperty
    ? availableUnitsForApplicant(matchedProperty, clients, getContractForClient)
    : null
  const displayAddress = matchedProperty?.address || desiredAddress || '—'
  const propertyId = matchedProperty?.id
  const busy =
    props.acceptingId === registration.id || props.dismissingId === registration.id

  return { desiredAddress, availableUnits, displayAddress, propertyId, busy }
}

function WaitingConnectActions({
  registration,
  acceptingId,
  dismissingId,
  busy,
  onAccept,
  onDismiss,
  compact = false,
  stretch = false,
}: {
  registration: PendingRegistration
  acceptingId: string | null
  dismissingId: string | null
  busy: boolean
  onAccept: (registration: PendingRegistration, draftLease: boolean) => void
  onDismiss: (registration: PendingRegistration) => void
  compact?: boolean
  stretch?: boolean
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-2',
        stretch
          ? 'w-full'
          : compact
            ? 'ml-auto w-full max-w-[14.5rem] sm:w-[14.5rem]'
            : 'w-[min(14.5rem,48%)] sm:w-[14.5rem]'
      )}
    >
      <Button
        size="sm"
        className="h-8 w-full px-2"
        disabled={busy}
        onClick={() => onAccept(registration, true)}
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
        className="h-8 w-full px-2"
        disabled={busy}
        onClick={() => onAccept(registration, false)}
      >
        Accept & Draft Later
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full px-2"
        disabled={busy}
        onClick={() => onDismiss(registration)}
      >
        {dismissingId === registration.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserX className="h-4 w-4" />
        )}
        Dismiss
      </Button>
    </div>
  )
}

function WaitingConnectGalleryTile(props: WaitingConnectItemProps) {
  const {
    registration,
    acceptingId,
    dismissingId,
    onAccept,
    onDismiss,
    highlighted,
    breathe,
  } = props
  const { desiredAddress, availableUnits, displayAddress, propertyId, busy } =
    waitingConnectApplicantMeta(props)
  const inviteNote = roommateInviteNote(registration)

  return (
    <li
      className={cn(
        'waiting-connect-tile relative flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] border-[length:var(--border-width)] p-4',
        highlighted && 'waiting-connect-tile--demo-highlight',
        breathe && 'waiting-connect-tile--demo-breathe'
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className={clientNameMarkersClass}>
          <p className="min-w-0 truncate font-semibold text-ink">{registration.name}</p>
          <PendingClientBadge />
        </div>
        <OccupancyPreferenceTag mode={registration.preferredOccupancyMode} />
        <p className="truncate text-sm text-ink-muted">{registration.email}</p>
      </div>

      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Desired Address
          </p>
          <p className="text-sm font-medium text-ink">{displayAddress}</p>
          {registration.preferredLandlordCompany && (
            <p className="pt-1 text-xs text-ink-muted">
              Landlord: {registration.preferredLandlordCompany}
            </p>
          )}
          {inviteNote ? (
            <p className="pt-1 text-xs font-medium text-brand">{inviteNote}</p>
          ) : null}
          <p className="text-xs text-ink-faint">
            Registered {formatDate(registration.createdAt)}
            {registration.preferredLeaseMonths != null && (
              <>
                {' '}
                · Prefers {formatLeaseLengthLabel(registration.preferredLeaseMonths)}
              </>
            )}
            {registration.preferredLeaseStartDate && (
              <>
                {' '}
                · Start {formatDate(registration.preferredLeaseStartDate)}
              </>
            )}
          </p>
        </div>

        {desiredAddress ? (
          <div className="mt-auto flex min-w-0 justify-start pt-3 pb-0.5">
            <RentalAvailabilityBadge
              availableUnits={availableUnits}
              propertyId={propertyId}
              className="waiting-connect-tile__availability"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 shrink-0">
        <WaitingConnectActions
          registration={registration}
          acceptingId={acceptingId}
          dismissingId={dismissingId}
          busy={busy}
          onAccept={onAccept}
          onDismiss={onDismiss}
          stretch
        />
      </div>
    </li>
  )
}

function WaitingConnectListRow(props: WaitingConnectItemProps) {
  const {
    registration,
    acceptingId,
    dismissingId,
    onAccept,
    onDismiss,
    highlighted,
    breathe,
  } = props
  const { desiredAddress, availableUnits, displayAddress, propertyId, busy } =
    waitingConnectApplicantMeta(props)
  const inviteNote = roommateInviteNote(registration)

  return (
    <li
      className={cn(
        'waiting-connect-row rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-2.5 sm:px-3.5',
        highlighted && 'waiting-connect-row--demo-highlight',
        breathe && 'waiting-connect-row--demo-breathe'
      )}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="min-w-0 truncate font-semibold text-ink">{registration.name}</p>
            <p className="min-w-0 truncate text-sm text-ink-muted">{registration.email}</p>
          </div>
          <OccupancyPreferenceTag mode={registration.preferredOccupancyMode} />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate text-sm font-medium text-ink" title={displayAddress}>
              {displayAddress}
            </p>
            {desiredAddress ? (
              <RentalAvailabilityBadge
                availableUnits={availableUnits}
                propertyId={propertyId}
              />
            ) : null}
            {registration.preferredLeaseStartDate ? (
              <p className="text-xs text-ink-faint">
                Start {formatDate(registration.preferredLeaseStartDate)}
                {registration.preferredLeaseMonths != null
                  ? ` · ${formatLeaseLengthLabel(registration.preferredLeaseMonths)}`
                  : ''}
              </p>
            ) : registration.preferredLeaseMonths != null ? (
              <p className="text-xs text-ink-faint">
                Prefers {formatLeaseLengthLabel(registration.preferredLeaseMonths)}
              </p>
            ) : null}
            {inviteNote ? (
              <p className="text-xs font-medium text-brand">{inviteNote}</p>
            ) : null}
          </div>
        </div>
        <WaitingConnectActions
          registration={registration}
          acceptingId={acceptingId}
          dismissingId={dismissingId}
          busy={busy}
          onAccept={onAccept}
          onDismiss={onDismiss}
          compact
        />
      </div>
    </li>
  )
}

function ProspectiveApplicantRow({
  user,
  contract,
  highlighted = false,
  onView,
  onReviewAndSend,
  onEdit,
  onSend,
}: {
  user: PortalUserAccepted
  contract: ContractData | undefined
  highlighted?: boolean
  onView: (client: Client, contract: ContractData) => void
  onReviewAndSend: (client: Client, contract: ContractData) => void
  onEdit: () => void
  onSend: (client: Client, contract: ContractData) => void
}) {
  const { clients } = useApp()
  const client = clients.find((c) => c.id === user.clientId)
  const leaseAction =
    user.leaseAction ??
    (contract?.leaseGenerationStatus === 'generating'
      ? 'generating'
      : user.hasLeaseAgreement
        ? 'send'
        : 'draft')
  const isGenerating =
    leaseAction === 'generating' || contract?.leaseGenerationStatus === 'generating'
  // Lease Sent only when the contract was explicitly delivered (sentAt) — never for drafts.
  const leaseSent =
    Boolean(contract?.sentAt) &&
    !isGenerating &&
    (user.contractStatus === 'Sent' ||
      user.timelineStageId === 'contract_sent' ||
      user.timelineStageLabel === 'Lease Sent' ||
      user.timelineStageLabel === 'Lease Resent' ||
      Boolean(contract?.resentAt))
  const leaseResent = leaseSent && Boolean(contract?.resentAt)
  // Drafted = accepted lease not yet sent (including while the template finishes generating).
  const leaseDrafted =
    !leaseSent &&
    (isGenerating ||
      user.timelineStageLabel === 'Lease Drafted' ||
      user.timelineStageLabel === 'Lease Ready' ||
      user.timelineStageLabel === 'Generating Lease Agreement' ||
      contract?.leaseGenerationStatus === 'ready' ||
      contract?.leaseGenerationStatus === 'generating' ||
      leaseAction === 'send' ||
      user.contractStatus === 'Draft in Progress' ||
      user.contractStatus === 'Generated')
  const leaseReady =
    leaseDrafted &&
    !isGenerating &&
    Boolean(contract) &&
    contract?.leaseGenerationStatus !== 'generating'
  const leaseStatusLabel = leaseResent
    ? 'Lease Resent'
    : leaseSent
      ? 'Lease Sent'
      : leaseDrafted
        ? 'Lease Drafted'
        : user.timelineStageLabel
  const showLeaseActions = Boolean(client && contract && (leaseReady || leaseSent))
  const leaseStatusDate = leaseResent
    ? contract?.resentAt
    : leaseSent
      ? contract?.sentAt
      : undefined
  const leaseStatusDateLabel = leaseResent
    ? leaseStatusDate
      ? `Resent on ${formatDate(leaseStatusDate)}`
      : null
    : leaseStatusDate
      ? `Sent ${formatDate(leaseStatusDate)}`
      : null
  const showReviewSendHint = leaseDrafted && !leaseSent
  const reviewSendReady = Boolean(client && contract && leaseReady)

  const openReviewAndSend = () => {
    if (client && contract) onReviewAndSend(client, contract)
  }

  const reviewSendControl = showReviewSendHint ? (
    <button
      type="button"
      className={cn(
        'mt-1 text-[11px] font-medium text-[color:var(--deposit-fg)]',
        reviewSendReady ? 'hover:underline' : 'cursor-default opacity-80'
      )}
      disabled={!reviewSendReady}
      title={
        reviewSendReady
          ? 'Open the draft to review, then send to the tenant'
          : 'Lease draft is preparing — Review & Send will unlock shortly'
      }
      onClick={openReviewAndSend}
    >
      Review &amp; Send Lease
    </button>
  ) : null

  return (
    <tr
      className={cn(highlighted && 'pending-tenant-row--demo-highlight')}
    >
      <td className="px-3 py-4 sm:px-4">
        <p className="min-w-0 truncate font-semibold text-ink">{user.name}</p>
        <OccupancyPreferenceTag
          className="mt-1"
          mode={user.preferredOccupancyMode}
          arrangement={user.occupancyArrangement}
        />
        <p className="text-xs text-ink-muted">{user.email}</p>
        <p className="mt-0.5 text-xs text-ink-muted sm:hidden">
          {user.propertyAddress || user.projectName}
        </p>
        <div className="mt-1 md:hidden">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-semibold',
              leaseSent
                ? 'border-brand/25 bg-brand/5 text-brand'
                : leaseDrafted
                  ? 'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]'
                  : 'border-line bg-surface text-ink'
            )}
          >
            {leaseSent && (
              <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            )}
            {leaseStatusLabel}
          </span>
          {isGenerating ? (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Preparing draft…
            </p>
          ) : null}
          {reviewSendControl}
        </div>
        <p className="mt-0.5 text-xs text-ink-faint">
          Added {formatDate(user.acceptedAt)}
        </p>
      </td>
      <td className="hidden px-3 py-4 sm:table-cell sm:px-4">
        <p className="font-medium text-ink">
          {user.propertyAddress || user.projectName}
        </p>
        <p className="text-xs text-ink-muted">{user.clientName}</p>
      </td>
      <td className="hidden px-3 py-4 md:table-cell md:px-4">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-semibold',
            leaseSent
              ? 'border-brand/25 bg-brand/5 text-brand'
              : leaseDrafted
                ? 'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]'
                : 'border-line bg-surface text-ink'
          )}
          title={leaseStatusDateLabel ?? undefined}
        >
          {leaseSent && (
            <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          )}
          {leaseStatusLabel}
        </span>
        {leaseStatusDateLabel ? (
          <p className="mt-1 text-[11px] text-ink-faint">{leaseStatusDateLabel}</p>
        ) : isGenerating ? (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Preparing draft…
          </p>
        ) : null}
        {reviewSendControl}
      </td>
      <td className="px-3 py-4 align-middle sm:px-4">
        {showLeaseActions ? (
          <div className="flex flex-col items-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-[5.25rem] shrink-0 gap-1 px-2 py-0"
              onClick={() => {
                if (client && contract) onView(client, contract)
              }}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-[5.25rem] shrink-0 gap-1 px-2 py-0"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 shrink-0" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="h-7 w-[5.25rem] shrink-0 gap-1 px-2 py-0"
              disabled={!client || !contract}
              onClick={() => {
                if (client && contract) {
                  if (leaseSent) onSend(client, contract)
                  else onReviewAndSend(client, contract)
                }
              }}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              {leaseSent ? 'Resend' : 'Send'}
            </Button>
          </div>
        ) : leaseDrafted && !leaseSent ? (
          <Button
            size="sm"
            variant="primary"
            className="ml-auto h-7 shrink-0 gap-1 px-2.5 py-0"
            disabled={!reviewSendReady}
            title={
              reviewSendReady
                ? 'Review the draft, then send to the tenant'
                : 'Lease draft is preparing'
            }
            onClick={openReviewAndSend}
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-3.5 w-3.5 shrink-0" />
            )}
            Review &amp; Send
          </Button>
        ) : (
          <span className="sr-only">No lease actions</span>
        )}
      </td>
    </tr>
  )
}
