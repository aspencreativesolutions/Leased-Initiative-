import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, PenLine } from 'lucide-react'
import { ContractStatusProgress } from '@/components/clients/ClientStatusOverview'
import { PortalLeaseSignModal } from '@/components/portal/PortalLeaseSignModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PortalContractStatusBadge } from '@/components/portal/PortalContractStatusBadge'
import { formatDate } from '@/lib/utils'
import type { ContractStatus, PortalContractSummary } from '@/types'

interface PortalCurrentContractsProps {
  contracts: PortalContractSummary[]
  contractStatus?: ContractStatus
  projectStarted?: boolean
  /** Fallback property address when a contract summary has no address */
  propertyAddress?: string
  emptyDescription?: string
  /** Prefill for the draw-to-sign modal */
  tenantName?: string
  /** Refresh dashboard after a successful signature */
  onSigned?: () => void
}

export function PortalCurrentContracts({
  contracts,
  contractStatus,
  projectStarted = false,
  propertyAddress,
  emptyDescription = "Your landlord is preparing your agreement. Once it's sent, it will appear here right away.",
  tenantName = '',
  onSigned,
}: PortalCurrentContractsProps) {
  const [signingContract, setSigningContract] = useState<PortalContractSummary | null>(null)

  return (
    <section data-onboarding="portal-contracts">
      <h2 className="label-caps mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Lease Agreements
      </h2>

      {contracts.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={FileText}
            title="No lease agreements yet"
            description={emptyDescription}
          />
        </Card>
      ) : (
        <ul className="paper-box divide-y divide-[var(--card-border,var(--line))] overflow-hidden text-left">
          {contracts.map((contract) => {
            const displayAddress =
              contract.address?.trim() ||
              propertyAddress?.trim() ||
              contract.projectTitle
            const awaitingSignature = contract.portalStatus !== 'Accepted'

            return (
              <li key={contract.id} className="transition-colors hover:bg-surface">
                <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-4 sm:py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{displayAddress}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Sent {contract.sentAt ? formatDate(contract.sentAt) : '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                    <PortalContractStatusBadge status={contract.portalStatus} prominent />
                    {awaitingSignature ? (
                      <Button
                        variant="primary"
                        size="md"
                        className="font-bold"
                        onClick={() => setSigningContract(contract)}
                      >
                        <PenLine className="h-4 w-4" />
                        Sign
                      </Button>
                    ) : null}
                    <Link to={`/portal/contracts/${contract.id}`}>
                      <Button variant="outline" size="md" className="font-bold">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>

                {contractStatus && (
                  <div className="border-t border-[var(--card-border,var(--line))] px-3 py-3 sm:px-4">
                    <ContractStatusProgress
                      status={contractStatus}
                      projectStarted={projectStarted}
                      viewedAt={contract.viewedAt}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {signingContract ? (
        <PortalLeaseSignModal
          open
          onClose={() => setSigningContract(null)}
          contractId={signingContract.id}
          projectTitle={
            signingContract.address?.trim() ||
            propertyAddress?.trim() ||
            signingContract.projectTitle
          }
          defaultName={tenantName}
          needsReview={signingContract.portalStatus === 'Pending Review'}
          onSigned={() => {
            setSigningContract(null)
            onSigned?.()
          }}
        />
      ) : null}
    </section>
  )
}
