import { isSampleClientEmail } from '@/data/sampleClients'
import { migrateServiceTier } from '@/lib/serviceTiers'
import type { Client, ContractData, ContractStatus, Note, ProjectStatus, ServiceTier } from '@/types'

const SIGNED_CONTRACT_STATUSES = ['Signed', 'Completed'] as const
const CONTRACT_STATUSES_NEEDING_RESET = [
  'Generated',
  'Sent',
  'Signed',
  'Completed',
] as const

export function getClientServiceTier(
  client: Client,
  contract?: ContractData
): ServiceTier {
  return migrateServiceTier(client.serviceTier ?? contract?.serviceTier)
}

export interface ServiceTierChangeResult {
  clientUpdates: Partial<Client>
  contract?: ContractData
  note?: Omit<Note, 'id' | 'createdAt'>
  requiresResend: boolean
  previousTier: ServiceTier
}

export function buildServiceTierChangeResult(
  client: Client,
  contract: ContractData | undefined,
  newTier: ServiceTier
): ServiceTierChangeResult | null {
  const previousTier = getClientServiceTier(client, contract)
  if (previousTier === newTier) return null

  const clientUpdates: Partial<Client> = { serviceTier: newTier }
  const contractWasInProgress =
    contract &&
    (contract.pdfGenerated ||
      CONTRACT_STATUSES_NEEDING_RESET.includes(
        client.contractStatus as (typeof CONTRACT_STATUSES_NEEDING_RESET)[number]
      ))

  if (!contractWasInProgress) {
    return {
      clientUpdates,
      contract: contract ? { ...contract, serviceTier: newTier } : undefined,
      requiresResend: false,
      previousTier,
    }
  }

  clientUpdates.contractStatus = 'Draft in Progress'
  if (
    client.projectStatus === 'Contract Signed' ||
    client.projectStatus === 'Completed'
  ) {
    clientUpdates.projectStatus = 'Contract Sent'
  }

  if (client.isOfficialClient) {
    clientUpdates.isOfficialClient = false
    clientUpdates.officialClientSince = undefined
  }

  const updatedContract: ContractData = {
    ...contract!,
    serviceTier: newTier,
    pdfGenerated: false,
    sentAt: undefined,
    viewedAt: undefined,
    signedAt: undefined,
    confirmedByClient: false,
    clientSignature: undefined,
    clientSignDate: undefined,
  }

  return {
    clientUpdates,
    contract: updatedContract,
    note: {
      text: `Service tier changed from ${previousTier} to ${newTier}. Revise the contract and resend it to the client.`,
      category: 'Contract',
    },
    requiresResend: true,
    previousTier,
  }
}

export function isPendingClient(client: Client): boolean {
  return !client.isOfficialClient
}

function isProjectComplete(client: Client): boolean {
  return Boolean(client.projectCompletedAt)
}

