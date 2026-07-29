import { UserMinus, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { OccupancyPreferenceTag, clientOccupancyTagProps } from './OccupancyPreferenceTag'
import { OfficialTenantContactLinks } from './OfficialTenantContactLinks'
import { PaymentStatusDateTags } from './PaymentStatusDateTags'
import { TenantLeaseStateIcon } from './TenantLeaseStateIcon'
import { getLeaseStatusDetails, getTenantAddress, isAwaitingDeposit } from '@/lib/clientUtils'
import {
  getOfficialTenantLocationDisplayValue,
  getTenantAssignedProperty,
  LOCATION_DISPLAY_MISSING,
} from '@/lib/officialTenantLocationDisplay'
import { cn } from '@/lib/utils'
import { tableRemoveButtonClass, tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import type { Client, ContractData, Property } from '@/types'

interface ClientTableMobileCardProps {
  client: Client
  contract?: ContractData
  properties: Property[]
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

/** Gallery tiles: given name on line 1, last name on line 2. */
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
  properties,
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
  const { given, family } = galleryNameLines(client.name)

  return (
    <article
      className={cn(
        'official-tenant-tile flex h-full min-w-0 flex-col rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper',
        'transition-[background-color,opacity,box-shadow]',
        highlighted && 'bg-brand/10 ring-1 ring-inset ring-brand/40',
        dimmed && 'opacity-40'
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenTenantDetails(client.id)}
            className="inline-flex max-w-full min-w-0 items-start gap-1.5 text-left text-base font-semibold leading-snug text-ink hover:text-brand hover:underline"
            title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
          >
            <TenantLeaseStateIcon details={leaseStatus} className="mt-[0.2em]" />
            <span className="min-w-0">
              <span className="block break-words">{given}</span>
              {family ? <span className="block break-words">{family}</span> : null}
            </span>
          </button>
          <OfficialTenantContactLinks client={client} compact />
          {showOccupancyStatus ? (
            <div className="mt-1 empty:hidden">
              <OccupancyPreferenceTag
                {...clientOccupancyTagProps(
                  client,
                  getTenantAssignedProperty(client, contract, properties)
                )}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={tableRemoveButtonClass}
          onClick={onRemove}
          title={`Remove ${client.name}`}
          aria-label={`Remove ${client.name}`}
        >
          <UserMinus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
        </button>
      </div>

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
        {addressValue}
      </button>

      {/* mt-auto pins payment tags + View to the tile bottom so neighbors align in a row */}
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
          <button
            type="button"
            onClick={() => onOpenTenantDetails(client.id)}
            className={tableViewLinkSubtleClass}
            title={`View ${client.name}`}
          >
            View
            <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}
