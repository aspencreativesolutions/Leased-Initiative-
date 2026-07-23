import {
  type BusinessSettings,
  type Client,
  type ContractData,
  type Property,
} from '@/types'
import { normalizeClient } from '@/lib/clientUtils'
import { migrateServiceTier } from '@/lib/serviceTiers'
import { ensurePropertyMonthlyRent } from '@/lib/rentalRent'
import { ensurePropertyBedLayout } from '@/lib/rentalBeds'
import { normalizeRentalType } from '@/lib/rentalTypes'
import { seedClients, seedProperties, defaultSettings, migrateSampleAddress, linkClientsToPropertyBeds } from '@/data/seed'
import { REMOVED_SAMPLE_CLIENT_EMAILS, REMOVED_SAMPLE_CLIENT_NAMES } from '@/data/sampleClients'

const CLIENTS_KEY = 'client-craft-clients'
const CONTRACTS_KEY = 'client-craft-contracts'
const SETTINGS_KEY = 'client-craft-settings'
const PROPERTIES_KEY = 'client-craft-properties'

/** Normalize a property record from storage or API (backfills new fields). */
export function normalizeProperty(p: Property): Property {
  const unitCount = Math.max(1, Number(p.unitCount) || 1)
  const baths = Number(p.bathrooms)
  const sqft = Number(p.squareFeet)
  const base: Property = {
    ...p,
    address: migrateSampleAddress(p.address) ?? p.address,
    propertyType: normalizeRentalType(p.propertyType),
    unitCount,
    bedrooms: Math.max(0, Number(p.bedrooms) || 0),
    maxTenants: Math.max(1, Number(p.maxTenants) || unitCount),
    ...(Number.isFinite(baths) && baths > 0 ? { bathrooms: baths } : {}),
    ...(Number.isFinite(sqft) && sqft > 0 ? { squareFeet: Math.floor(sqft) } : {}),
  }
  return ensurePropertyMonthlyRent(ensurePropertyBedLayout(base))
}

export function loadClients(): Client[] {
  const raw = localStorage.getItem(CLIENTS_KEY)
  const properties = loadProperties()
  if (!raw) {
    const seeded = linkClientsToPropertyBeds(seedClients(), properties)
    saveClients(seeded)
    return seeded
  }
  const parsed = JSON.parse(raw) as Partial<Client>[]
  const normalized = parsed.map((c) => normalizeClient(c as Client))
  const clients = normalized.filter((client) => {
    const email = client.email?.trim().toLowerCase()
    const name = client.name?.trim().toLowerCase()
    if (email && REMOVED_SAMPLE_CLIENT_EMAILS.has(email)) return false
    if (name && REMOVED_SAMPLE_CLIENT_NAMES.has(name)) return false
    return true
  })
  const linked = linkClientsToPropertyBeds(clients, properties)
  const addressChanged = normalized.some(
    (client, index) => client.projectName !== parsed[index]?.projectName
  )
  const bedsLinked = linked.some(
    (client, index) =>
      client.bedId !== clients[index]?.bedId ||
      client.bedroomId !== clients[index]?.bedroomId
  )
  if (addressChanged || clients.length !== normalized.length || bedsLinked) {
    saveClients(linked)
  }
  return linked
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
    const migratedTitle = migrateSampleAddress(c.projectTitle)
    if (migratedAddress !== c.clientAddress || migratedTitle !== c.projectTitle) {
      changed = true
    }
    return {
      ...c,
      serviceTier: migrateServiceTier(c.serviceTier),
      ...(migratedAddress !== c.clientAddress ? { clientAddress: migratedAddress } : {}),
      ...(migratedTitle !== c.projectTitle ? { projectTitle: migratedTitle } : {}),
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

export function loadProperties(): Property[] {
  const raw = localStorage.getItem(PROPERTIES_KEY)
  if (!raw) {
    const seeded = seedProperties()
    saveProperties(seeded)
    return seeded
  }
  try {
    const parsed = JSON.parse(raw) as Property[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = seedProperties()
      saveProperties(seeded)
      return seeded
    }
    return parsed.map((p) => normalizeProperty(p))
  } catch {
    const seeded = seedProperties()
    saveProperties(seeded)
    return seeded
  }
}

export function saveProperties(properties: Property[]): void {
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
