import { listClientFiles } from './fileUpload.js'
import { isSignatureStale } from './contractReview.js'
import { PORTAL_SKIP_DETAIL } from './timelineSkipEffects.js'
import { TIMELINE_STEP_ORDER } from './timelineSteps.js'

function isContractSigned(contract) {
  return Boolean(contract?.signedAt && contract?.confirmedByClient && !isSignatureStale(contract))
}

const PORTAL_STEP_LABELS = {
  contract_sent: 'Contract Sent',
  contract_signed: 'Contract Signed',
  invoice_sent: 'Deposit Invoice Sent',
  pay_link_clicked: 'PayPal Link Clicked',
  payment_confirmed: 'Payment Confirmed',
  project_started: 'Project Started',
  file_activity: 'File Uploads / Notes',
  project_completed: 'Project Completed',
}

function getSkippedAt(client, stepId) {
  return client.timelineStepSkips?.[stepId]?.skippedAt
}

function isRealStepComplete(stepId, client, contract, fileEvents) {
  switch (stepId) {
    case 'contract_sent':
      return Boolean(contract?.sentAt)
    case 'contract_signed':
      return isContractSigned(contract)
    case 'invoice_sent':
      return Boolean(client.invoice?.sentToPortalAt)
    case 'pay_link_clicked':
      return Boolean(client.invoice?.paymentLinkClickedAt)
    case 'payment_confirmed':
      return Boolean(client.depositPaymentConfirmedAt || client.invoice?.paidAt)
    case 'project_started':
      return Boolean(client.projectStartedAt)
    case 'file_activity':
      return fileEvents.length > 0
    case 'project_completed':
      return Boolean(client.projectCompletedAt)
    default:
      return false
  }
}

function getRealCompletedAt(stepId, client, contract, fileEvents) {
  switch (stepId) {
    case 'contract_sent':
      return contract?.sentAt
    case 'contract_signed':
      return isContractSigned(contract) ? contract?.signedAt : undefined
    case 'invoice_sent':
      return client.invoice?.sentToPortalAt
    case 'pay_link_clicked':
      return client.invoice?.paymentLinkClickedAt
    case 'payment_confirmed':
      return client.depositPaymentConfirmedAt || client.invoice?.paidAt
    case 'project_started':
      return client.projectStartedAt
    case 'file_activity':
      return fileEvents.length ? fileEvents[fileEvents.length - 1].completedAt : undefined
    case 'project_completed':
      return client.projectCompletedAt
    default:
      return undefined
  }
}

function getRealDetail(stepId, client, contract, fileEvents, audience = 'admin') {
  const portal = audience === 'portal'
  switch (stepId) {
    case 'contract_sent':
      return contract?.sentAt
        ? portal
          ? 'Your contract is ready in the portal'
          : 'Contract delivered to client portal'
        : undefined
    case 'contract_signed':
      return isContractSigned(contract)
        ? portal
          ? 'You signed your contract'
          : 'Client signed electronically'
        : undefined
    case 'invoice_sent':
      return client.invoice?.sentToPortalAt
        ? portal
          ? `Deposit invoice ($${client.invoice?.amount?.toFixed(2) ?? ''}) available`
          : `Deposit invoice $${client.invoice?.amount?.toFixed(2) ?? ''} sent to portal`
        : undefined
    case 'pay_link_clicked':
      return client.invoice?.paymentLinkClickedAt
        ? portal
          ? 'PayPal payment link opened'
          : 'Client opened PayPal checkout'
        : undefined
    case 'payment_confirmed':
      if (!client.depositPaymentConfirmedAt && !client.invoice?.paidAt) return undefined
      return portal
        ? 'Deposit payment confirmed'
        : client.depositPaymentConfirmedAt
          ? 'Deposit verified on PayPal (manual confirmation)'
          : 'Deposit payment captured via PayPal'
    case 'project_started':
      return client.projectStartedAt
        ? portal
          ? 'Your project is active — upload files anytime'
          : 'Portal file sharing unlocked'
        : undefined
    case 'file_activity':
      return fileEvents.length
        ? portal
          ? `${fileEvents.length} file or note shared`
          : `${fileEvents.length} event${fileEvents.length !== 1 ? 's' : ''} logged`
        : client.projectStartedAt
          ? portal
            ? 'Share files and notes when you are ready'
            : 'Waiting for client uploads or notes'
          : undefined
    case 'project_completed':
      return client.projectCompletedAt
        ? portal
          ? 'All deliverables complete'
          : 'All deliverables fulfilled'
        : undefined
    default:
      return undefined
  }
}

