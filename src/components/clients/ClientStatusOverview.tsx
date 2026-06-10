import { cn, formatDate } from '@/lib/utils'
import type { ContractStatus, PaymentStatus, PortalInvoice, ProjectStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'

const CONTRACT_STEPS: { status: ContractStatus; label: string }[] = [
  { status: 'Not Started', label: 'Not started' },
  { status: 'Draft in Progress', label: 'Draft' },
  { status: 'Generated', label: 'Generated' },
  { status: 'Sent', label: 'Sent' },
  { status: 'Signed', label: 'Signed' },
  { status: 'Completed', label: 'Done' },
]

type OverviewStage = 'inquiry' | 'contract' | 'payment' | 'project' | 'remaining'

const STAGE_ORDER: OverviewStage[] = [
  'inquiry',
  'contract',
  'payment',
  'project',
  'remaining',
]

function hasPassedInquiry(contractStatus: ContractStatus) {
  return contractStatus !== 'Not Started'
}

function getProjectWorkBadge(
  projectStatus: ProjectStatus,
  projectStarted: boolean
): { status: ProjectStatus; label?: string } {
  if (projectStarted || projectStatus === 'In Progress') {
    return { status: 'In Progress' }
  }
  if (projectStatus === 'Completed') return { status: 'Completed' }
  if (projectStatus === 'Follow-Up Needed') return { status: 'Follow-Up Needed' }
  return { status: 'Inquiry', label: 'Not Started' }
}

function isDepositPaid(paymentStatus?: PaymentStatus) {
  return (
    paymentStatus === 'Deposit Paid' ||
    paymentStatus === 'Paid' ||
    paymentStatus === 'Partial'
  )
}

function resolveCurrentStage(
  projectStatus: ProjectStatus,
  contractStatus: ContractStatus,
  paymentStatus: PaymentStatus | undefined,
  hasRemaining: boolean,
  projectStarted: boolean
): OverviewStage | null {
  if (projectStatus === 'In Progress' || projectStatus === 'Completed' || projectStarted) {
    return 'project'
  }

  const depositPaid = isDepositPaid(paymentStatus)

  if (
    contractStatus !== 'Signed' &&
    contractStatus !== 'Completed' &&
    contractStatus !== 'Cancelled'
  ) {
    return 'contract'
  }

  if (!depositPaid && paymentStatus) return 'payment'

  if (hasRemaining && depositPaid && !projectStarted) return 'remaining'

  if (hasRemaining && depositPaid) return 'project'

  return depositPaid ? 'project' : 'payment'
}

function isStageCompleted(stage: OverviewStage, currentStage: OverviewStage | null) {
  if (!currentStage) return false
  const stageIdx = STAGE_ORDER.indexOf(stage)
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  return stageIdx >= 0 && currentIdx >= 0 && stageIdx < currentIdx
}

function completedCardClass(completed: boolean, highlighted: boolean) {
  if (highlighted) {
    return 'border-2 border-accent bg-accent-light/40 shadow-[0_0_0_1px_var(--accent),0_0_18px_rgba(109,46,58,0.28)]'
  }
  if (completed) {
    return 'border border-ink/25 bg-ink/5'
  }
  return 'border border-line/80 bg-surface-paper/60'
}

interface StatusGroupProps {
  label: string
  type: 'project' | 'contract' | 'payment'
  status: ProjectStatus | ContractStatus | PaymentStatus
  badgeLabel?: string
  highlighted?: boolean
  completed?: boolean
}

function StatusGroup({
  label,
  type,
  status,
  badgeLabel,
  highlighted,
  completed,
}: StatusGroupProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-shadow',
        completedCardClass(Boolean(completed), Boolean(highlighted))
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
      <StatusBadge
        type={type}
        status={status}
        label={badgeLabel}
        highlighted={highlighted}
        completed={completed}
      />
    </div>
  )
}

interface RemainingBalanceGroupProps {
  amount: number
  currency: string
  dueDate?: string
  highlighted?: boolean
  completed?: boolean
}

function RemainingBalanceGroup({
  amount,
  currency,
  dueDate,
  highlighted,
  completed,
}: RemainingBalanceGroupProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-shadow',
        completedCardClass(Boolean(completed), Boolean(highlighted))
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-caps text-ink-faint">
        Final Payment
      </span>
      {highlighted && (
        <span className="text-[9px] font-bold uppercase tracking-caps text-accent">
          Current stage
        </span>
      )}
      <span
        className={cn(
          'status-badge inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2 py-0.5 text-[10px] font-bold',
          highlighted
            ? 'border-accent bg-accent text-white shadow-[0_0_0_2px_var(--accent-light),0_0_10px_rgba(109,46,58,0.35)] ring-2 ring-accent ring-offset-1 ring-offset-transparent'
            : completed
              ? 'border-ink bg-ink text-surface-paper'
              : 'border-accent text-accent bg-transparent'
        )}
      >
        ${amount.toFixed(2)} {currency}
      </span>
      <span className="text-[9px] text-ink-muted">
        {dueDate ? `Expected by ${formatDate(dueDate)}` : 'Due at project completion'}
      </span>
    </div>
  )
}

export function ContractStatusProgress({ status }: { status: ContractStatus }) {
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
  remainingBalance?: Pick<PortalInvoice, 'amount' | 'currency' | 'dueDate'> | null
  projectStarted?: boolean
  mode?: 'admin' | 'portal'
  showProgress?: boolean
  className?: string
}

export function ClientStatusOverview({
  projectStatus,
  contractStatus,
  paymentStatus,
  remainingBalance,
  projectStarted = false,
  mode = 'admin',
  showProgress = true,
  className,
}: ClientStatusOverviewProps) {
  const hasRemaining = Boolean(remainingBalance?.amount)
  const currentStage = resolveCurrentStage(
    projectStatus,
    contractStatus,
    paymentStatus,
    hasRemaining,
    projectStarted
  )
  const displayPaymentStatus = paymentStatus ?? 'Unpaid'
  const projectWork = getProjectWorkBadge(projectStatus, projectStarted)
  const inquiryCompleted =
    hasPassedInquiry(contractStatus) || isStageCompleted('inquiry', currentStage)

  const statusBoxes = (
    <>
      <StatusGroup
        label="Inquiry"
        type="project"
        status="Inquiry"
        highlighted={currentStage === 'inquiry'}
        completed={inquiryCompleted}
      />
      <StatusGroup
        label="Contract"
        type="contract"
        status={contractStatus}
        highlighted={currentStage === 'contract'}
        completed={isStageCompleted('contract', currentStage)}
      />
      <StatusGroup
        label={mode === 'portal' ? 'Deposit' : 'Payment'}
        type="payment"
        status={displayPaymentStatus}
        highlighted={currentStage === 'payment'}
        completed={isStageCompleted('payment', currentStage)}
      />
      <StatusGroup
        label="Project"
        type="project"
        status={projectWork.status}
        badgeLabel={projectWork.label}
        highlighted={currentStage === 'project'}
        completed={isStageCompleted('project', currentStage)}
      />
      {hasRemaining && remainingBalance && (
        <RemainingBalanceGroup
          amount={remainingBalance.amount}
          currency={remainingBalance.currency}
          dueDate={remainingBalance.dueDate}
          highlighted={currentStage === 'remaining'}
          completed={isStageCompleted('remaining', currentStage)}
        />
      )}
    </>
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">{statusBoxes}</div>
      {showProgress && <ContractStatusProgress status={contractStatus} />}
    </div>
  )
}
