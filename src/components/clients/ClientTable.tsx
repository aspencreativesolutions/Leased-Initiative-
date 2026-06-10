import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OfficialClientBadge } from './OfficialClientBadge'
import { PendingClientBadge } from './PendingClientBadge'
import { EditableServiceTierCell } from '@/components/clients/EditableServiceTierCell'
import { useApp } from '@/context/AppContext'
import { canStartProject, isProjectActive } from '@/lib/clientUtils'
import { startClientProject } from '@/lib/projectApi'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Client } from '@/types'

/** Shared fixed box for Start Project / Active — border included in size */
const projectActionBoxClass =
  'box-border inline-flex h-8 w-[8rem] shrink-0 items-center justify-center gap-1 rounded-sm border-2 px-2 text-[10px] font-black uppercase leading-none tracking-wide whitespace-nowrap'

interface ClientTableProps {
  clients: Client[]
  fullWidth?: boolean
}

export function ClientTable({ clients, fullWidth = false }: ClientTableProps) {
  const { getContractForClient, updateClientServiceTier, refresh } = useApp()
  const [startingId, setStartingId] = useState<string | null>(null)
  const [startError, setStartError] = useState('')

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

  const sampleCount = clients.filter((c) => c.isSampleClient).length

  return (
    <div className="w-full min-w-0">
      {startError && (
        <p className="mb-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
          {startError}
        </p>
      )}
      {sampleCount > 0 && (
        <p className="mb-3 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{sampleCount}</span> sample client
          {sampleCount !== 1 ? 's' : ''} — demo data you can replace anytime.
        </p>
      )}
      <div
        className={
          fullWidth
            ? 'w-full min-w-0 overflow-x-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper'
            : 'w-full min-w-0 overflow-x-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper'
        }
      >
        <table className="w-full table-auto text-left text-sm">
          <thead>
            <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[9%]">Client Status</th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[14%]">Client</th>
              <th className="label-caps px-3 py-2.5 text-left hidden md:table-cell sm:px-4 w-[12%]">
                Email
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 min-w-[7rem]">Project</th>
              <th className="label-caps px-3 py-2.5 text-left hidden sm:table-cell sm:px-4 w-[8%]">
                Tier
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[9%]">Project Status</th>
              <th className="label-caps px-3 py-2.5 text-left hidden sm:table-cell sm:px-4 w-[9%]">
                Contract
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[10%]">Payment</th>
              <th className="label-caps w-[8rem] px-3 py-2.5 text-left sm:px-4">
                Start Project
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[6%]">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => {
              const canStart = canStartProject(client)
              const started = isProjectActive(client)

              return (
                <tr key={client.id} className="hover:bg-surface transition-colors">
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    {client.isOfficialClient ? <OfficialClientBadge /> : <PendingClientBadge />}
                  </td>
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <div className="min-w-0">
                      <div className="min-w-0">
                        <Link
                          to={`/clients/${client.id}`}
                          className="truncate font-semibold text-ink hover:text-brand hover:underline"
                          title={client.isSampleClient ? 'THIS IS A MOCK USER.' : undefined}
                        >
                          {client.name}
                        </Link>
                      </div>
                      <p className="truncate text-xs text-ink-muted">{client.businessName}</p>
                      <p className="truncate text-xs text-ink-faint md:hidden">{client.email}</p>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-3 py-2.5 align-top truncate max-w-[10rem] text-ink-muted sm:px-4">
                    {client.email}
                  </td>
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <Link
                      to={`/clients/${client.id}#project-files`}
                      className="block break-words font-bold leading-snug text-ink hover:text-brand hover:underline"
                      title={`Open files for ${client.projectName}`}
                    >
                      {client.projectName || '—'}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2.5 align-top sm:px-4">
                    <EditableServiceTierCell
                      client={client}
                      contract={getContractForClient(client.id)}
                      onUpdate={(tier) => updateClientServiceTier(client.id, tier)}
                    />
                  </td>
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <StatusBadge type="project" status={client.projectStatus} />
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2.5 align-top sm:px-4">
                    <StatusBadge type="contract" status={client.contractStatus} />
                  </td>
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <StatusBadge type="payment" status={client.paymentStatus} />
                  </td>
                  <td className="px-3 py-2.5 align-middle sm:px-4">
                    {started ? (
                      <span className={cn(projectActionBoxClass, 'border-ink bg-surface text-ink')}>
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          projectActionBoxClass,
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
                        Start Project
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top sm:px-4">
                    <Link to={`/clients/${client.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">View</span>
                      </Button>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
