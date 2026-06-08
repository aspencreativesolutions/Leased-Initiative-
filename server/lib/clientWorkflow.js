const SIGNED_CONTRACT_STATUSES = ['Signed', 'Completed']

export function isContractSigned(client) {
  return SIGNED_CONTRACT_STATUSES.includes(client.contractStatus)
}

export function hasPaymentLinkClicked(client) {
  return (
    client.paymentStatus === 'Pay Link Clicked' ||
    client.paymentStatus === 'Deposit Paid' ||
    client.paymentStatus === 'Paid' ||
    Boolean(client.invoice?.paymentLinkClickedAt) ||
    Boolean(client.timelineStepSkips?.pay_link_clicked)
  )
}

export function canStartProject(client) {
  return (
    isContractSigned(client) &&
    hasPaymentLinkClicked(client) &&
    !client.projectStartedAt
  )
}

export function isProjectActive(client) {
  if (!client) return false
  if (client.projectStartedAt) return true
  if (client.projectStatus === 'In Progress') return true
  if (client.timelineStepSkips?.project_started) return true
  return false
}
