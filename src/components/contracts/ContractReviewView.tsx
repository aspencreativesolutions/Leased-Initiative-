import type { ContractData } from '@/types'
import { CONTRACT_SECTION_IDS } from '@/lib/contractSections'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import { getServiceTierInfo } from '@/lib/serviceTierInfo'
import { migrateServiceTier } from '@/lib/serviceTiers'
import { formatDate } from '@/lib/utils'
import { ContractDocumentSection } from '@/components/contracts/ContractDocumentSection'

interface ContractReviewViewProps {
  contract: ContractData
  designerName?: string
  businessName?: string
}

export function ContractReviewView({
  contract,
  designerName,
  businessName,
}: ContractReviewViewProps) {
  const preparedBy = businessName || designerName || 'Your landlord'
  const tier = migrateServiceTier(contract.serviceTier)
  const tierInfo = getServiceTierInfo(tier)

  const clientBlock = [
    contract.clientName,
    contract.businessName,
    contract.email,
    contract.phone,
    contract.clientAddress,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="contract-form-shell">
      <article className="contract-form-paper contract-document">
        <header
          id={CONTRACT_SECTION_IDS.summary}
          className="scroll-mt-24 px-8 pb-10 pt-14 text-center sm:px-14 sm:pt-16"
        >
          <h2 className="font-display text-xl font-semibold uppercase tracking-[0.22em] text-ink sm:text-2xl">
            Lease Agreement
          </h2>
          <p className="mx-auto mt-5 max-w-md font-serif text-sm italic leading-relaxed text-ink-muted">
            Lease for <span className="text-ink">{contract.businessName}</span>
            {' — '}
            {contract.projectTitle}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
            Total {contract.totalCost || '—'} · Deposit {contract.depositAmount || '—'} · {tier}
          </p>
          <p className="mt-2 text-sm font-medium text-ink-muted">{tierInfo.tagline}</p>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-ink-faint">
            Prepared by {preparedBy}
            {contract.createdAt && (
              <>
                {' · '}
                Issued {formatDate(contract.createdAt)}
              </>
            )}
          </p>
        </header>

        <div className="contract-document-body space-y-10 px-8 pb-12 sm:px-14">
          <ContractDocumentSection label="Tenant information" value={clientBlock} />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.projectScope}
            label="Project scope"
            hint={`${tier} tier`}
            value={contract.projectScope}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.servicesIncluded}
            label="Services included"
            value={contract.servicesIncluded}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.servicesNotIncluded}
            label="Services not included"
            value={contract.servicesNotIncluded}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.deliverables}
            label="Deliverables"
            value={contract.deliverables}
          />

          <div className="grid gap-10 sm:grid-cols-2">
            <ContractDocumentSection
              label="Start date"
              value={contract.startDate ? formatDate(contract.startDate) : undefined}
            />
            <ContractDocumentSection
              label="Completion date"
              value={contract.completionDate ? formatDate(contract.completionDate) : undefined}
            />
          </div>

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.paymentSchedule}
            label="Payment schedule"
            value={[
              contract.totalCost && `Total: ${contract.totalCost}`,
              contract.depositAmount && `Deposit: ${contract.depositAmount}`,
              contract.remainingBalance && `Remaining: ${contract.remainingBalance}`,
              contract.paymentSchedule,
            ]
              .filter(Boolean)
              .join('\n\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.paymentMethods}
            label="Payment methods"
            value={[
              `Checkout: ${paymentProviderLabel(contract.paymentProvider)}`,
              contract.paymentMethods,
              contract.allowPrepaidRent === false
                ? 'Prepaid rent: next month only'
                : 'Prepaid rent: consecutive months allowed',
            ]
              .filter(Boolean)
              .join('\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.latePayment}
            label="Late payment policy"
            value={contract.latePaymentPolicy}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.revisions}
            label="Revisions"
            value={[
              contract.revisionCount && `Included: ${contract.revisionCount}`,
              contract.extraRevisionFee && `Extra fee: ${contract.extraRevisionFee}`,
              contract.revisionLimits,
            ]
              .filter(Boolean)
              .join('\n\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.clientResponsibilities}
            label="Tenant responsibilities"
            value={contract.clientResponsibilities}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.communication}
            label="Communication"
            value={[
              `Method: ${contract.communicationMethod || '—'}`,
              `Response time: ${contract.responseTime || '—'}`,
              `Meetings: ${contract.meetingExpectations || '—'}`,
            ].join('\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.ownership}
            label="Ownership terms"
            value={contract.ownershipTerms}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.portfolioRights}
            label="Portfolio rights"
            value={contract.portfolioRights}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.termination}
            label="Termination conditions"
            value={contract.terminationTerms}
          />

          {(contract.designerSignature || contract.clientSignature) && (
            <div className="mx-auto max-w-md space-y-10 border-t border-line/40 pt-10">
              {contract.designerSignature && (
                <ContractDocumentSection
                  label="Landlord"
                  hint="Signature & date"
                  value={[
                    contract.designerSignature,
                    contract.designerSignDate
                      ? formatDate(contract.designerSignDate)
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                />
              )}
              {contract.clientSignature && (
                <ContractDocumentSection
                  label="Tenant"
                  hint="Signature & date"
                  value={[
                    contract.clientSignature,
                    contract.clientSignDate ? formatDate(contract.clientSignDate) : undefined,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                />
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
