import { Check } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { ContractStatus, PaymentStatus, PortalInvoice, ProjectStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'

const CONTRACT_PROGRESS_STEPS = [
  { id: 'drafted', label: 'Drafted' },
  { id: 'generated', label: 'Generated' },
  { id: 'sent', label: 'Sent' },
  { id: 'viewed', label: 'Viewed' },
  { id: 'signed', label: 'Signed' },
] as const

const MOBILE_STEP_LABELS: Record<(typeof CONTRACT_PROGRESS_STEPS)[number]['id'], string> = {
  drafted: 'Draft',
  generated: 'Gen',
  sent: 'Sent',
  viewed: 'View',
  signed: 'Sign',
}

function resolveContractProgressIndex(
  status: ContractStatus,
  viewedAt?: string,
  projectStarted = false
): number {
  if (projectStarted || status === 'Signed' || status === 'Completed') {
    return CONTRACT_PROGRESS_STEPS.length
  }
  if (status === 'Sent' && viewedAt) return 3
  switch (status) {
    case 'Generated':
      return 1
    case 'Sent':
      return 2
    case 'Draft in Progress':
    case 'Not Started':
    default:
      return 0
  }
}

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
  if (highlighted) return 'status-card--highlight'
  if (completed) return 'status-card--done'
  return 'status-card--idle'
}

interface StatusGroupProps {
  label: string
  type: 'project' | 'contract' | 'payment'
  status: ProjectStatus | ContractStatus | PaymentStatus
  badgeLabel?: string
  highlighted?: boolean
  completed?: boolean
}

function StatusBoxCorner({
  highlighted,
  completed,
}: {
  highlighted?: boolean
  completed?: boolean
}) {
  if (highlighted) {
    return (
      <span className="shrink-0 text-[8px] font-bold uppercase leading-none tracking-caps text-accent sm:text-[9px]">
        Current stage
      </span>
    )
  }

  if (completed) {
    return (
      <Check
        className="step-complete-mark h-3.5 w-3.5 shrink-0"
        strokeWidth={2.75}
        aria-label="Completed"
      />
    )
  }

  return null
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
        'flex flex-col gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 transition-shadow sm:gap-1.5 sm:px-2.5 sm:py-2',
        completedCardClass(Boolean(completed), Boolean(highlighted))
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[8px] font-semibold uppercase tracking-caps text-ink-faint sm:text-[9px]">
          {label}
        </span>
        <StatusBoxCorner highlighted={highlighted} completed={completed} />
      </div>
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
        'flex flex-col gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 transition-shadow sm:gap-1.5 sm:px-2.5 sm:py-2',
        completedCardClass(Boolean(completed), Boolean(highlighted))
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[8px] font-semibold uppercase tracking-caps text-ink-faint sm:text-[9px]">
          Final Payment
        </span>
        <StatusBoxCorner highlighted={highlighted} completed={completed} />
      </div>
      <span
        className={cn(
          'status-badge inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-2 py-0.5 text-[10px] font-bold',
          highlighted
            ? 'border-accent bg-accent text-white shadow-[0_0_0_2px_var(--accent-light),var(--status-highlight-glow)] ring-2 ring-accent ring-offset-1 ring-offset-transparent'
            : completed
              ? 'status-solid'
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

export function ContractStatusProgress({
  status,
  projectStarted = false,
  viewedAt,
}: {
  status: ContractStatus
  projectStarted?: boolean
  viewedAt?: string
}) {
  if (status === 'Cancelled') {
    return (
      <div className="paper-box-inset border-dashed border-accent bg-accent-light/30 px-3 py-2">
        <p className="label-caps text-accent">Contract progress</p>
        <p className="mt-1 text-xs font-semibold text-accent">Cancelled</p>
      </div>
    )
  }

  const currentIndex = resolveContractProgressIndex(status, viewedAt, projectStarted)
  const allComplete = currentIndex >= CONTRACT_PROGRESS_STEPS.length

  const renderStep = (
    step: (typeof CONTRACT_PROGRESS_STEPS)[number],
    i: number,
    variant: 'mobile' | 'desktop'
  ) => {
    const isCurrent = !allComplete && i === currentIndex
    const isPast = allComplete || i < currentIndex

    return (
      <div
        key={step.id}
        className={cn(
          'inline-flex items-center justify-center gap-0.5 rounded-[var(--radius-sm)] border-[length:var(--border-width)] font-bold uppercase transition-shadow',
          variant === 'mobile'
            ? 'min-w-0 px-0.5 py-1 text-[7px] leading-none tracking-tight'
            : 'gap-1 px-2 py-1 text-[9px] tracking-caps',
          isCurrent &&
            'border-accent bg-accent text-white shadow-[0_0_0_2px_var(--accent-light),var(--status-highlight-glow)]',
          isPast && 'contract-step--past',
          !isCurrent && !isPast && 'contract-step--idle border-line text-ink-faint'
        )}
        title={step.label}
      >
        {isPast && (
          <Check
            className={cn('step-complete-mark shrink-0', variant === 'mobile' ? 'h-2.5 w-2.5' : 'h-3 w-3')}
            strokeWidth={2.75}
            aria-hidden
          />
        )}
        <span className={variant === 'mobile' ? 'truncate' : undefined}>
          {variant === 'mobile' ? MOBILE_STEP_LABELS[step.id] : step.label}
        </span>
      </div>
    )
  }

  return (
    <div className="paper-box-inset px-3 py-3">
      <p className="label-caps mb-2.5">Contract progress</p>
      <div
        className="grid grid-cols-5 gap-0.5 sm:hidden"
        role="list"
        aria-label="Contract progress"
      >
        {CONTRACT_PROGRESS_STEPS.map((step, i) => (
          <div key={step.id} className="min-w-0" role="listitem">
            {renderStep(step, i, 'mobile')}
          </div>
        ))}
      </div>
      <div className="hidden items-center gap-1 sm:flex">
        {CONTRACT_PROGRESS_STEPS.map((step, i) => {
          const isPast = allComplete || i < currentIndex

          return (
            <div key={step.id} className="flex items-center gap-1">
              {renderStep(step, i, 'desktop')}
              {i < CONTRACT_PROGRESS_STEPS.length - 1 && (
                <span
                  className={cn(
                    'h-px w-3',
                    isPast ? 'timeline-connector--complete' : 'bg-line'
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
    <div className={cn('space-y-2 sm:space-y-3', className)}>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-stretch sm:gap-2 md:gap-3">{statusBoxes}</div>
      {showProgress && (
        <ContractStatusProgress status={contractStatus} projectStarted={projectStarted} />
      )}
    </div>
  )
}
