import { generateId } from './notifications.js'
import { buildDepositInvoice } from './invoice.js'
import { ensureDepositInvoiceRecord } from './portalPayments.js'
import { promoteToOfficialClient } from './clientWorkflow.js'
import { isSignatureStale } from './contractReview.js'
import { TIMELINE_STEP_ORDER } from './timelineSteps.js'

function isContractSigned(contract) {
  return Boolean(contract?.signedAt && contract?.confirmedByClient && !isSignatureStale(contract))
}

const PORTAL_SKIP_DETAIL = 'Advanced by your designer'

function stepAlreadyReal(stepId, client, contract) {
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
      return false
    case 'project_completed':
      return Boolean(client.projectCompletedAt)
    default:
      return false
  }
}

function applyContractSent(contract, client, now) {
  if (!contract) return { contract, client }
  const nextContract = contract.sentAt
    ? contract
    : {
        ...contract,
        sentAt: now,
      }
  const nextClient =
    client.contractStatus === 'Sent' || client.contractStatus === 'Signed'
      ? client
      : {
          ...client,
          contractStatus: 'Sent',
          projectStatus:
            client.projectStatus === 'Inquiry' ? 'Contract Sent' : client.projectStatus,
        }
  return { contract: nextContract, client: nextClient }
}

function applyContractSigned(contract, client, now) {
  if (!contract) return { contract, client }
  let nextContract = contract
  if (!contract.signedAt) {
    nextContract = {
      ...contract,
      signedAt: now,
      confirmedByClient: true,
      clientSignature: contract.clientSignature || 'Admin timeline skip',
      clientSignDate: now.slice(0, 10),
    }
  }

  let nextClient = { ...client }
  if (!client.isOfficialClient) {
    nextClient = {
      ...nextClient,
      isOfficialClient: true,
      officialClientSince: client.officialClientSince ?? now,
      contractStatus: 'Signed',
      projectStatus: 'Contract Signed',
    }
  }

  if (!nextClient.invoice && contract) {
    const invoiceDraft = buildDepositInvoice(contract, nextClient)
    if (invoiceDraft) {
      nextClient = {
        ...nextClient,
        invoice: {
          description: invoiceDraft.description,
          amount: invoiceDraft.amount,
          currency: invoiceDraft.currency,
          invoiceType: 'deposit',
          createdAt: now,
        },
      }
    }
  }

  return { contract: nextContract, client: nextClient }
}

function applyInvoiceSent(client, contract, now) {
  const invoice = ensureDepositInvoiceRecord(client, contract, now)
  if (!invoice) return client
  if (invoice.sentToPortalAt) return { ...client, invoice }
  return {
    ...client,
    invoice: {
      ...invoice,
      sentToPortalAt: now,
    },
  }
}

function applyPayLinkClicked(client, now) {
  if (client.invoice?.paymentLinkClickedAt) return client
  if (!client.invoice) {
    return {
      ...client,
      paymentStatus: 'Pay Link Clicked',
    }
  }
  return {
    ...client,
    paymentStatus: 'Pay Link Clicked',
    invoice: {
      ...client.invoice,
      paymentLinkClickedAt: now,
    },
  }
}

function applyPaymentConfirmed(client, contract, now) {
  if (client.depositPaymentConfirmedAt || client.invoice?.paidAt) return client
  let invoice = client.invoice ?? ensureDepositInvoiceRecord(client, contract, now)
  if (invoice) {
    invoice = {
      ...invoice,
      paidAt: now,
      sentToPortalAt: invoice.sentToPortalAt ?? now,
    }
  }
  return {
    ...client,
    paymentStatus: 'Deposit Paid',
    depositPaymentConfirmedAt: now,
    ...(invoice ? { invoice } : {}),
  }
}

function applyProjectStarted(client, now) {
  if (client.projectStartedAt) {
    return promoteToOfficialClient(client, now)
  }
  return promoteToOfficialClient(
    {
      ...client,
      projectStatus: 'In Progress',
      projectStartedAt: now,
      notes: [
        ...(client.notes ?? []),
        {
          id: generateId(),
          text: `Project started on ${new Date(now).toLocaleDateString()}. Client portal file sharing is now active.`,
          category: 'Project',
          createdAt: now,
        },
      ],
    },
    now
  )
}

export function applyStepSkipEffect(stepId, client, contract, now) {
  if (stepAlreadyReal(stepId, client, contract)) {
    return { client, contract }
  }

  switch (stepId) {
    case 'contract_sent':
      return applyContractSent(contract, client, now)
    case 'contract_signed':
      return applyContractSigned(contract, client, now)
    case 'invoice_sent':
      return { client: applyInvoiceSent(client, contract, now), contract }
    case 'pay_link_clicked':
      return { client: applyPayLinkClicked(client, now), contract }
    case 'payment_confirmed':
      return { client: applyPaymentConfirmed(client, contract, now), contract }
    case 'project_started':
      return { client: applyProjectStarted(client, now), contract }
    case 'file_activity':
      return { client, contract }
    case 'project_completed':
      return {
        client: {
          ...client,
          projectStatus: 'Completed',
          projectCompletedAt: client.projectCompletedAt ?? now,
        },
        contract,
      }
    default:
      return { client, contract }
  }
}

/** Apply real workflow side effects for skipped / reached timeline steps */
export function collectStepsNeedingEffects(skippedStepIds, targetStepId, client, contract) {
  const steps = new Set(skippedStepIds)

  const targetIdx = TIMELINE_STEP_ORDER.indexOf(targetStepId)
  const projectStartedIdx = TIMELINE_STEP_ORDER.indexOf('project_started')

  if (
    targetIdx >= projectStartedIdx &&
    !steps.has('project_started') &&
    !client.projectStartedAt
  ) {
    steps.add('project_started')
  }

  if (
    (targetStepId === 'project_completed' || steps.has('project_completed')) &&
    !client.projectCompletedAt
  ) {
    steps.add('project_completed')
  }

  return TIMELINE_STEP_ORDER.filter((id) => steps.has(id) && !stepAlreadyReal(id, client, contract))
}

export function applyTimelineSkipEffects(client, contract, skippedStepIds, targetStepId, now) {
  const ordered = collectStepsNeedingEffects(skippedStepIds, targetStepId, client, contract)
  let nextClient = client
  let nextContract = contract

  for (const stepId of ordered) {
    const result = applyStepSkipEffect(stepId, nextClient, nextContract, now)
    nextClient = result.client
    nextContract = result.contract
  }

  return { client: nextClient, contract: nextContract }
}

export { PORTAL_SKIP_DETAIL }