export function buildFileActivityEvents(clientId) {
  const files = listClientFiles(clientId)
  const events = []

  for (const file of files) {
    events.push({
      id: `upload-${file.id}`,
      label: 'File uploaded',
      completedAt: file.createdAt,
      detail: `${file.originalName} (${file.uploadedBy === 'client' ? 'client' : 'designer'})`,
    })
    for (const note of file.notes ?? []) {
      events.push({
        id: `note-${note.id}`,
        label: 'Note added',
        completedAt: note.createdAt,
        detail: `${file.originalName}: ${note.text.slice(0, 120)}${note.text.length > 120 ? '…' : ''}`,
      })
    }
  }

  return events.sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  )
}

export function buildProjectTimeline(client, contract, options = {}) {
  const audience = options.audience ?? 'admin'
  const fileEvents = buildFileActivityEvents(client.id)
  const steps = []
  let priorDone = true
  let activeAssigned = false

  const adminLabels = {
    contract_sent: 'Contract Sent',
    contract_signed: 'Contract Signed',
    invoice_sent: 'PayPal Invoice Link Sent',
    pay_link_clicked: 'PayPal Link Clicked',
    payment_confirmed: 'Payment Confirmed',
    project_started: 'Start Project Clicked',
    file_activity: 'File Uploads / Notes Added',
    project_completed: 'Project Completed',
  }

  let lastCompletedAt

  for (const stepId of TIMELINE_STEP_ORDER) {
    const label =
      audience === 'portal' ? PORTAL_STEP_LABELS[stepId] : adminLabels[stepId]

    const skippedAt = getSkippedAt(client, stepId)
    const realComplete = isRealStepComplete(stepId, client, contract, fileEvents)
    const completedAt = getRealCompletedAt(stepId, client, contract, fileEvents) || skippedAt

    let status
    let skipped = false

    if (realComplete || skippedAt) {
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

    const step = {
      id: stepId,
      label,
      status,
      completedAt: status === 'completed' ? completedAt : undefined,
      waitingSince: status === 'active' ? lastCompletedAt : undefined,
      detail: skipped
        ? audience === 'portal'
          ? PORTAL_SKIP_DETAIL
          : 'Skipped by admin'
        : getRealDetail(stepId, client, contract, fileEvents, audience),
      skipped: skipped || undefined,
    }

    if (stepId === 'file_activity') {
      step.subEvents = fileEvents
      if (fileEvents.length > 0) {
        step.status = 'completed'
        step.completedAt = fileEvents[fileEvents.length - 1].completedAt
        step.skipped = undefined
        step.detail = getRealDetail(stepId, client, contract, fileEvents, audience)
        priorDone = true
        if (activeAssigned && step.status === 'completed') {
          activeAssigned = false
        }
      }
    }

    if (step.status === 'completed' && step.completedAt) {
      lastCompletedAt = step.completedAt
    }

    steps.push(step)
  }

  return steps
}

export function getSkippedStepIdsForTarget(steps, targetStepId) {
  const targetIdx = steps.findIndex((s) => s.id === targetStepId)
  if (targetIdx < 0) return []

  const activeIdx = steps.findIndex((s) => s.status === 'active')
  let startIdx = activeIdx >= 0 ? activeIdx : steps.findIndex((s) => s.status === 'pending')
  if (startIdx < 0 || targetIdx <= startIdx) return []

  return steps.slice(startIdx, targetIdx).map((s) => s.id)
}