function inferSignedFromContractRecord(
  client: Client,
  contract?: ContractData
): boolean {
  if (client.timelineStepSkips?.contract_signed) return true

  if (contract?.signedAt && contract.confirmedByClient) {
    if (
      contract.sentAt &&
      new Date(contract.signedAt).getTime() < new Date(contract.sentAt).getTime()
    ) {
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

  return false
}

function isStoredContractSigned(client: Client): boolean {
  return client.contractStatus === 'Signed' || client.contractStatus === 'Completed'
}

export function isContractSigned(client: Client, contract?: ContractData): boolean {
  const status = getDisplayContractStatus(client, contract)
  return status === 'Signed' || status === 'Completed'
}

/** Contract status for UI when client.contractStatus lags behind the signed contract record */
export function getDisplayContractStatus(
  client: Client,
  contract?: ContractData
): ContractStatus {
  if (client.contractStatus === 'Cancelled') return 'Cancelled'

  const signed =
    isStoredContractSigned(client) || inferSignedFromContractRecord(client, contract)

  if (signed) {
    return isProjectComplete(client) ? 'Completed' : 'Signed'
  }

  return client.contractStatus
}

export function getContractActionLabel(status: ContractStatus): string {
  if (status === 'Not Started') return 'Start Contract'
  if (SIGNED_CONTRACT_STATUSES.includes(status as (typeof SIGNED_CONTRACT_STATUSES)[number])) {
    return 'Revise Contract'
  }
  return 'View / Edit Contract'
}

export function canViewClientContract(
  contract: ContractData | undefined,
  status: ContractStatus
): boolean {
  return Boolean(contract) && status !== 'Not Started' && status !== 'Cancelled'
}

export function hasPaymentLinkClicked(client: Client): boolean {
  return (
    client.paymentStatus === 'Pay Link Clicked' ||
    client.paymentStatus === 'Deposit Paid' ||
    client.paymentStatus === 'Paid' ||
    Boolean(client.invoice?.paymentLinkClickedAt) ||
    Boolean(client.timelineStepSkips?.pay_link_clicked)
  )
}

export function canStartProject(client: Client): boolean {
  return (
    isContractSigned(client) &&
    hasPaymentLinkClicked(client) &&
    !client.projectStartedAt
  )
}

/** Dashboard project-status column label */
export function getDashboardProjectStatusLabel(status: ProjectStatus): string | undefined {
  if (status === 'In Progress') return 'Progress: file sharing'
  return undefined
}

export function isProjectActive(client: Client): boolean {
  return Boolean(
    client.projectStartedAt ||
      client.projectStatus === 'In Progress' ||
      client.timelineStepSkips?.project_started
  )
}

export function countOfficialClients(clients: Client[]): number {
  return clients.filter((c) => c.isOfficialClient).length
}

export function countPendingClients(clients: Client[]): number {
  return clients.filter((c) => isPendingClient(c)).length
}

export function canMarkOfficialClient(client: Client): boolean {
  return SIGNED_CONTRACT_STATUSES.includes(
    client.contractStatus as (typeof SIGNED_CONTRACT_STATUSES)[number]
  )
}

/** Parse "$5,000" or "5000" into a number */
export function parseMoney(value?: string): number | null {
  if (!value?.trim()) return null
  const cleaned = value.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function getRemainingBalanceAmount(contract: ContractData | undefined): number | null {
  if (!contract) return null
  let amount = parseMoney(contract.remainingBalance)
  if (!amount) {
    const total = parseMoney(contract.totalCost)
    const deposit = parseMoney(contract.depositAmount)
    if (total && deposit && total > deposit) {
      amount = Math.round((total - deposit) * 100) / 100
    }
  }
  return amount
}

export function hasRemainingBalanceDue(contract: ContractData | undefined): boolean {
  if (!contract) return false
  const amount = getRemainingBalanceAmount(contract)
  if (!amount) return false
  const total = parseMoney(contract.totalCost)
  const deposit = parseMoney(contract.depositAmount)
  const hasSplitPayment = Boolean(total && deposit && total > deposit)
  return hasSplitPayment || Boolean(contract.remainingBalance?.trim())
}

export function isDepositInvoicePaid(client: Client): boolean {
  return Boolean(
    client.invoice?.paidAt ||
    client.depositPaymentConfirmedAt ||
    client.paymentStatus === 'Deposit Paid' ||
    client.paymentStatus === 'Paid'
  )
}

export function getClientAmountPaid(
  client: Client,
  contract?: ContractData
): { amount: number; currency: string } | null {
  const currency = client.invoice?.currency ?? client.finalInvoice?.currency ?? 'USD'

  if (client.finalInvoice?.paidAt) {
    const deposit =
      client.invoice?.amount ?? parseMoney(contract?.depositAmount) ?? 0
    return { amount: deposit + client.finalInvoice.amount, currency }
  }

  if (isDepositInvoicePaid(client)) {
    const amount = client.invoice?.amount ?? parseMoney(contract?.depositAmount)
    if (amount != null) return { amount, currency }
  }

  return null
}

export function suggestedInvoiceFromContract(
  contract: ContractData | undefined,
  client: Client
): { amount: number; description: string } | null {
  if (!contract) return null
  const amount =
    parseMoney(contract.depositAmount) ??
    parseMoney(contract.remainingBalance) ??
    parseMoney(contract.totalCost)
  if (!amount) return null
  return {
    amount,
    description: `${client.projectName} — ${contract.projectTitle}`,
  }
}

export function normalizeClient(raw: Partial<Client> & { id: string }): Client {
  return {
    name: '',
    businessName: '',
    email: '',
    phone: '',
    projectType: 'Website Design',
    projectName: '',
    projectStatus: 'Inquiry',
    contractStatus: 'Not Started',
    paymentStatus: 'Unpaid',
    createdAt: new Date().toISOString(),
    ...raw,
    id: raw.id,
    isOfficialClient: raw.isOfficialClient ?? false,
    isSampleClient:
      raw.isSampleClient ?? (raw.email ? isSampleClientEmail(raw.email) : false),
    notes: raw.notes ?? [],
    deadlines: raw.deadlines ?? [],
    serviceTier: migrateServiceTier(raw.serviceTier),
  } as Client
}

export function paymentStatusAfterCapture(
  current: Client['paymentStatus'],
  invoiceAmount: number,
  contract?: ContractData
): Client['paymentStatus'] {
  const total = contract ? parseMoney(contract.totalCost) : null
  const deposit = contract ? parseMoney(contract.depositAmount) : null
  if (total && invoiceAmount >= total) return 'Paid'
  if (deposit && invoiceAmount >= deposit) return 'Deposit Paid'
  if (current === 'Unpaid') return 'Partial'
  return current === 'Overdue' ? 'Partial' : current
}
