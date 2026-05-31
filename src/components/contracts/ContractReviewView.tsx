import type { ContractData } from '@/types'
import { formatDate } from '@/lib/utils'

interface ContractReviewViewProps {
  contract: ContractData
  designerName?: string
  businessName?: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="label-caps text-accent">{title}</h3>
      <div className="text-sm text-ink whitespace-pre-wrap">{children}</div>
    </section>
  )
}

export function ContractReviewView({ contract, designerName, businessName }: ContractReviewViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-sm border-2 border-ink bg-surface-paper p-4">
        <p className="label-caps text-accent">Contract summary</p>
        <h2 className="heading-display mt-1 text-xl">{contract.projectTitle}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {contract.businessName} · Prepared by {businessName || designerName || 'Your designer'}
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <p>
            <span className="text-ink-faint">Total:</span> {contract.totalCost || '—'}
          </p>
          <p>
            <span className="text-ink-faint">Deposit:</span> {contract.depositAmount || '—'}
          </p>
          <p>
            <span className="text-ink-faint">Tier:</span> {contract.serviceTier}
          </p>
        </div>
      </div>

      <Section title="Project scope">{contract.projectScope || '—'}</Section>
      <Section title="Services included">{contract.servicesIncluded || '—'}</Section>
      <Section title="Services not included">{contract.servicesNotIncluded || '—'}</Section>
      <Section title="Deliverables">{contract.deliverables || '—'}</Section>

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <p>
          <span className="text-ink-faint">Start date:</span>{' '}
          {contract.startDate ? formatDate(contract.startDate) : '—'}
        </p>
        <p>
          <span className="text-ink-faint">Completion:</span>{' '}
          {contract.completionDate ? formatDate(contract.completionDate) : '—'}
        </p>
      </div>

      <Section title="Payment schedule">{contract.paymentSchedule || '—'}</Section>
      <Section title="Payment methods">{contract.paymentMethods || '—'}</Section>
      <Section title="Late payment policy">{contract.latePaymentPolicy || '—'}</Section>

      <Section title="Revisions">
        {contract.revisionCount || '—'}
        {contract.extraRevisionFee ? ` · Extra revisions: ${contract.extraRevisionFee}` : ''}
        {'\n'}
        {contract.revisionLimits || ''}
      </Section>

      <Section title="Client responsibilities">{contract.clientResponsibilities || '—'}</Section>
      <Section title="Communication">{`${contract.communicationMethod || '—'} · Response time: ${contract.responseTime || '—'}`}</Section>
      <Section title="Ownership">{contract.ownershipTerms || '—'}</Section>
      <Section title="Portfolio rights">{contract.portfolioRights || '—'}</Section>
      <Section title="Termination">{contract.terminationTerms || '—'}</Section>

      {(contract.designerSignature || contract.clientSignature) && (
        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2 text-sm">
          {contract.designerSignature && (
            <div>
              <p className="label-caps">Designer signature</p>
              <p className="mt-1 font-medium">{contract.designerSignature}</p>
              {contract.designerSignDate && (
                <p className="text-ink-faint">{formatDate(contract.designerSignDate)}</p>
              )}
            </div>
          )}
          {contract.clientSignature && (
            <div>
              <p className="label-caps">Client signature</p>
              <p className="mt-1 font-medium">{contract.clientSignature}</p>
              {contract.clientSignDate && (
                <p className="text-ink-faint">{formatDate(contract.clientSignDate)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
