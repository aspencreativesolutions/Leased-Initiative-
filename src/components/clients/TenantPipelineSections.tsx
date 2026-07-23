import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  FileSignature,
  LayoutGrid,
  LayoutList,
  Loader2,
  Pencil,
  Send,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { GeneratingLeaseIndicator } from '@/components/clients/GeneratingLeaseIndicator'
import { PendingClientBadge } from '@/components/clients/PendingClientBadge'
import { RentalAvailabilityBadge } from '@/components/clients/RentalAvailabilityBadge'
import { TenantMarkerBadge } from '@/components/clients/TenantMarkerBadge'
import {
  clientNameMarkersClass,
} from '@/components/clients/clientBadgeStyles'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { SendContractModal } from '@/components/contracts/SendContractModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
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
import { cn, formatDate } from '@/lib/utils'
import type { Client, ContractData, PendingRegistration, PortalUserAccepted, PortalUsersOverview } from '@/types'

const WAITING_CONNECT_VIEW_KEY = 'leased-waiting-connect-view'
type WaitingConnectView = 'list' | 'gallery'

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
  const { clients, getContractForClient, properties, refresh, settings } = useApp()
  const [overview, setOverview] = useState<PortalUsersOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [waitingView, setWaitingView] = useState<WaitingConnectView>(readWaitingConnectView)
  const [resendTarget, setResendTarget] = useState<{
    client: Client
    contract: ContractData
  } | null>(null)
  const [previewTarget, setPreviewTarget] = useState<{
    client: Client
    contract: ContractData
  } | null>(null)

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

  const hasGeneratingLease = (overview?.accepted ?? []).some(
    (user) => user.leaseAction === 'generating'
  )

  // Poll while any lease is generating so status flips to Lease Ready automatically.
  useEffect(() => {
    if (!hasGeneratingLease) return
    const id = window.setInterval(() => {
      void refreshOverview()
    }, 800)
    return () => window.clearInterval(id)
  }, [hasGeneratingLease, refreshOverview])

  const handleAccept = async (registration: PendingRegistration) => {
    setAcceptingId(registration.id)
    setError('')
    try {
      await acceptRegistration(registration.id)
      await refreshOverview()
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
      await refreshOverview()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not dismiss registration')
    } finally {
      setDismissingId(null)
    }
  }

  const pending = overview?.pending ?? []
  // Accepted tenants who have not signed yet (draft or lease sent). Signed → Official Tenants.
  const prospectiveApplicants = (overview?.accepted ?? []).filter(
    (user) =>
      !user.isOfficialClient &&
      user.contractStatus !== 'Signed' &&
      user.contractStatus !== 'Completed'
  )

  const waitingSection = showWaitingToConnect ? (
    <section
      data-onboarding="tenants-waiting-connect"
      className="min-w-0 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface/40 p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserPlus className="h-4 w-4 shrink-0 text-ink-muted" />
          <h2 className="heading-display text-lg">Waiting to Connect</h2>
          {!loading && pending.length > 0 && (
            <span className="waiting-connect-count--attention rounded-full bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent">
              {pending.length}
            </span>
          )}
        </div>
        <div
          role="group"
          aria-label="Waiting to Connect display"
          className="inline-flex shrink-0 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper p-0.5"
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
      </div>
      <p className="mb-3 text-sm text-ink-muted">
        Portal sign-ups awaiting your approval. Accept to move them into Pending Tenants, where you
        can draft or send a lease. They stay out of Official Tenants until a lease is signed.
      </p>

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
            description="When someone registers or uses your invite link, they appear here until you accept or dismiss them."
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
                />
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-1">
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
      data-onboarding={pendingSectionId}
      className="min-w-0 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-line bg-surface/40 p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <FileSignature className="h-4 w-4 shrink-0 text-ink-muted" />
        <h2 className="heading-display text-lg">{pendingSectionTitle}</h2>
        {!loading && prospectiveApplicants.length > 0 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
            {prospectiveApplicants.length}
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-ink-muted">
        Approved tenants awaiting a signed lease. When you accept someone from Waiting to Connect,
        their lease agreement generates automatically. Review, edit, and send it — once signed,
        they move to Official Tenants.
      </p>

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
            description="After you accept someone from Waiting to Connect, they appear here until their lease is signed."
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
                  onView={(client, contract) => setPreviewTarget({ client, contract })}
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
          {waitingSection}
          {pendingSection}
        </div>
      ) : (
        pendingSection
      )}

      {resendTarget && (
        <SendContractModal
          open
          onClose={() => setResendTarget(null)}
          client={resendTarget.client}
          contract={resendTarget.contract}
          onSent={() => {
            setResendTarget(null)
            void refresh()
            void refreshOverview()
          }}
        />
      )}

      {previewTarget && (
        <Modal
          open
          onClose={() => setPreviewTarget(null)}
          title="Lease Agreement Preview"
          size="xl"
        >
          <ContractReviewView
            contract={previewTarget.contract}
            designerName={settings.ownerName}
            businessName={settings.businessName}
          />
        </Modal>
      )}
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
  onAccept: (registration: PendingRegistration) => void
  onDismiss: (registration: PendingRegistration) => void
}

