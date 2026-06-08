import { Link } from 'react-router-dom'
import { Eye, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PortalContractStatusBadge } from '@/components/portal/PortalContractStatusBadge'
import { formatDate } from '@/lib/utils'
import type { PortalContractSummary } from '@/types'

interface PortalCurrentContractsProps {
  contracts: PortalContractSummary[]
  emptyDescription?: string
}

export function PortalCurrentContracts({
  contracts,
  emptyDescription = "Your designer is preparing your agreement. Once it's sent, it will appear here right away.",
}: PortalCurrentContractsProps) {
  return (
    <section>
      <h2 className="label-caps mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Current Contracts
      </h2>

      {contracts.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={FileText}
            title="No contracts yet"
            description={emptyDescription}
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-sm)] border-2 border-ink/10 bg-surface-paper">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink bg-surface">
                <th className="label-caps px-3 py-2.5 sm:px-4">Contract</th>
                <th className="label-caps px-3 py-2.5 hidden sm:table-cell sm:px-4">Date sent</th>
                <th className="label-caps px-3 py-2.5 sm:px-4">Status</th>
                <th className="label-caps px-3 py-2.5 sm:px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-surface transition-colors">
                  <td className="px-3 py-3 align-top sm:px-4">
                    <p className="font-semibold text-ink">{contract.projectTitle}</p>
                    <p className="mt-0.5 text-xs text-ink-muted sm:hidden">
                      Sent {contract.sentAt ? formatDate(contract.sentAt) : '—'}
                    </p>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 align-top text-ink-muted sm:px-4 whitespace-nowrap">
                    {contract.sentAt ? formatDate(contract.sentAt) : '—'}
                  </td>
                  <td className="px-3 py-3 align-top sm:px-4">
                    <PortalContractStatusBadge status={contract.portalStatus} />
                  </td>
                  <td className="px-3 py-3 align-top sm:px-4">
                    <Link to={`/portal/contracts/${contract.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
