/**
 * Apply canonical Demo Mode lease dates + payment histories to the store.
 * Idempotent for already-fixture clients (does not reset live demo payments).
 */
import { generateId } from './notifications.js'
import {
  applyDemoScenarioToClient,
  applyDemoScenarioToContract,
  resolveDemoScenario,
  scenarioLeaseDates,
} from './demoLeaseFixtures.js'
import { createDraftContract } from './contractDraft.js'

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
      client.demoLeaseFixture === true && client.demoLeaseStartDate === leaseStartDate

    let appliedClient = client
    if (!alreadyFixture) {
      const nextClient = applyDemoScenarioToClient(client, scenario, generateId)
      clients[i] = nextClient
      appliedClient = nextClient
      changed = true
    } else {
      // Keep official flag / term length aligned even when payment history is already applied
      const synced = applyDemoScenarioToClient(client, scenario, generateId)
      if (
        synced.isOfficialClient !== client.isOfficialClient ||
        synced.leaseLengthMonths !== client.leaseLengthMonths ||
        synced.officialClientSince !== client.officialClientSince
      ) {
        clients[i] = {
          ...client,
          isOfficialClient: synced.isOfficialClient,
          officialClientSince: synced.officialClientSince,
          leaseLengthMonths: synced.leaseLengthMonths,
        }
        appliedClient = clients[i]
        changed = true
      }
    }

    const existing = contracts.find((c) => c.clientId === appliedClient.id)

    if (existing) {
      let nextContract = applyDemoScenarioToContract(existing, appliedClient, scenario)
      if (
        (appliedClient.contractStatus === 'Sent' ||
          appliedClient.contractStatus === 'Signed') &&
        !nextContract.sentAt
      ) {
        nextContract = {
          ...nextContract,
          sentAt: nextContract.createdAt || new Date().toISOString(),
          isPlaceholderDraft: false,
        }
      }
      if (
        nextContract.startDate !== existing.startDate ||
        nextContract.completionDate !== existing.completionDate ||
        nextContract.totalCost !== existing.totalCost ||
        nextContract.depositAmount !== existing.depositAmount ||
        nextContract.remainingBalance !== existing.remainingBalance ||
        nextContract.sentAt !== existing.sentAt ||
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
      contract = applyDemoScenarioToContract(
        {
          ...contract,
          clientAddress: appliedClient.projectName,
          isPlaceholderDraft: false,
          sentAt:
            appliedClient.contractStatus === 'Sent' ||
            appliedClient.contractStatus === 'Signed'
              ? contract.createdAt
              : undefined,
          signedAt:
            appliedClient.contractStatus === 'Signed' ? contract.createdAt : undefined,
          confirmedByClient: appliedClient.contractStatus === 'Signed',
          clientSignature:
            appliedClient.contractStatus === 'Signed' ? appliedClient.name : undefined,
          clientSignDate:
            appliedClient.contractStatus === 'Signed' ? leaseStartDate : undefined,
        },
        appliedClient,
        scenario
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