function waitingConnectApplicantMeta(props: WaitingConnectItemProps) {
  const { registration, clients, properties, getContractForClient } = props
  const desiredAddress = registration.preferredPropertyAddress?.trim() || ''
  const matchedProperty = findPropertyByAddress(properties, desiredAddress)
  const availableUnits = matchedProperty
    ? availableUnitsForApplicant(matchedProperty, clients, getContractForClient)
    : null
  const displayAddress = matchedProperty?.address || desiredAddress || '—'
  const busy =
    props.acceptingId === registration.id || props.dismissingId === registration.id

  return { desiredAddress, availableUnits, displayAddress, busy }
}

function WaitingConnectActions({
  registration,
  acceptingId,
  dismissingId,
  busy,
  onAccept,
  onDismiss,
  compact = false,
}: {
  registration: PendingRegistration
  acceptingId: string | null
  dismissingId: string | null
  busy: boolean
  onAccept: (registration: PendingRegistration) => void
  onDismiss: (registration: PendingRegistration) => void
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-2 gap-2',
        compact
          ? 'ml-auto w-full max-w-[13.5rem] sm:w-[13.5rem]'
          : 'w-[min(13.5rem,46%)] sm:w-[13.5rem]'
      )}
    >
      <Button
        size="sm"
        className="h-8 w-full px-2"
        disabled={busy}
        onClick={() => onAccept(registration)}
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
  const { registration, acceptingId, dismissingId, onAccept, onDismiss } = props
  const { desiredAddress, availableUnits, displayAddress, busy } =
    waitingConnectApplicantMeta(props)

  return (
    <li className="waiting-connect-tile relative rounded-[var(--radius-lg)] border-[length:var(--border-width)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1 pr-1">
          <div className={clientNameMarkersClass}>
            <p className="min-w-0 truncate font-semibold text-ink">{registration.name}</p>
            <TenantMarkerBadge />
            <PendingClientBadge />
          </div>
          <p className="truncate text-sm text-ink-muted">{registration.email}</p>
        </div>
        <WaitingConnectActions
          registration={registration}
          acceptingId={acceptingId}
          dismissingId={dismissingId}
          busy={busy}
          onAccept={onAccept}
          onDismiss={onDismiss}
        />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Desired Address
        </p>
        <p className="text-sm font-medium text-ink">{displayAddress}</p>
        {desiredAddress ? (
          <div className="pt-1">
            <RentalAvailabilityBadge availableUnits={availableUnits} />
          </div>
        ) : null}
        {registration.preferredLandlordCompany && (
          <p className="pt-1 text-xs text-ink-muted">
            Landlord: {registration.preferredLandlordCompany}
          </p>
        )}
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
    </li>
  )
}

