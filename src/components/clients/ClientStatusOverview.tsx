import { cn } from '@/lib/utils'
import type { ContractStatus, PaymentStatus, ProjectStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'

const CONTRACT_STEPS: { status: ContractStatus; label: string }[] = [
  { status: 'Not Started', label: 'Not started' },
  { status: 'Draft in Progress', label: 'Draft' },
  { status: 'Generated', label: 'Generated' },
  { status: 'Sent', label: 'Sent' },
  { status: 'Signed', label: 'Signed' },
  { status: 'Completed', label: 'Done' },
]

interface StatusGroupProps {
  label: string
  type: 'project' | 'contract' | 'payment'
  status: ProjectStatus | ContractStatus | PaymentStatus
  highlighted?: boolean
}

function StatusGroup({ label, type, status, highlighted }: StatusGroupProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-shadow',
        highlighted
          ? 'border-2 border-accent bg-accent-light/40 shadow-[0_0_0_1px_var(--accent),0_0_18px_rgba(109,46,58,0.28)]'
          : 'border border-line/80 bg-surface-paper/60'
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
        {label}
      </span>
      {highlighted && (
        <span className="text-[9px] font-bold uppercase tracking-caps text-accent">
          Current stage
        </span>
      )}
      <StatusBadge type={type} status={status} highlighted={highlighted} />
    </div>
  )
}

function ContractStatusProgress({ status }: { status: ContractStatus }) {
  if (status === 'Cancelled') {
    return (
      <div className="rounded-[var(--radius-sm)] border-2 border-dashed border-accent bg-accent-light/30 px-3 py-2">
        <p className="label-caps text-accent">Contract progress</p>
        <p className="mt-1 text-xs font-semibold text-accent">Cancelled</p>
      </div>
    )
  }

  const currentIndex = CONTRACT_STEPS.findIndex((s) => s.status === status)

  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface-paper/80 px-3 py-3">
      <p className="label-caps mb-2.5">Contract progress</p>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {CONTRACT_STEPS.map((step, i) => {
          const isCurrent = i === currentIndex
          const isPast = i < currentIndex

          return (
            <div key={step.status} className="flex items-center gap-1">
              <div
                className={cn(
                  'rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2 py-1 text-[9px] font-bold uppercase tracking-caps transition-shadow',
                  isCurrent &&
                    'border-accent bg-accent text-white shadow-[0_0_0_2px_var(--accent-light),0_0_14px_rgba(109,46,58,0.45)]',
                  isPast && 'border-ink/40 bg-ink/10 text-ink-muted',
                  !isCurrent && !isPast && 'border-line text-ink-faint'
                )}
                title={step.status}
              >
                {step.label}
              </div>
              {i < CONTRACT_STEPS.length - 1 && (
                <span
                  className={cn(
                    'h-px w-2 sm:w-3',
                    isPast ? 'bg-ink/30' : 'bg-line'
                  )}
                  aria-hidden
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ClientStatusOverviewProps {
  projectStatus: ProjectStatus
  contractStatus: ContractStatus
  paymentStatus?: PaymentStatus
  showProgress?: boolean
  className?: string
}

export function ClientStatusOverview({
  projectStatus,
  contractStatus,
  paymentStatus,
  showProgress = true,
  className,
}: ClientStatusOverviewProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
        <StatusGroup label="Project" type="project" status={projectStatus} />
        <StatusGroup label="Contract" type="contract" status={contractStatus} highlighted />
        {paymentStatus && (
          <StatusGroup label="Payment" type="payment" status={paymentStatus} />
        )}
      </div>
      {showProgress && <ContractStatusProgress status={contractStatus} />}
    </div>
  )
}
