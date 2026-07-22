import type { BusinessSettings, Client, ContractData } from '@/types'
import { normalizeClient } from '@/lib/clientUtils'
import { migrateServiceTier } from '@/lib/serviceTiers'
import { seedClients, defaultSettings, migrateSampleAddress } from '@/data/seed'

const CLIENTS_KEY = 'client-craft-clients'
const CONTRACTS_KEY = 'client-craft-contracts'
const SETTINGS_KEY = 'client-craft-settings'

export function loadClients(): Client[] {
  const raw = localStorage.getItem(CLIENTS_KEY)
  if (!raw) {
    const seeded = seedClients()
    saveClients(seeded)
    return seeded
  }
  const parsed = JSON.parse(raw) as Partial<Client>[]
  const clients = parsed.map((c) => normalizeClient(c as Client))
  const changed = clients.some((client, index) => client.projectName !== parsed[index]?.projectName)
  if (changed) saveClients(clients)
  return clients
}

export function saveClients(clients: Client[]): void {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients))
}

export function loadContracts(): ContractData[] {
  const raw = localStorage.getItem(CONTRACTS_KEY)
  if (!raw) return []
  const parsed = JSON.parse(raw) as ContractData[]
  let changed = false
  const contracts = parsed.map((c) => {
    const migratedAddress = migrateSampleAddress(c.clientAddress)
    if (migratedAddress !== c.clientAddress) changed = true
    return {
      ...c,
      serviceTier: migrateServiceTier(c.serviceTier),
      ...(migratedAddress !== c.clientAddress ? { clientAddress: migratedAddress } : {}),
    }
  })
  if (changed) saveContracts(contracts)
  return contracts
}

export function saveContracts(contracts: ContractData[]): void {
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts))
}

export function loadSettings(): BusinessSettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) {
    saveSettings(defaultSettings)
    return defaultSettings
  }
  const parsed = { ...defaultSettings, ...JSON.parse(raw) } as BusinessSettings
  const migratedAddress = migrateSampleAddress(parsed.address)
  const settings =
    migratedAddress && migratedAddress !== parsed.address
      ? { ...parsed, address: migratedAddress }
      : parsed
  if (settings.address !== parsed.address) saveSettings(settings)
  return settings
}

export function saveSettings(settings: BusinessSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
