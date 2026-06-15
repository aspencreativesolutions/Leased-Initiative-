import { isProjectActive } from '@/lib/clientUtils'
import { TIMELINE_STEP_ORDER, TIMELINE_STEP_LABELS } from '@/lib/timelineSteps'
import type { Client, ContractData, ProjectTimelineStep } from '@/types'

function getSkippedAt(client: Client, stepId: string) {
  return client.timelineStepSkips?.[stepId]?.skippedAt
}

function isContractSigned(contract?: ContractData) {
  if (!contract?.signedAt || !contract.confirmedByClient) return false
  if (contract.sentAt && new Date(contract.signedAt).getTime() < new Date(contract.sentAt).getTime()) {
    return false
  }
  if (
    contract.contentUpdatedAt &&
    new Date(contract.signedAt).getTime() < new Date(contract.contentUpdatedAt).getTime()
  ) {
    return false
  }
  return true
}

function isRealStepComplete(stepId: string, client: Client, contract?: ContractData): boolean {
  switch (stepId) {
    case 'contract_sent':
      return Boolean(contract?.sentAt)
    case 'contract_signed':
      return isContractSigned(contract)
    case 'invoice_sent':
      return Boolean(client.invoice?.sentToPortalAt)
    case 'pay_link_clicked':
      return Boolean(client.invoice?.paymentLinkClickedAt || getSkippedAt(client, stepId))
    case 'payment_confirmed':
      return Boolean(client.depositPaymentConfirmedAt || client.invoice?.paidAt)
    case 'project_started':
      return isProjectActive(client)
    case 'file_activity':
      return Boolean(client.projectCompletedAt)
    case 'project_completed':
      return Boolean(client.projectCompletedAt)
    default:
      return false
  }
}

function isContractTimelineStep(stepId: string) {
  return stepId === 'contract_sent' || stepId === 'contract_signed'
}

function isStepFulfilled(stepId: string, client: Client, contract?: ContractData) {
  if (isProjectActive(client) && isContractTimelineStep(stepId)) return true
  return isRealStepComplete(stepId, client, contract) || Boolean(getSkippedAt(client, stepId))
}

function hasLaterFulfilledProgress(
  stepIndex: number,
  client: Client,
  contract?: ContractData
): boolean {
  for (let i = stepIndex + 1; i < TIMELINE_STEP_ORDER.length; i++) {
    if (isStepFulfilled(TIMELINE_STEP_ORDER[i], client, contract)) {
      return true
    }
  }
  return false
}

/** Lightweight client-side timeline for dashboard cards (matches server order and stages). */
export function buildClientTimelinePreview(
  client: Client,
  contract?: ContractData
): ProjectTimelineStep[] {
  const steps: ProjectTimelineStep[] = []
  let priorDone = true
  let activeAssigned = false

  for (let stepIndex = 0; stepIndex < TIMELINE_STEP_ORDER.length; stepIndex++) {
    const stepId = TIMELINE_STEP_ORDER[stepIndex]
    const skippedAt = getSkippedAt(client, stepId)
    const realComplete = isRealStepComplete(stepId, client, contract)
    const fulfilled = isStepFulfilled(stepId, client, contract)
    const impliedByLater = !fulfilled && hasLaterFulfilledProgress(stepIndex, client, contract)

    let status: ProjectTimelineStep['status']
    let skipped = false

    if (fulfilled || impliedByLater) {
      status = 'completed'
      skipped = Boolean(skippedAt && !realComplete)
      priorDone = true
    } else if (priorDone && !activeAssigned) {
      status = 'active'
      activeAssigned = true
      priorDone = false
    } else {
      status = 'pending'
      priorDone = false
    }

    steps.push({
      id: stepId,
      label: TIMELINE_STEP_LABELS[stepId],
      status,
      skipped: skipped || undefined,
    })
  }

  return steps
}
