import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronsUpDown, UserMinus, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CompactClientTimeline } from '@/components/clients/CompactClientTimeline'
import { LeaseStatusBadge } from './LeaseStatusBadge'
import { TenantNameWithLeaseIcons } from './TenantLeaseStatusIcons'
import { getLeaseStatusDetails } from '@/lib/clientUtils'
import {
  getOfficialTenantLocationDisplayValue,
  getTenantAssignedProperty,
  OFFICIAL_TENANT_LOCATION_DISPLAY_LABELS,
  type OfficialTenantLocationDisplayMode,
} from '@/lib/officialTenantLocationDisplay'
import { cn, formatDate } from '@/lib/utils'
import { tableRemoveButtonClass, tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import type { Client, ContractData, Property } from '@/types'

interface ClientTableMobileCardProps {
  client: Client
  contract?: ContractData
  properties: Property[]
  locationDisplayMode: OfficialTenantLocationDisplayMode
  onCycleLocationDisplay: () => void
  highlighted?: boolean
  dimmed?: boolean
  onRemove: () => void
}

function MobileField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="label-caps mb-0.5 min-w-0 text-[8px] leading-none tracking-[0.1em] text-ink-faint">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ClientTableMobileCard({
  client,
  contract,
  properties,
  locationDisplayMode,
  onCycleLocationDisplay,
  highlighted = false,
  dimmed = false,
  onRemove,
}: ClientTableMobileCardProps) {
  const property = getTenantAssignedProperty(client, contract, properties)
  const locationValue = getOfficialTenantLocationDisplayValue(property, locationDisplayMode)
  const locationLabel = OFFICIAL_TENANT_LOCATION_DISPLAY_LABELS[locationDisplayMode]
  const leaseStatus = getLeaseStatusDetails(client, contract)

  return (
    <article
      className={cn(
        'border-b border-line px-2.5 py-2.5 last:border-b-0 sm:px-3',
        'transition-[background-color,opacity,box-shadow]',
        highlighted && 'bg-brand/10 ring-1 ring-inset ring-brand/40',
        dimmed && 'opacity-40'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div>
            <TenantNameWithLeaseIcons client={client} contract={contract}>
              <Link
                to={`/studio/clients/${client.id}`}
                className="min-w-0 truncate text-sm font-semibold text-ink hover:text-brand hover:underline"
                title={client.isSampleClient ? 'THIS IS A MOCK USER.' : client.name}
              >
                {client.name}
              </Link>
            </TenantNameWithLeaseIcons>
            <p className="truncate pl-2 text-[11px] leading-snug text-ink-muted">
              Official since {formatDate(client.officialClientSince || client.createdAt)}
            </p>
            <p className="truncate pl-2 text-[11px] leading-snug text-ink-faint">{client.email}</p>
          </div>

          <MobileField
            label={
              <button
                type="button"
                title="Click to change location detail"
                aria-label={`${locationLabel}. Click to change location detail`}
                onClick={onCycleLocationDisplay}
                className={cn(
                  'group inline-flex max-w-full items-center gap-1 rounded-sm px-0.5 py-0.5 -mx-0.5',
                  'cursor-pointer text-left transition-colors duration-150',
                  'hover:bg-ink/[0.06]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-paper'
                )}
              >
                <span key={locationDisplayMode} className="location-display-fade min-w-0 truncate">
                  {locationLabel}
                </span>
                <ChevronsUpDown
                  className="h-2.5 w-2.5 shrink-0 text-ink-faint transition-transform duration-200 group-hover:text-ink-muted group-hover:rotate-180"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            }
          >
            <Link
              to={`/studio/clients/${client.id}`}
              className="line-clamp-2 min-w-0 break-words text-xs font-bold leading-snug text-ink hover:text-brand hover:underline"
              title={`View tenant at ${locationValue}`}
            >
              <span key={locationDisplayMode} className="location-display-fade inline">
                {locationValue}
              </span>
            </Link>
          </MobileField>

          <MobileField label="Lease Status">
            <div className="space-y-0.5">
              <LeaseStatusBadge details={leaseStatus} />
              {leaseStatus.endDate ? (
                <span className="block text-[11px] text-ink-muted">
                  Ends {formatDate(leaseStatus.endDate)}
                </span>
              ) : null}
            </div>
          </MobileField>

          <MobileField label="Payment Status">
            <StatusBadge type="payment" status={client.paymentStatus} />
          </MobileField>

          <CompactClientTimeline client={client} contract={contract} />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <button
            type="button"
            className={tableRemoveButtonClass}
            onClick={onRemove}
            title={`Remove ${client.name}`}
            aria-label={`Remove ${client.name}`}
          >
            <UserMinus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          </button>
          <Link
            to={`/studio/clients/${client.id}`}
            className={tableViewLinkSubtleClass}
            title={`View ${client.name}`}
          >
            View
            <ArrowRight className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}
