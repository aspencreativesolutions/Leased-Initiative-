import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OfficialClientBadge } from './OfficialClientBadge'
import { SampleClientBadge } from './SampleClientBadge'
import { formatDate } from '@/lib/utils'
import type { Client } from '@/types'

interface ClientTableProps {
  clients: Client[]
  /** When true, table stretches to 100% of parent (no min-width scroll trap) */
  fullWidth?: boolean
}

export function ClientTable({ clients, fullWidth = false }: ClientTableProps) {
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
          <SampleClientBadge className="align-middle" /> — demo data you can replace anytime.
        </p>
      )}
      <div
        className={
          fullWidth
            ? 'w-full min-w-0 overflow-x-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper'
            : 'w-full min-w-0 overflow-x-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10 bg-surface-paper'
        }
      >
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead>
            <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
              <th className="label-caps px-3 py-3 text-left sm:px-4">Client</th>
              <th className="label-caps px-3 py-3 text-left hidden md:table-cell">Email</th>
              <th className="label-caps px-3 py-3 text-left hidden lg:table-cell">Phone</th>
              <th className="label-caps px-3 py-3 text-left">Project</th>
              <th className="label-caps px-3 py-3 text-left">Status</th>
              <th className="label-caps px-3 py-3 text-left hidden sm:table-cell">Contract</th>
              <th className="label-caps px-3 py-3 text-left hidden lg:table-cell">Follow-up</th>
              <th className="label-caps px-3 py-3 text-left">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface transition-colors">
                <td className="px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-semibold text-ink">{client.name}</p>
                      {client.isSampleClient && <SampleClientBadge />}
                      {client.isOfficialClient && <OfficialClientBadge />}
                    </div>
                    <p className="truncate text-xs text-ink-muted">{client.businessName}</p>
                    <p className="truncate text-xs text-ink-faint md:hidden">{client.email}</p>
                  </div>
                </td>
                <td className="hidden md:table-cell px-3 py-3 truncate text-ink-muted sm:px-4">
                  {client.email}
                </td>
                <td className="hidden lg:table-cell px-3 py-3 truncate text-ink-muted sm:px-4">
                  {client.phone}
                </td>
                <td className="px-3 py-3 truncate text-ink sm:px-4">{client.projectName}</td>
                <td className="px-3 py-3 sm:px-4">
                  <StatusBadge type="project" status={client.projectStatus} />
                </td>
                <td className="hidden sm:table-cell px-3 py-3 sm:px-4">
                  <StatusBadge type="contract" status={client.contractStatus} />
                </td>
                <td className="hidden lg:table-cell px-3 py-3 text-ink-muted sm:px-4">
                  {formatDate(client.followUpDate)}
                </td>
                <td className="px-3 py-3 sm:px-4">
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
