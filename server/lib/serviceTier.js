export const DEFAULT_SERVICE_TIER = 'Launch'

const LEGACY_TIER_MAP = {
  Starter: 'Launch',
  Business: 'Studio',
  'Premium Custom': 'Summit',
  launch: 'Launch',
  studio: 'Studio',
  summit: 'Summit',
  Launch: 'Launch',
  Studio: 'Studio',
  Summit: 'Summit',
}

export function migrateServiceTier(tier) {
  if (!tier) return DEFAULT_SERVICE_TIER
  return LEGACY_TIER_MAP[tier] ?? DEFAULT_SERVICE_TIER
}

export function migrateStoreTiers(store) {
  let changed = false

  const clients = store.clients.map((client) => {
    const next = migrateServiceTier(client.serviceTier)
    if (next !== client.serviceTier) {
      changed = true
      return { ...client, serviceTier: next }
    }
    return client
  })

  const contracts = store.contracts.map((contract) => {
    const next = migrateServiceTier(contract.serviceTier)
    if (next !== contract.serviceTier) {
      changed = true
      return { ...contract, serviceTier: next }
    }
    return contract
  })

  return { clients, contracts, changed }
}
