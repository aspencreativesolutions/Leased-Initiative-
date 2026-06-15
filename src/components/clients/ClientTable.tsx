import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Loader2, UserMinus } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { ClientStatusIcon } from './ClientStatusIcon'
import { ClientTableMobileCard } from './ClientTableMobileCard'
import { RemoveClientModal } from './RemoveClientModal'
import { useApp } from '@/context/AppContext'
import {
  canStartProject,
  getClientServiceTier,
  getDashboardProjectStatusLabel,
  getDisplayContractStatus,
  isProjectActive,
} from '@/lib/clientUtils'
import { startClientProject } from '@/lib/projectApi'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { tableActiveBoxClass, tableControlBoxClass, tableRemoveButtonClass, tableViewLinkClass } from '@/components/clients/tableControlStyles'
import type { Client } from '@/types'

interface ClientTableProps {
  clients: Client[]
}

export function ClientTable({ clients }: ClientTableProps) {
  const { getContractForClient, refresh } = useApp()
  const [startingId, setStartingId] = useState<string | null>(null)
  const [startError, setStartError] = useState('')
  const [removeTarget, setRemoveTarget] = useState<Client | null>(null)

  const handleStartProject = async (client: Client) => {
    setStartingId(client.id)
    setStartError('')
    try {
      await startClientProject(client.id)
      await refresh()
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : 'Could not start project')
    } finally {
      setStartingId(null)
    }
  }

  if (clients.length === 0) {
    return null
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)]">
      {startError && (
        <p className="mb-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {startError}
        </p>
      )}

      <div className="md:hidden min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper">
        {clients.map((client) => (
          <ClientTableMobileCard
            key={client.id}
            client={client}
            contract={getContractForClient(client.id)}
            canStart={canStartProject(client)}
            started={isProjectActive(client)}
            starting={startingId === client.id}
            onStartProject={() => handleStartProject(client)}
            onRemove={() => setRemoveTarget(client)}
          />
        ))}
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper md:block">
        <div className="table-scroll-shell">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[16%]">Client</th>
              <th className="label-caps px-3 py-2.5 text-left hidden md:table-cell sm:px-4 w-[12%]">
                Email
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 min-w-[7rem]">Project</th>
              <th className="label-caps w-[9.5rem] px-3 py-2.5 text-center sm:px-4">Project Status</th>
              <th className="label-caps hidden w-[5.75rem] px-3 py-2.5 text-center sm:table-cell sm:px-4">
                Contract
              </th>
              <th className="label-caps w-[6.25rem] px-3 py-2.5 text-center sm:px-4">Payment</th>
              <th className="label-caps w-[4.25rem] px-3 py-2.5 text-center sm:px-4">
                Start Project
              </th>
              <th className="label-caps w-[3.5rem] px-3 py-2.5 text-right sm:px-4">
                <span className="sr-only">View</span>
              </th>
              <th className="label-caps w-8 px-3 py-2.5 text-right sm:px-4">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => {
              const canStart = canStartProject(client)
              const started = isProjectActive(client)
              const contract = getContractForClient(client.id)
              const serviceTier = getClientServiceTier(client, contract)

              return (
                <tr key={client.id} className="hover:bg-surface transition-colors">
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Link
                          to={`/clients/${client.id}`}
                          className="min-w-0 truncate font-semibold text-ink hover:text-brand hover:underline"
                          title={client.isSampleClient ? 'THIS IS A MOCK USER.' : undefined}
                        >
                          {client.name}
                        </Link>
                        <ClientStatusIcon isOfficialClient={client.isOfficialClient} />
                      </div>
                      <p className="truncate text-xs text-ink-muted">{client.businessName}</p>
                      <p className="truncate text-xs text-ink-faint md:hidden">{client.email}</p>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-2.5 align-top truncate max-w-[10rem] text-ink-muted sm:px-4">
                    {client.email}
                  </td>
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Link
                        to={`/clients/${client.id}#project-files`}
                        className="min-w-0 break-words font-bold leading-snug text-ink hover:text-brand hover:underline"
                        title={`Open files for ${client.projectName}`}
                      >
                        {client.projectName || '—'}
                      </Link>
                      <ServiceTierBadge tier={serviceTier} tiny className="shrink-0" />
                    </div>
                  </td>
                  <td className="w-[9.5rem] px-3 py-2.5 text-center align-top sm:px-4">
                    <StatusBadge
                      type="project"
                      status={client.projectStatus}
                      label={getDashboardProjectStatusLabel(client.projectStatus)}
                      tabular
                    />
                  </td>
                  <td className="hidden w-[5.75rem] px-3 py-2.5 text-center align-top sm:table-cell sm:px-4">
                    <StatusBadge
                      type="contract"
                      status={getDisplayContractStatus(client, contract)}
                      tabular
                    />
                  </td>
                  <td className="w-[6.25rem] px-3 py-2.5 text-center align-top sm:px-4">
                    <StatusBadge type="payment" status={client.paymentStatus} tabular />
                  </td>
                  <td className="w-[4.25rem] px-3 py-2.5 text-center align-top sm:px-4">
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
                          canStart && startingId !== client.id
                            ? 'border-brand bg-brand text-surface-paper hover:border-brand-light hover:bg-brand-light'
                            : 'cursor-not-allowed border-brand/30 bg-brand/35 text-surface-paper/90'
                        )}
                        disabled={!canStart || startingId === client.id}
                        title={
                          canStart
                            ? 'Start this client\'s project'
                            : 'Requires signed contract and PayPal link clicked'
                        }
                        onClick={() => handleStartProject(client)}
                      >
                        {startingId === client.id ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                        )}
                        Start
                      </button>
                    )}
                  </td>
                  <td className="w-[3.5rem] px-3 py-2.5 align-top sm:px-4">
                    <div className="flex justify-end">
                      <Link
                        to={`/clients/${client.id}`}
                        className={tableViewLinkClass}
                        title={`View ${client.name}`}
                      >
                        View
                        <span aria-hidden="true">&gt;</span>
                      </Link>
                    </div>
                  </td>
                  <td className="w-8 px-3 py-2.5 align-top sm:px-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className={tableRemoveButtonClass}
                        onClick={() => setRemoveTarget(client)}
                        title={`Remove ${client.name}`}
                        aria-label={`Remove ${client.name}`}
                      >
                        <UserMinus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <RemoveClientModal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        clientId={removeTarget?.id ?? ''}
        clientName={removeTarget?.name ?? ''}
        hasLinkedAccount={Boolean(removeTarget?.accountUserId)}
        onRemoved={async () => {
          setRemoveTarget(null)
          await refresh()
        }}
      />
    </div>
  )
}
