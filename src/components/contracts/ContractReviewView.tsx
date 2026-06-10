import type { ContractData } from '@/types'
import { CONTRACT_SECTION_IDS } from '@/lib/contractSections'
import { paymentProviderLabel } from '@/lib/paymentProvider'
import { formatDate } from '@/lib/utils'

interface ContractReviewViewProps {
  contract: ContractData
  designerName?: string
  businessName?: string
}

function ContractWave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M0,28 C240,56 480,0 720,28 C960,56 1200,0 1440,28 L1440,56 L0,56 Z"
      />
    </svg>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="heading-display text-[15px] text-brand">{title}</h3>
      <div className="h-px flex-1 bg-gradient-to-r from-sky-400/50 via-accent/30 to-transparent" />
    </div>
  )
}

function SectionGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
        <div className="h-px flex-1 bg-line/80" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-md border border-line/50 bg-surface-paper/80 px-5 py-4 shadow-sm shadow-brand/5"
    >
      <SectionHeading title={title} />
      <div className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.65] text-ink-muted">
        {children}
      </div>
    </section>
  )
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: string | undefined
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-nav-fg-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-nav-fg">
        {value || '—'}
      </p>
    </div>
  )
}

export function ContractReviewView({
  contract,
  designerName,
  businessName,
}: ContractReviewViewProps) {
  const preparedBy = businessName || designerName || 'Your designer'

  return (
    <article className="contract-document -mx-1 overflow-hidden rounded-lg">
      {/* Header band */}
      <header
        id={CONTRACT_SECTION_IDS.summary}
        className="scroll-mt-24 relative bg-brand text-nav-fg"
      >
        <div className="px-6 pb-10 pt-8 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300/90">
            Website & design services agreement
          </p>
          <h2 className="heading-display mt-3 text-2xl text-nav-fg sm:text-[1.75rem]">
            {contract.projectTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-nav-fg-muted">
            {contract.businessName}
            <span className="mx-2 text-nav-fg-muted/50">·</span>
            Prepared by {preparedBy}
          </p>
          {contract.createdAt && (
            <p className="mt-1 text-xs text-nav-fg-muted/80">
              Issued {formatDate(contract.createdAt)}
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Total project cost" value={contract.totalCost} />
            <SummaryMetric label="Deposit" value={contract.depositAmount} />
            <SummaryMetric label="Service tier" value={contract.serviceTier} />
          </div>
        </div>

        <ContractWave className="absolute bottom-0 left-0 h-7 w-full text-surface" />
      </header>

      {/* Body */}
      <div className="space-y-10 bg-surface px-6 py-8 sm:px-8">
        <SectionGroup label="Project & deliverables">
          <Section id={CONTRACT_SECTION_IDS.projectScope} title="Project scope">
            {contract.projectScope || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.servicesIncluded} title="Services included">
            {contract.servicesIncluded || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.servicesNotIncluded} title="Services not included">
            {contract.servicesNotIncluded || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.deliverables} title="Deliverables">
            {contract.deliverables || '—'}
          </Section>

          <div
            className="grid gap-4 rounded-md border border-line/50 bg-surface-paper/80 px-5 py-4 text-sm shadow-sm shadow-brand/5 sm:grid-cols-2"
          >
            <p>
              <span className="font-medium text-ink">Start date</span>
              <span className="mt-0.5 block text-ink-muted">
                {contract.startDate ? formatDate(contract.startDate) : '—'}
              </span>
            </p>
            <p>
              <span className="font-medium text-ink">Completion</span>
              <span className="mt-0.5 block text-ink-muted">
                {contract.completionDate ? formatDate(contract.completionDate) : '—'}
              </span>
            </p>
          </div>
        </SectionGroup>

        <SectionGroup label="Payment terms">
          <Section id={CONTRACT_SECTION_IDS.paymentSchedule} title="Payment schedule">
            {contract.paymentSchedule || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.paymentMethods} title="Payment methods">
            <p>
              Checkout: {paymentProviderLabel(contract.paymentProvider)}
            </p>
            <p className="mt-1">{contract.paymentMethods || '—'}</p>
          </Section>
          <Section id={CONTRACT_SECTION_IDS.latePayment} title="Late payment policy">
            {contract.latePaymentPolicy || '—'}
          </Section>
        </SectionGroup>

        <SectionGroup label="Revisions & communication">
          <Section id={CONTRACT_SECTION_IDS.revisions} title="Revisions">
            {contract.revisionCount || '—'}
            {contract.extraRevisionFee ? ` · Extra revisions: ${contract.extraRevisionFee}` : ''}
            {'\n'}
            {contract.revisionLimits || ''}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.clientResponsibilities} title="Client responsibilities">
            {contract.clientResponsibilities || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.communication} title="Communication">
            {`${contract.communicationMethod || '—'} · Response time: ${contract.responseTime || '—'}`}
          </Section>
        </SectionGroup>

        <SectionGroup label="Rights & termination">
          <Section id={CONTRACT_SECTION_IDS.ownership} title="Ownership">
            {contract.ownershipTerms || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.portfolioRights} title="Portfolio rights">
            {contract.portfolioRights || '—'}
          </Section>
          <Section id={CONTRACT_SECTION_IDS.termination} title="Termination">
            {contract.terminationTerms || '—'}
          </Section>
        </SectionGroup>

        {(contract.designerSignature || contract.clientSignature) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Signatures
              </p>
              <div className="h-px flex-1 bg-line/80" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {contract.designerSignature && (
                <div className="rounded-md border border-line/50 bg-surface-paper px-5 py-4 shadow-sm shadow-brand/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                    Designer signature
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold text-brand">
                    {contract.designerSignature}
                  </p>
                  {contract.designerSignDate && (
                    <p className="mt-1 text-sm text-ink-faint">
                      {formatDate(contract.designerSignDate)}
                    </p>
                  )}
                </div>
              )}
              {contract.clientSignature && (
                <div className="rounded-md border border-line/50 bg-surface-paper px-5 py-4 shadow-sm shadow-brand/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                    Client signature
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold text-brand">
                    {contract.clientSignature}
                  </p>
                  {contract.clientSignDate && (
                    <p className="mt-1 text-sm text-ink-faint">
                      {formatDate(contract.clientSignDate)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
