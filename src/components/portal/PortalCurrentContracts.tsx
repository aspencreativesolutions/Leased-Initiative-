import { Link } from 'react-router-dom'
import { Eye, FileText } from 'lucide-react'
import { ContractStatusProgress } from '@/components/clients/ClientStatusOverview'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PortalContractStatusBadge } from '@/components/portal/PortalContractStatusBadge'
import { formatDate } from '@/lib/utils'
import type { ContractStatus, PortalContractSummary } from '@/types'

interface PortalCurrentContractsProps {
  contracts: PortalContractSummary[]
  contractStatus?: ContractStatus
  emptyDescription?: string
}

export function PortalCurrentContracts({
  contracts,
  contractStatus,
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
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-sm)] border-2 border-ink/10 bg-surface-paper">
          {contracts.map((contract) => (
            <li key={contract.id} className="transition-colors hover:bg-surface">
              <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-4 sm:py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{contract.projectTitle}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Sent {contract.sentAt ? formatDate(contract.sentAt) : '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                  <PortalContractStatusBadge status={contract.portalStatus} prominent />
                  <Link to={`/portal/contracts/${contract.id}`}>
                    <Button variant="outline" size="md" className="font-bold">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>

              {contractStatus && (
                <div className="border-t border-line/80 px-3 py-3 sm:px-4">
                  <ContractStatusProgress status={contractStatus} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
