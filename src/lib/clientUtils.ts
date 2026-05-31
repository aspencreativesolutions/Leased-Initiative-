import { isSampleClientEmail } from '@/data/sampleClients'
import type { Client, ContractData, Note, ServiceTier } from '@/types'

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
  return client.serviceTier ?? contract?.serviceTier ?? 'Starter'
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
    serviceTier: raw.serviceTier ?? 'Starter',
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