function WaitingConnectListRow(props: WaitingConnectItemProps) {
  const { registration, acceptingId, dismissingId, onAccept, onDismiss } = props
  const { desiredAddress, availableUnits, displayAddress, busy } =
    waitingConnectApplicantMeta(props)

  return (
    <li className="waiting-connect-row rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-2.5 sm:px-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="min-w-0 truncate font-semibold text-ink">{registration.name}</p>
            <p className="min-w-0 truncate text-sm text-ink-muted">{registration.email}</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate text-sm font-medium text-ink" title={displayAddress}>
              {displayAddress}
            </p>
            {desiredAddress ? (
              <RentalAvailabilityBadge availableUnits={availableUnits} />
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
  onView,
  onEdit,
  onSend,
}: {
  user: PortalUserAccepted
  contract: ContractData | undefined
  onView: (client: Client, contract: ContractData) => void
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
  const isGenerating = leaseAction === 'generating'
  const leaseSent =
    Boolean(contract) &&
    !isGenerating &&
    (user.contractStatus === 'Sent' ||
      user.timelineStageId === 'contract_sent' ||
      user.timelineStageLabel === 'Lease Sent' ||
      Boolean(contract?.sentAt))
  const leaseReady =
    !isGenerating &&
    !leaseSent &&
    (user.timelineStageLabel === 'Lease Ready' ||
      contract?.leaseGenerationStatus === 'ready' ||
      leaseAction === 'send')
  const leaseStatusLabel = isGenerating
    ? 'Generating Lease Agreement'
    : leaseSent
      ? 'Lease Sent'
      : leaseReady
        ? 'Lease Ready'
        : user.timelineStageLabel
  const showLeaseActions = Boolean(client && contract && (leaseReady || leaseSent))

  return (
    <tr>
      <td className="px-3 py-4 sm:px-4">
        <p className="min-w-0 truncate font-semibold text-ink">{user.name}</p>
        <p className="text-xs text-ink-muted">{user.email}</p>
        <p className="mt-0.5 text-xs text-ink-muted sm:hidden">
          {user.propertyAddress || user.projectName}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint md:hidden">
          {isGenerating ? (
            <GeneratingLeaseIndicator />
          ) : (
            leaseStatusLabel
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          Accepted {formatDate(user.acceptedAt)}
        </p>
      </td>
      <td className="hidden px-3 py-4 sm:table-cell sm:px-4">
        <p className="font-medium text-ink">
          {user.propertyAddress || user.projectName}
        </p>
        <p className="text-xs text-ink-muted">{user.clientName}</p>
      </td>
      <td className="hidden px-3 py-4 md:table-cell md:px-4">
        {isGenerating ? (
          <GeneratingLeaseIndicator />
        ) : (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-semibold',
              leaseSent
                ? 'border-brand/25 bg-brand/5 text-brand'
                : leaseReady
                  ? 'border-[color:var(--deposit-border)] bg-[color:var(--deposit-bg)] text-[color:var(--deposit-fg)]'
                  : 'border-line bg-surface text-ink'
            )}
            title={leaseSent && contract?.sentAt ? `Sent ${formatDate(contract.sentAt)}` : undefined}
          >
            {leaseSent && (
              <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            )}
            {leaseStatusLabel}
          </span>
        )}
        {leaseSent && contract?.sentAt ? (
          <p className="mt-1 text-[11px] text-ink-faint">
            Sent {formatDate(contract.sentAt)}
          </p>
        ) : null}
      </td>
      <td className="px-3 py-4 sm:px-4">
        {showLeaseActions ? (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="min-w-[4.75rem]"
              onClick={() => {
                if (client && contract) onView(client, contract)
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
            <Button size="sm" variant="outline" className="min-w-[4.75rem]" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="min-w-[4.75rem]"
              disabled={!client || !contract}
              onClick={() => {
                if (client && contract) onSend(client, contract)
              }}
            >
              <Send className="h-3.5 w-3.5" />
              {leaseSent ? 'Resend' : 'Send'}
            </Button>
          </div>
        ) : (
          <span className="sr-only">
            {isGenerating ? 'Lease actions unavailable while generating' : 'No lease actions'}
          </span>
        )}
      </td>
    </tr>
  )
}
