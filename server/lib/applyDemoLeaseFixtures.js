/**
 * Apply canonical Demo Mode lease dates + payment histories to the store.
 * Idempotent for already-fixture clients (does not reset live demo payments),
 * but always re-syncs contract/official status so drifted stores are repaired.
 */
import { generateId } from './notifications.js'
import {
  applyDemoScenarioToClient,
  applyDemoScenarioToContract,
  resolveDemoScenario,
  scenarioLeaseDates,
} from './demoLeaseFixtures.js'
import { createDraftContract } from './contractDraft.js'

function withSignedFlags(contract, client, leaseStartDate) {
  const now = contract.createdAt || new Date().toISOString()
  if (client.contractStatus === 'Signed' || client.contractStatus === 'Completed') {
    return {
      ...contract,
      sentAt: contract.sentAt ?? now,
      signedAt: contract.signedAt ?? now,
      confirmedByClient: true,
      clientSignature: contract.clientSignature || client.name,
      clientSignDate: contract.clientSignDate || leaseStartDate,
      isPlaceholderDraft: false,
    }
  }
  if (client.contractStatus === 'Sent') {
    return {
      ...contract,
      sentAt: contract.sentAt ?? now,
      signedAt: undefined,
      confirmedByClient: false,
      isPlaceholderDraft: false,
    }
  }
  return contract
}

export function applyDemoLeaseFixturesToStore(store) {
  let clients = [...(store.clients ?? [])]
  let contracts = [...(store.contracts ?? [])]
  let changed = false

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const scenario = resolveDemoScenario(client.email)
    if (!scenario) continue

    const { leaseStartDate, leaseEndDate } = scenarioLeaseDates(scenario)
    const alreadyFixture =
      client.demoLeaseFixture === true &&
      client.demoLeaseStartDate === leaseStartDate &&
      client.leaseLengthMonths === scenario.leaseMonths

    let appliedClient = client
    const synced = applyDemoScenarioToClient(client, scenario, generateId)

    if (!alreadyFixture) {
      clients[i] = synced
      appliedClient = synced
      changed = true
    } else if (
      synced.isOfficialClient !== client.isOfficialClient ||
      synced.officialClientSince !== client.officialClientSince ||
      synced.contractStatus !== client.contractStatus ||
      synced.projectStatus !== client.projectStatus ||
      synced.paymentStatus !== client.paymentStatus ||
      synced.currentPeriodAmountPaid !== client.currentPeriodAmountPaid
    ) {
      // Repair drifted status without wiping live payment deadline edits
      clients[i] = {
        ...client,
        isOfficialClient: synced.isOfficialClient,
        officialClientSince: synced.officialClientSince,
        contractStatus: synced.contractStatus,
        projectStatus: synced.projectStatus,
        paymentStatus: synced.paymentStatus,
        leaseLengthMonths: synced.leaseLengthMonths,
        ...(synced.currentPeriodAmountPaid != null
          ? { currentPeriodAmountPaid: synced.currentPeriodAmountPaid }
          : {}),
      }
      appliedClient = clients[i]
      changed = true
    }

    const existing = contracts.find((c) => c.clientId === appliedClient.id)

    if (existing) {
      let nextContract = withSignedFlags(
        applyDemoScenarioToContract(existing, appliedClient, scenario),
        appliedClient,
        leaseStartDate
      )
      if (
        nextContract.startDate !== existing.startDate ||
        nextContract.completionDate !== existing.completionDate ||
        nextContract.totalCost !== existing.totalCost ||
        nextContract.depositAmount !== existing.depositAmount ||
        nextContract.remainingBalance !== existing.remainingBalance ||
        nextContract.paymentProvider !== existing.paymentProvider ||
        nextContract.paymentMethods !== existing.paymentMethods ||
        nextContract.sentAt !== existing.sentAt ||
        nextContract.signedAt !== existing.signedAt ||
        nextContract.confirmedByClient !== existing.confirmedByClient ||
        nextContract.isPlaceholderDraft !== existing.isPlaceholderDraft
      ) {
        contracts = contracts.map((c) => (c.id === nextContract.id ? nextContract : c))
        changed = true
      }
    } else if (
      appliedClient.contractStatus === 'Sent' ||
      appliedClient.contractStatus === 'Signed' ||
      appliedClient.projectStatus === 'In Progress' ||
      appliedClient.projectStatus === 'Contract Sent' ||
      appliedClient.projectStatus === 'Contract Signed'
    ) {
      let contract = createDraftContract(appliedClient, store.settings, {
        startDate: leaseStartDate,
        completionDate: leaseEndDate,
        paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
      })
      contract = withSignedFlags(
        applyDemoScenarioToContract(
          {
            ...contract,
            clientAddress: appliedClient.projectName,
            isPlaceholderDraft: false,
          },
          appliedClient,
          scenario
        ),
        appliedClient,
        leaseStartDate
      )
      contracts = [...contracts, contract]
      changed = true
    }
  }

  return {
    store: { ...store, clients, contracts },
    changed,
  }
}

/** Force-refresh fixture payment histories (reseed / public demo prepare). */
export function forceApplyDemoLeaseFixturesToStore(store) {
  let clients = [...(store.clients ?? [])]
  let contracts = [...(store.contracts ?? [])]

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const scenario = resolveDemoScenario(client.email)
    if (!scenario) continue
    // Clear fixture flag so apply rewrites payment deadlines
    clients[i] = { ...client, demoLeaseFixture: false, demoLeaseStartDate: undefined }
  }

  return applyDemoLeaseFixturesToStore({ ...store, clients, contracts })
}
