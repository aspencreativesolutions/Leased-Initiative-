import type { ContractData } from '@/types'
import { CONTRACT_SECTION_IDS } from '@/lib/contractSections'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import { formatDate } from '@/lib/utils'
import { ContractDocumentSection } from '@/components/contracts/ContractDocumentSection'

interface ContractReviewViewProps {
  contract: ContractData
  designerName?: string
  businessName?: string
}

function displayValue(value?: string): string | undefined {
  if (!value?.trim()) return undefined
  if (value.includes('[To be customized]')) return undefined
  return value
}

export function ContractReviewView({
  contract,
  designerName,
  businessName,
}: ContractReviewViewProps) {
  const preparedBy = businessName || designerName || 'Your landlord'

  const tenantBlock = [
    contract.clientName,
    displayValue(contract.businessName) && `Mailing: ${contract.businessName}`,
    contract.email,
    contract.phone,
  ]
    .filter(Boolean)
    .join('\n')

  const monthlyRent = displayValue(contract.totalCost)
  const deposit = displayValue(contract.depositAmount)

  return (
    <div className="contract-form-shell">
      <article className="contract-form-paper contract-document">
        <header
          id={CONTRACT_SECTION_IDS.summary}
          className="scroll-mt-24 px-8 pb-10 pt-14 text-center sm:px-14 sm:pt-16"
        >
          <h2 className="font-display text-xl font-semibold uppercase tracking-[0.22em] text-ink sm:text-2xl">
            Residential Lease Agreement
          </h2>
          <p className="mx-auto mt-5 max-w-md font-serif text-sm italic leading-relaxed text-ink-muted">
            Lease for <span className="text-ink">{contract.clientName}</span>
            {' — '}
            {contract.projectTitle}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
            Monthly rent {monthlyRent || '—'} · Security deposit {deposit || '—'}
            {contract.leaseVersion != null ? ` · Version ${contract.leaseVersion}` : ''}
          </p>
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
          <ContractDocumentSection
            label="1. Landlord information"
            value={displayValue(contract.portfolioRights)}
          />

          <ContractDocumentSection label="2. Tenant information" value={tenantBlock} />

          <ContractDocumentSection
            label="3–4. Rental property & unit"
            value={[
              displayValue(contract.clientAddress) &&
                `Property address: ${contract.clientAddress}`,
              displayValue(contract.projectScope),
            ]
              .filter(Boolean)
              .join('\n\n')}
          />

          <div className="grid gap-10 sm:grid-cols-2">
            <ContractDocumentSection
              label="5. Lease start date"
              value={
                displayValue(contract.startDate)
                  ? formatDate(contract.startDate)
                  : undefined
              }
            />
            <ContractDocumentSection
              label="6. Lease end date"
              value={
                displayValue(contract.completionDate)
                  ? formatDate(contract.completionDate)
                  : undefined
              }
            />
          </div>

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.paymentSchedule}
            label="7–10. Rent, deposit & payment schedule"
            value={[
              monthlyRent && `Monthly rent: ${monthlyRent}`,
              deposit && `Security deposit: ${deposit}`,
              displayValue(contract.remainingBalance) &&
                `Move-in / first payment: ${contract.remainingBalance}`,
              displayValue(contract.paymentSchedule),
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
            label="11. Late-payment terms"
            value={contract.latePaymentPolicy}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.deliverables}
            label="12. Occupancy limits"
            value={[
              displayValue(contract.revisionCount) &&
                `Maximum occupants: ${contract.revisionCount}`,
              displayValue(contract.deliverables),
            ]
              .filter(Boolean)
              .join('\n\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.servicesIncluded}
            label="13. Utilities and services"
            value={[
              displayValue(contract.servicesIncluded) &&
                `Included: ${contract.servicesIncluded}`,
              displayValue(contract.servicesNotIncluded) &&
                `Tenant pays: ${contract.servicesNotIncluded}`,
            ]
              .filter(Boolean)
              .join('\n\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.clientResponsibilities}
            label="14. Maintenance responsibilities"
            value={contract.clientResponsibilities}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.ownership}
            label="15. Property-use rules"
            value={contract.ownershipTerms}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.revisions}
            label="16. Pets"
            value={[
              displayValue(contract.revisionLimits),
              displayValue(contract.extraRevisionFee) &&
                `Pet deposit / fee: ${contract.extraRevisionFee}`,
            ]
              .filter(Boolean)
              .join('\n\n')}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.communication}
            label="17. Entry and inspection"
            value={contract.meetingExpectations}
          />

          <ContractDocumentSection
            id={CONTRACT_SECTION_IDS.termination}
            label="18. Renewal or termination"
            value={contract.terminationTerms}
          />

          <ContractDocumentSection
            label="19. Notices"
            value={[
              contract.communicationMethod && `Method: ${contract.communicationMethod}`,
              displayValue(contract.responseTime) &&
                `Notice period: ${contract.responseTime}`,
            ]
              .filter(Boolean)
              .join('\n')}
          />

          <div className="mx-auto max-w-md space-y-10 border-t border-line/40 pt-10">
              <ContractDocumentSection
                label="20. Landlord signature"
                hint="Signature & date"
              >
                <div className="space-y-2">
                  <p>
                    {contract.designerSignature?.trim() ||
                      designerName?.trim() ||
                      businessName?.trim() ||
                      'Landlord'}
                  </p>
                  {contract.designerSignDate ? (
                    <p className="text-ink-muted">{formatDate(contract.designerSignDate)}</p>
                  ) : (
                    <p className="font-serif text-xs italic text-ink-faint">
                      Signature line — landlord signs here
                    </p>
                  )}
                </div>
              </ContractDocumentSection>

              <ContractDocumentSection
                label="21–22. Tenant signature"
                hint="Signature & date"
              >
                {contract.clientSignature?.trim() || contract.clientSignatureImage?.trim() ? (
                  <div className="space-y-2">
                    {contract.clientSignatureImage?.trim() ? (
                      <img
                        src={contract.clientSignatureImage}
                        alt="Tenant signature"
                        className="max-h-24 max-w-full object-contain"
                      />
                    ) : null}
                    {contract.clientSignature?.trim() ? (
                      <p>{contract.clientSignature}</p>
                    ) : null}
                    {contract.clientSignDate ? (
                      <p className="text-ink-muted">{formatDate(contract.clientSignDate)}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-serif italic text-ink-faint">Electronic Signature Here</p>
                    <span className="inline-flex rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                      Send to Tenant to Sign
                    </span>
                  </div>
                )}
              </ContractDocumentSection>
            </div>
        </div>
      </article>
    </div>
  )
}
