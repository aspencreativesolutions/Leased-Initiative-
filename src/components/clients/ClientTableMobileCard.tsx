import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { UserMinus, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CompactClientTimeline } from '@/components/clients/CompactClientTimeline'
import { ClientStatusIcon } from './ClientStatusIcon'
import { TenantMarkerBadge } from './TenantMarkerBadge'
import { clientNameMarkersClass } from './clientBadgeStyles'
import {
  getDisplayContractStatus,
  getFirstName,
  getLeaseStatusLabel,
  getTenantAddress,
} from '@/lib/clientUtils'
import { cn } from '@/lib/utils'
import { tableRemoveButtonClass, tableViewLinkSubtleClass } from '@/components/clients/tableControlStyles'
import type { Client, ContractData } from '@/types'

interface ClientTableMobileCardProps {
  client: Client
  contract?: ContractData
  highlighted?: boolean
  dimmed?: boolean
  onRemove: () => void
}

function MobileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="label-caps mb-0.5 text-[8px] leading-none tracking-[0.1em] text-ink-faint">
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ClientTableMobileCard({
  client,
  contract,
  highlighted = false,
  dimmed = false,
  onRemove,
}: ClientTableMobileCardProps) {
  const address = getTenantAddress(client, contract)
  const leaseStatus = getLeaseStatusLabel(client, contract)

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
            <div className={clientNameMarkersClass}>
              <Link
                to={`/studio/clients/${client.id}`}
                className="min-w-0 truncate text-sm font-semibold text-ink hover:text-brand hover:underline"
                title={
                  client.isSampleClient
                    ? 'THIS IS A MOCK USER.'
                    : client.name !== getFirstName(client.name)
                      ? client.name
                      : undefined
                }
              >
                {getFirstName(client.name)}
              </Link>
              <TenantMarkerBadge />
              <ClientStatusIcon isOfficialClient={client.isOfficialClient} />
            </div>
            <p className="truncate pl-2 text-[11px] leading-snug text-ink-muted">{client.businessName}</p>
            <p className="truncate pl-2 text-[11px] leading-snug text-ink-faint">{client.email}</p>
          </div>

          <MobileField label="Property Type">
            <span className="text-xs text-ink-muted">{client.projectType}</span>
          </MobileField>

          <MobileField label="Address">
            <Link
              to={`/studio/clients/${client.id}`}
              className="line-clamp-2 min-w-0 break-words text-xs font-bold leading-snug text-ink hover:text-brand hover:underline"
              title={`View tenant at ${address}`}
            >
              {address}
            </Link>
          </MobileField>

          <MobileField label="Lease Status">
            <span className="text-xs font-medium text-ink">{leaseStatus}</span>
          </MobileField>

          <div className="flex flex-wrap gap-2">
            <MobileField label="Lease Progress">
              <StatusBadge type="contract" status={getDisplayContractStatus(client, contract)} />
            </MobileField>
            <MobileField label="Payment Status">
              <StatusBadge type="payment" status={client.paymentStatus} />
            </MobileField>
          </div>

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
