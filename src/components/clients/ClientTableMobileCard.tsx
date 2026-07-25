import { ChevronsUpDown, UserMinus, ArrowRight } from 'lucide-react'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { PaymentStatusDateTags } from './PaymentStatusDateTags'
import { getLeaseStatusDetails, getTenantAddress } from '@/lib/clientUtils'
import {
  getOfficialTenantContactDisplayValue,
  OFFICIAL_TENANT_CONTACT_DISPLAY_LABELS,
  type OfficialTenantContactDisplayMode,
} from '@/lib/officialTenantContactDisplay'
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
  contactDisplayMode: OfficialTenantContactDisplayMode
  onCycleContactDisplay: () => void
  highlighted?: boolean
  dimmed?: boolean
  onRemove: () => void
  onOpenTenantDetails: (tenantId: string) => void
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

/** Compact Official Tenants tile for mobile 1- or 2-column grids. */
export function ClientTableMobileCard({
  client,
  contract,
  properties,
  contactDisplayMode,
  onCycleContactDisplay,
  highlighted = false,
  dimmed = false,
  onRemove,
  onOpenTenantDetails,
}: ClientTableMobileCardProps) {
  const addressValue = getFullPropertyAddress(client, contract, properties)
  const contactValue = getOfficialTenantContactDisplayValue(client, contactDisplayMode)
  const contactLabel = OFFICIAL_TENANT_CONTACT_DISPLAY_LABELS[contactDisplayMode]
  const leaseStatus = getLeaseStatusDetails(client, contract)

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
            className="min-w-0 max-w-full truncate text-left text-base font-semibold leading-snug text-ink hover:text-brand hover:underline"
            title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
          >
            {client.name}
          </button>
          <div className="mt-1">
            <LeaseStatusBadge details={leaseStatus} />
          </div>
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

      <button
        type="button"
        title="Click to switch between email and phone"
        aria-label={`${contactLabel}. Click to switch between email and phone`}
        onClick={onCycleContactDisplay}
        className={cn(
          'group mt-2 inline-flex max-w-full items-center gap-0.5 rounded-sm px-0.5 py-0.5 -mx-0.5',
          'cursor-pointer text-left transition-colors duration-150',
          'hover:bg-ink/[0.06]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-paper'
        )}
      >
        <span className="label-caps min-w-0 whitespace-nowrap text-[8px] leading-none tracking-[0.1em] text-ink-faint">
          {contactLabel}
        </span>
        <ChevronsUpDown
          className="h-2.5 w-2.5 shrink-0 text-ink-faint transition-transform duration-200 group-hover:text-ink-muted group-hover:rotate-180"
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      <button
        type="button"
        onClick={onCycleContactDisplay}
        title={`Click to switch to ${contactDisplayMode === 'email' ? 'phone' : 'email'}`}
        aria-label={`${contactValue}. Click to switch between email and phone`}
        className="mt-0.5 min-w-0 break-words text-left text-[11px] leading-snug text-ink-muted hover:text-ink"
      >
        <span key={contactDisplayMode} className="location-display-fade">
          {contactValue}
        </span>
      </button>

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

      <div className="mt-2 min-w-0">
        <PaymentStatusDateTags client={client} contract={contract} className="mx-0" />
      </div>

      <div className="mt-auto flex justify-end pt-2">
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
    </article>
  )
}
