import { purgeImportedLeaseProperties } from './properties.js'
import { purgeLeaseImportInvites } from './tenantInvites.js'

/**
 * Wipe landlord test data created through “Import existing leases”, then
 * restore curated seed properties. Used by Admin Mode reseed / demo prepare.
 */
export function purgeImportedLeaseScanData(store) {
  const importedClientIds = new Set(
    (store.clients ?? [])
      .filter((client) => client?.importedFromLeaseScan === true)
      .map((client) => client.id)
  )

  let next = store
  let removedClients = 0
  let removedContracts = 0

  if (importedClientIds.size > 0) {
    const clients = (store.clients ?? []).filter((client) => !importedClientIds.has(client.id))
    const contracts = (store.contracts ?? []).filter(
      (contract) => !importedClientIds.has(contract.clientId)
    )
    removedClients = (store.clients ?? []).length - clients.length
    removedContracts = (store.contracts ?? []).length - contracts.length
    next = { ...next, clients, contracts }
  }

  // Also catch older imports that only left a scan note (pre-flag)
  const legacyImported = (next.clients ?? []).filter((client) => {
    if (client?.importedFromLeaseScan === true) return false
    if (client?.isSampleClient || client?.isLeasedDemoClient) return false
    const notes = String(client?.projectDescription ?? '')
    return /Imported from lease scan/i.test(notes)
  })
  if (legacyImported.length > 0) {
    const legacyIds = new Set(legacyImported.map((c) => c.id))
    const clients = (next.clients ?? []).filter((client) => !legacyIds.has(client.id))
    const contracts = (next.contracts ?? []).filter(
      (contract) => !legacyIds.has(contract.clientId)
    )
    removedClients += (next.clients ?? []).length - clients.length
    removedContracts += (next.contracts ?? []).length - contracts.length
    next = { ...next, clients, contracts }
  }

  const propertiesResult = purgeImportedLeaseProperties(next)
  next = propertiesResult.store

  const invitesResult = purgeLeaseImportInvites(next)
  next = invitesResult.store

  const changed =
    removedClients > 0 ||
    removedContracts > 0 ||
    propertiesResult.changed ||
    invitesResult.changed

  return {
    store: next,
    changed,
    removedClients,
    removedContracts,
    removedProperties: propertiesResult.removed ?? 0,
    removedInvites: invitesResult.removed ?? 0,
  }
}
