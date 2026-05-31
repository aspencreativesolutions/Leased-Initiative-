import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OfficialClientBadge } from './OfficialClientBadge'
import { PendingClientBadge } from './PendingClientBadge'
import { SampleClientBadge } from './SampleClientBadge'
import { EditableServiceTierCell } from '@/components/clients/EditableServiceTierCell'
import { useApp } from '@/context/AppContext'
import { formatDate } from '@/lib/utils'
import type { Client } from '@/types'

interface ClientTableProps {
  clients: Client[]
  /** When true, table stretches to 100% of parent (no min-width scroll trap) */
  fullWidth?: boolean
}

export function ClientTable({ clients, fullWidth = false }: ClientTableProps) {
  const { getContractForClient, updateClientServiceTier } = useApp()

  if (clients.length === 0) {
    return null
  }

  const sampleCount = clients.filter((c) => c.isSampleClient).length

  return (
    <div className="w-full min-w-0">
      {sampleCount > 0 && (
        <p className="mb-3 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{sampleCount}</span> sample client
          {sampleCount !== 1 ? 's' : ''} marked with{' '}
          <SampleClientBadge className="align-middle mx-0.5" /> — demo data you can replace anytime.
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
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[16%]">Client</th>
              <th className="label-caps px-3 py-2.5 text-left hidden md:table-cell sm:px-4 w-[14%]">
                Email
              </th>
              <th className="label-caps px-3 py-2.5 text-left hidden lg:table-cell sm:px-4 w-[10%]">
                Phone
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 min-w-[8rem]">Project</th>
              <th className="label-caps px-3 py-2.5 text-left hidden sm:table-cell sm:px-4 w-[9%]">
                Tier
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[10%]">Status</th>
              <th className="label-caps px-3 py-2.5 text-left hidden sm:table-cell sm:px-4 w-[10%]">
                Contract
              </th>
              <th className="label-caps px-3 py-2.5 text-left hidden lg:table-cell sm:px-4 w-[9%]">
                Follow-up
              </th>
              <th className="label-caps px-3 py-2.5 text-left sm:px-4 w-[7%]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface transition-colors">
                <td className="px-3 py-2.5 align-top sm:px-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        to={`/clients/${client.id}`}
                        className="truncate font-semibold text-ink hover:text-brand hover:underline"
                      >
                        {client.name}
                      </Link>
                      {client.isSampleClient && <SampleClientBadge />}
                      {client.isOfficialClient ? (
                        <OfficialClientBadge />
                      ) : (
                        <PendingClientBadge />
                      )}
                    </div>
                    <p className="truncate text-xs text-ink-muted">{client.businessName}</p>
                    <p className="truncate text-xs text-ink-faint md:hidden">{client.email}</p>
                  </div>
                </td>
                <td className="hidden md:table-cell px-3 py-2.5 align-top truncate max-w-[10rem] text-ink-muted sm:px-4">
                  {client.email}
                </td>
                <td className="hidden lg:table-cell px-3 py-2.5 align-top truncate max-w-[8rem] text-ink-muted sm:px-4">
                  {client.phone}
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
                <td className="hidden lg:table-cell px-3 py-2.5 align-top text-ink-muted sm:px-4 whitespace-nowrap">
                  {formatDate(client.followUpDate)}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
