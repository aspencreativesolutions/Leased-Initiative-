import { useMemo } from 'react'
import { buildClientTimelinePreview } from '@/lib/buildClientTimelinePreview'
import { cn } from '@/lib/utils'
import type { Client, ContractData } from '@/types'

const MICRO_LABELS: Record<string, string> = {
  contract_sent: 'Sent',
  contract_signed: 'Signed',
  invoice_sent: 'Inv',
  payment_confirmed: 'Paid',
  project_started: 'Start',
  file_activity: 'Files',
  project_completed: 'Done',
}

const HIDDEN_DASHBOARD_STEPS = new Set(['pay_link_clicked'])

interface CompactClientTimelineProps {
  client: Client
  contract?: ContractData
}

export function CompactClientTimeline({ client, contract }: CompactClientTimelineProps) {
  const steps = useMemo(
    () => buildClientTimelinePreview(client, contract),
    [client, contract]
  )
  const visibleSteps = steps.filter((step) => !HIDDEN_DASHBOARD_STEPS.has(step.id))
  const activeStep = steps.find((step) => step.status === 'active')
  const displayActiveId =
    activeStep?.id === 'pay_link_clicked' ? 'payment_confirmed' : activeStep?.id

  const getDisplayStatus = (stepId: string, status: typeof steps[number]['status']) => {
    if (stepId === displayActiveId) return 'active'
    if (status === 'active' && stepId !== displayActiveId) return 'pending'
    return status
  }

  return (
    <div className="mt-2 min-w-0">
      <p className="label-caps mb-1 text-[8px] leading-none tracking-[0.1em] text-ink-faint">
        Timeline
      </p>
      <div
        className="grid grid-cols-7 gap-0.5"
        role="list"
        aria-label={`Project timeline — current step: ${activeStep?.label ?? 'complete'}`}
      >
        {visibleSteps.map((step) => {
          const displayStatus = getDisplayStatus(step.id, step.status)

          return (
            <div key={step.id} className="min-w-0" role="listitem">
              <span
                className={cn(
                  'flex h-4 w-full min-w-0 items-center justify-center rounded-sm border px-0.5 text-[7px] font-bold uppercase leading-none tracking-tight',
                  displayStatus === 'completed' && 'border-ink bg-ink text-surface-paper',
                  displayStatus === 'active' && 'timeline-pill--current',
                  displayStatus === 'pending' && 'border-line bg-surface text-ink-faint'
                )}
                title={step.label}
              >
                {MICRO_LABELS[step.id] ?? step.id}
              </span>
            </div>
          )
        })}
      </div>
      {activeStep && (
        <p className="mt-1 truncate text-[10px] font-semibold text-brand">{activeStep.label}</p>
      )}
    </div>
  )
}
