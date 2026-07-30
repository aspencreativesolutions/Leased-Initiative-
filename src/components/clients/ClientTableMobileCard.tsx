import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { AddressText } from '@/components/ui/AddressText'
import { LeaseCompleteTag } from './LeaseCompleteTag'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { OccupancyStatusChip } from './OccupancyStatusChip'
import { clientOccupancyTagProps } from './OccupancyPreferenceTag'
import { ApplicantPartyTag } from './ApplicantPartyTag'
import { OfficialTenantContactLinks } from './OfficialTenantContactLinks'
import { PaymentStatusDateTags } from './PaymentStatusDateTags'
import { TenantLeaseStateIcon } from './TenantLeaseStateIcon'
import {
  getLeaseStatusDetails,
  getTenantAddress,
  isAwaitingDeposit,
  isLeaseCompleteTenant,
} from '@/lib/clientUtils'
import {
  getOfficialTenantLocationDisplayValue,
  getTenantAssignedProperty,
  LOCATION_DISPLAY_MISSING,
} from '@/lib/officialTenantLocationDisplay'
import { getOccupancyShareDetail } from '@/lib/occupancyStatusFilter'
import { officialTenantTileAnchorId } from '@/lib/officialTenantSpotlight'
import { cn } from '@/lib/utils'
import { tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import type { Client, ContractData, Property } from '@/types'

interface ClientTableMobileCardProps {
  client: Client
  contract?: ContractData
  clients: Client[]
  properties: Property[]
  getContract: (clientId: string) => ContractData | undefined
  highlighted?: boolean
  dimmed?: boolean
  showOccupancyStatus?: boolean
  onRemove: () => void
  onOpenTenantDetails: (tenantId: string) => void
  onConfirmPayment?: () => void
  confirmingPayment?: boolean
}

function getFullPropertyAddress(
  client: Client,
  contract: ContractData | undefined,
  properties: Property[]
): string {
  const property = getTenantAssignedProperty(client, contract, properties)
  const fromProperty = getOfficialTenantLocationDisplayValue(property, 'address')
  if (fromProperty !== LOCATION_DISPLAY_MISSING) return fromProperty
  const fallback = getTenantAddress(client, contract)
  return fallback === '—' ? LOCATION_DISPLAY_MISSING : fallback
}

/** Gallery tiles: given + family — side-by-side when the tile is wide enough. */
function galleryNameLines(fullName: string): { given: string; family: string | null } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { given: fullName, family: null }
  if (parts.length === 1) return { given: parts[0], family: null }
  return {
    given: parts.slice(0, -1).join(' '),
    family: parts[parts.length - 1],
  }
}

/** Compact Official Tenants tile for mobile 1- or 2-column grids. */
export function ClientTableMobileCard({
  client,
  contract,
  clients,
  properties,
  getContract,
  highlighted = false,
  dimmed = false,
  showOccupancyStatus = false,
  onRemove,
  onOpenTenantDetails,
  onConfirmPayment,
  confirmingPayment = false,
}: ClientTableMobileCardProps) {
  const addressValue = getFullPropertyAddress(client, contract, properties)
  const leaseStatus = getLeaseStatusDetails(client, contract)
  const awaitingDeposit = isAwaitingDeposit(client, contract)
  const leaseComplete = isLeaseCompleteTenant(client, contract)
  const { given, family } = galleryNameLines(client.name)
  const occupancyProps = clientOccupancyTagProps(
    client,
    getTenantAssignedProperty(client, contract, properties)
  )
  const shareDetail = getOccupancyShareDetail(
    client,
    clients,
    getContract,
    properties
  )

  return (
    <article
      id={officialTenantTileAnchorId(client.id)}
      className={cn(
        'official-tenant-tile relative flex h-full min-w-0 flex-col rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper',
        'transition-[background-color,opacity,box-shadow,transform]',
        highlighted && 'official-tenant-tile--spotlight bg-brand/10 ring-1 ring-inset ring-brand/40',
        dimmed && 'opacity-40',
        leaseComplete && 'border-ink/20'
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex max-w-full min-w-0 items-start gap-1.5">
            <TenantLeaseStateIcon details={leaseStatus} className="mt-[0.2em]" />
            <button
              type="button"
              onClick={() => onOpenTenantDetails(client.id)}
              className="min-w-0 text-left text-base font-semibold leading-snug text-ink hover:text-brand hover:underline"
              title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
            >
              <span className="official-tenant-name-lines min-w-0">
                <span className="official-tenant-name-given break-words">{given}</span>
                {family ? (
                  <span className="official-tenant-name-family break-words">{family}</span>
                ) : null}
              </span>
            </button>
          </div>
          <OfficialTenantContactLinks client={client} compact />
          {leaseComplete ? (
            <div className="mt-1.5">
              <LeaseCompleteTag clientId={client.id} />
            </div>
          ) : null}
        </div>
      </div>

      {showOccupancyStatus ? (
        <div className="mt-2 min-w-0">
          <p className="label-caps text-[8px] leading-none tracking-[0.1em] text-ink-faint">
            Arrangement
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap gap-1">
            <OccupancyStatusChip
              {...occupancyProps}
              shareDetail={shareDetail}
              onOccupantClick={onOpenTenantDetails}
            />
            <ApplicantPartyTag partyType={client.applicantPartyType} />
          </div>
        </div>
      ) : null}

      <div className="mt-2 min-w-0 overflow-visible">
        <LeaseStatusBadge
          details={leaseStatus}
          constrainToParent
          onConfirmPayment={
            awaitingDeposit && onConfirmPayment ? onConfirmPayment : undefined
          }
          confirmingPayment={confirmingPayment}
        />
      </div>

      <p className="label-caps mt-2 text-[8px] leading-none tracking-[0.1em] text-ink-faint">
        Address
      </p>
      <button
        type="button"
        onClick={() => onOpenTenantDetails(client.id)}
        className="official-tenant-address mt-0.5 min-w-0 w-full break-words text-left text-[11px] font-bold leading-snug text-ink hover:text-brand hover:underline"
        title={`View tenant at ${addressValue}`}
      >
        <AddressText address={addressValue} />
      </button>

      <div className="mt-auto flex min-w-0 flex-col gap-2 pt-2">
        <div className="min-w-0">
          <PaymentStatusDateTags
            client={client}
            contract={contract}
            className="mx-0"
            onConfirmPayment={
              awaitingDeposit && onConfirmPayment ? onConfirmPayment : undefined
            }
            confirmingPayment={confirmingPayment}
          />
        </div>

        <div className="flex flex-col items-end gap-1">
          {awaitingDeposit && onConfirmPayment ? (
            <button
              type="button"
              onClick={onConfirmPayment}
              disabled={confirmingPayment}
              className={cn(tableViewLinkSubtleClass, 'text-accent hover:text-accent')}
              title={`Confirm deposit payment complete for ${client.name}`}
              aria-label={`Confirm deposit payment complete for ${client.name}`}
            >
              {confirmingPayment ? (
                <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
              )}
              Confirm Payment Complete
            </button>
          ) : null}
          {leaseComplete ? (
            <button
              type="button"
              onClick={onRemove}
              className={cn(tableViewLinkSubtleClass, 'text-accent hover:text-accent')}
              title={`Remove ${client.name}`}
              aria-label={`Remove tenant ${client.name}`}
            >
              Remove Tenant
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenTenantDetails(client.id)}
            className={tableViewLinkSubtleClass}
            title={`View ${client.name}`}
          >
            View
            <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}
