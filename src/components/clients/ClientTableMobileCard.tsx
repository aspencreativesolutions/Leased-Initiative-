import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Play, Loader2, UserMinus } from 'lucide-react'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { CompactClientTimeline } from '@/components/clients/CompactClientTimeline'
import { ClientStatusIcon } from './ClientStatusIcon'
import { getClientServiceTier } from '@/lib/clientUtils'
import { cn } from '@/lib/utils'
import { tableActiveBoxClass, tableControlBoxClass, tableRemoveButtonClass, tableViewLinkClass } from '@/components/clients/tableControlStyles'
import type { Client, ContractData } from '@/types'

interface ClientTableMobileCardProps {
  client: Client
  contract?: ContractData
  canStart: boolean
  started: boolean
  starting: boolean
  onStartProject: () => void
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
  canStart,
  started,
  starting,
  onStartProject,
  onRemove,
}: ClientTableMobileCardProps) {
  const serviceTier = getClientServiceTier(client, contract)

  return (
    <article className="border-b border-line px-2.5 py-2.5 last:border-b-0 sm:px-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              to={`/clients/${client.id}`}
              className="min-w-0 truncate text-sm font-semibold text-ink hover:text-brand hover:underline"
              title={client.isSampleClient ? 'THIS IS A MOCK USER.' : undefined}
            >
              {client.name}
            </Link>
            <ClientStatusIcon isOfficialClient={client.isOfficialClient} />
          </div>
          <p className="truncate text-[11px] leading-snug text-ink-muted">{client.businessName}</p>
          <p className="truncate text-[11px] leading-snug text-ink-faint">{client.email}</p>

          <MobileField label="Project">
            <div className="flex min-w-0 items-center gap-1.5">
              <Link
                to={`/clients/${client.id}#project-files`}
                className="min-w-0 truncate text-xs font-bold text-ink hover:text-brand hover:underline"
                title={`Open files for ${client.projectName}`}
              >
                {client.projectName || '—'}
              </Link>
              <ServiceTierBadge tier={serviceTier} tiny className="shrink-0" />
            </div>
          </MobileField>

          <CompactClientTimeline client={client} contract={contract} />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {started ? (
            <span className={tableActiveBoxClass}>
              Active
            </span>
          ) : (
            <button
              type="button"
              className={cn(
                tableControlBoxClass,
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                canStart && !starting
                  ? 'border-brand bg-brand text-surface-paper hover:border-brand-light hover:bg-brand-light'
                  : 'cursor-not-allowed border-brand/30 bg-brand/35 text-surface-paper/90'
              )}
              disabled={!canStart || starting}
              title={
                canStart
                  ? "Start this client's project"
                  : 'Requires signed contract and PayPal link clicked'
              }
              onClick={onStartProject}
            >
              {starting ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              ) : (
                <Play className="h-3 w-3 shrink-0" strokeWidth={2.5} />
              )}
              Start
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <Link
              to={`/clients/${client.id}`}
              className={tableViewLinkClass}
              title={`View ${client.name}`}
            >
              View
              <span aria-hidden="true">&gt;</span>
            </Link>
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
        </div>
      </div>
    </article>
  )
}
