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

/** Active projects are official clients — pending badge becomes client */
export function promoteToOfficialClient(client, now = new Date().toISOString()) {
  if (!client || client.isOfficialClient) return client
  return {
    ...client,
    isOfficialClient: true,
    officialClientSince: client.officialClientSince ?? now,
  }
}

export function ensureOfficialWhenProjectActive(client, now = new Date().toISOString()) {
  if (!isProjectActive(client)) return client
  return promoteToOfficialClient(client, now)
}
