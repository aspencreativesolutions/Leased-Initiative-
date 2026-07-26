import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  BusinessSettings,
  Client,
  ClientInvoice,
  ContractData,
  Note,
  PayPalCaptureResponse,
  Property,
  ServiceTier,
} from '@/types'
import { buildServiceTierChangeResult, normalizeClient, paymentStatusAfterCapture } from '@/lib/clientUtils'
import {
  hasContractContentChanged,
  stripPortalDeliveryFields,
} from '@/lib/contractReview'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { createProperty as createPropertyRequest, updatePropertyRequest, type PropertyWriteInput } from '@/lib/propertiesApi'
import { defaultSettings, migrateSampleAddress } from '@/data/seed'
import { migrateServiceTier } from '@/lib/serviceTiers'
import {
  generateId,
  loadClients,
  loadContracts,
  loadProperties,
  loadSettings,
  normalizeProperty,
  saveClients,
  saveContracts,
  saveProperties,
  saveSettings,
} from '@/lib/storage'

function normalizeContracts(contracts: ContractData[]): ContractData[] {
  return contracts.map((c) => {
    const migratedAddress = migrateSampleAddress(c.clientAddress)
    const migratedTitle = migrateSampleAddress(c.projectTitle)
    return {
      ...c,
      serviceTier: migrateServiceTier(c.serviceTier),
      ...(migratedAddress !== c.clientAddress ? { clientAddress: migratedAddress } : {}),
      ...(migratedTitle !== c.projectTitle ? { projectTitle: migratedTitle } : {}),
    }
  })
}

function normalizeSettings(settings: BusinessSettings): BusinessSettings {
  const merged = { ...defaultSettings, ...settings }
  const migratedAddress = migrateSampleAddress(merged.address)
  if (!migratedAddress || migratedAddress === merged.address) return merged
  return { ...merged, address: migratedAddress }
}

interface AppContextValue {
  clients: Client[]
  contracts: ContractData[]
  properties: Property[]
  settings: BusinessSettings
  syncing: boolean
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'notes' | 'deadlines'>) => Client
  addClientWithContract: (
    client: Omit<Client, 'id' | 'createdAt' | 'notes' | 'deadlines'>,
    buildContract: (client: Client) => ContractData
  ) => Promise<Client>
  addProperty: (input: PropertyWriteInput) => Promise<Property>
  updateProperty: (propertyId: string, input: PropertyWriteInput) => Promise<Property>
  updateClient: (id: string, updates: Partial<Client>) => void
  getClient: (id: string) => Client | undefined
  addNote: (clientId: string, note: Omit<Note, 'id' | 'createdAt'>) => void
  saveContract: (
    contract: ContractData,
    options?: { asDraft?: boolean }
  ) => Promise<void>
  getContractForClient: (clientId: string) => ContractData | undefined
  updateSettings: (updates: Partial<BusinessSettings>) => void
  markOfficialClient: (clientId: string) => void
  unmarkOfficialClient: (clientId: string) => void
  applyPaymentCapture: (
    clientId: string,
    payload: { capture?: PayPalCaptureResponse; invoice?: Partial<ClientInvoice> }
  ) => void
  updateClientServiceTier: (
    clientId: string,
    tier: ServiceTier
  ) => Promise<{ requiresResend: boolean }>
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

async function fetchAdminData() {
  return apiFetch<{
    clients: Client[]
    contracts: ContractData[]
    settings: BusinessSettings
    properties: Property[]
  }>('/api/data')
}

async function persistAdminData(
  clients: Client[],
  contracts: ContractData[],
  settings?: BusinessSettings
) {
  await apiFetch('/api/data/clients', {
    method: 'PUT',
    body: JSON.stringify({ clients }),
  })
  const contractResult = await apiFetch<{ ok: boolean; revisedClientIds?: string[] }>(
    '/api/data/contracts',
    {
      method: 'PUT',
      body: JSON.stringify({ contracts }),
    }
  )
  if (settings) {
    await apiFetch('/api/data/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  }
  return contractResult
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAdmin, user, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [settings, setSettings] = useState<BusinessSettings>(loadSettings())
  // Start true so Official Tenants shows "Loading…" instead of an empty flash
  // while auth + first /api/data fetch complete (especially public demo).
  const [syncing, setSyncing] = useState(true)
  const [migrated, setMigrated] = useState(false)

  const refresh = useCallback(async () => {
    if (isAdmin) {
      setSyncing(true)
      try {
        const data = await fetchAdminData()
        const nextClients = data.clients.map((c) => normalizeClient(c))
        const nextContracts = normalizeContracts(data.contracts)
        const nextSettings = normalizeSettings(data.settings)
        const nextProperties = (Array.isArray(data.properties) ? data.properties : []).map(
          (p) => normalizeProperty(p)
        )
        setClients(nextClients)
        setContracts(nextContracts)
        setSettings(nextSettings)
        setProperties(nextProperties)
        saveClients(nextClients)
        saveContracts(nextContracts)
        saveSettings(nextSettings)
        saveProperties(nextProperties)

        const addressMigrated =
          nextClients.some((c, i) => c.projectName !== data.clients[i]?.projectName) ||
          nextContracts.some((c, i) => c.clientAddress !== data.contracts[i]?.clientAddress) ||
          nextSettings.address !== data.settings.address
        if (addressMigrated) {
          await persistAdminData(nextClients, nextContracts, nextSettings)
        }
      } finally {
        setSyncing(false)
      }
    } else {
      setClients(loadClients())
      setContracts(loadContracts())
      setSettings(loadSettings())
      setProperties(loadProperties())
    }
  }, [isAdmin])

  useEffect(() => {
    if (authLoading) return

    if (!isAdmin) {
      setClients(loadClients())
      setContracts(loadContracts())
      setSettings(loadSettings())
      setProperties(loadProperties())
      setSyncing(false)
      return
    }

    const init = async () => {
      setSyncing(true)
      try {
        const data = await fetchAdminData()
        const hasLocal =
          loadClients().length > 0 || loadContracts().length > 0
        const serverEmpty =
          data.clients.length === 0 && data.contracts.length === 0

        if (hasLocal && serverEmpty && !migrated) {
          await apiFetch('/api/data/migrate', {
            method: 'POST',
            body: JSON.stringify({
              clients: loadClients(),
              contracts: loadContracts(),
              settings: loadSettings(),
              properties: loadProperties(),
            }),
          })
          setMigrated(true)
        }

        await refresh()
      } catch {
        setClients(loadClients())
        setContracts(loadContracts())
        setSettings(loadSettings())
        setProperties(loadProperties())
      } finally {
        setSyncing(false)
      }
    }

    init()
  }, [isAdmin, authLoading, user?.id, migrated, refresh])

  useEffect(() => {
    if (!isAdmin) return
    const onFocus = () => {
      refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [isAdmin, refresh])

  const persist = useCallback(
    async (nextClients: Client[], nextContracts: ContractData[], nextSettings?: BusinessSettings) => {
      setClients(nextClients)
      setContracts(nextContracts)
      if (nextSettings) setSettings(nextSettings)
      saveClients(nextClients)
      saveContracts(nextContracts)
      if (nextSettings) saveSettings(nextSettings)

      if (isAdmin) {
        await persistAdminData(nextClients, nextContracts, nextSettings)
      }
    },
    [isAdmin]
  )

  const addClient = useCallback(
    (data: Omit<Client, 'id' | 'createdAt' | 'notes' | 'deadlines'>) => {
      const client: Client = {
        ...data,
        isOfficialClient: data.isOfficialClient ?? false,
        isSampleClient: false,
        id: generateId(),
        createdAt: new Date().toISOString(),
        notes: [],
        deadlines: data.followUpDate
          ? [
              {
                id: generateId(),
                type: 'follow-up',
                date: data.followUpDate,
                label: 'Follow-up',
              },
            ]
          : [],
      }
      const next = [...clients, client]
      persist(next, contracts)
      return client
    },
    [clients, contracts, persist]
  )

  const addClientWithContract = useCallback(
    async (
      data: Omit<Client, 'id' | 'createdAt' | 'notes' | 'deadlines'>,
      buildContract: (client: Client) => ContractData
    ) => {
      const client: Client = {
        ...data,
        isOfficialClient: data.isOfficialClient ?? false,
        isSampleClient: false,
        id: generateId(),
        createdAt: new Date().toISOString(),
        notes: [],
        deadlines: data.followUpDate
          ? [
              {
                id: generateId(),
                type: 'follow-up',
                date: data.followUpDate,
                label: 'Follow-up',
              },
            ]
          : [],
      }
      const contract = buildContract(client)
      await persist([...clients, client], [...contracts, contract])
      return client
    },
    [clients, contracts, persist]
  )

  const addProperty = useCallback(
    async (input: PropertyWriteInput) => {
      if (isAdmin) {
        const result = await createPropertyRequest(input)
        setProperties(result.properties)
        saveProperties(result.properties)
        return result.property
      }
      const unitCount = Math.max(1, Math.floor(input.unitCount ?? 1))
      const furnished = input.furnished === true
      let property: Property = {
        id: generateId(),
        address: input.address.trim(),
        propertyType: input.propertyType,
        unitCount,
        bedrooms: Math.max(0, Math.floor(input.bedrooms)),
        maxTenants: Math.max(1, Math.floor(input.maxTenants)),
        furnished,
        utilitiesIncluded: input.utilitiesIncluded === true,
        entireHomeOnly: furnished && input.entireHomeOnly === true,
        pricingStructure:
          input.pricingStructure === 'room' ||
          input.pricingStructure === 'person' ||
          (input.pricingStructure === 'bed' && furnished)
            ? input.pricingStructure
            : furnished
              ? 'bed'
              : 'person',
        createdAt: new Date().toISOString(),
        ...(input.bedroomsLayout ? { bedroomsLayout: input.bedroomsLayout } : {}),
        ...(input.monthlyRent != null && input.monthlyRent > 0
          ? { monthlyRent: Math.round(input.monthlyRent) }
          : {}),
        ...(input.depositAmount != null && input.depositAmount > 0
          ? { depositAmount: Math.round(input.depositAmount) }
          : {}),
        ...(input.importedFromLeaseScan ? { importedFromLeaseScan: true } : {}),
        ...(input.addressConfirmed || input.importedFromLeaseScan
          ? { addressConfirmed: true }
          : {}),
        ...(input.addressDetails ? { addressDetails: input.addressDetails } : {}),
      }
      property = normalizeProperty(property)
      const next = [...properties, property]
      setProperties(next)
      saveProperties(next)
      return property
    },
    [isAdmin, properties]
  )

  const updateProperty = useCallback(
    async (propertyId: string, input: PropertyWriteInput) => {
      if (isAdmin) {
        const result = await updatePropertyRequest(propertyId, input)
        setProperties(result.properties)
        saveProperties(result.properties)
        return result.property
      }
      const existing = properties.find((p) => p.id === propertyId)
      if (!existing) throw new Error('Rental not found')
      const furnished = input.furnished === true
      let property: Property = normalizeProperty({
        ...existing,
        address: input.address.trim(),
        propertyType: input.propertyType,
        unitCount: Math.max(1, Math.floor(input.unitCount ?? existing.unitCount ?? 1)),
        bedrooms: Math.max(0, Math.floor(input.bedrooms)),
        maxTenants: Math.max(1, Math.floor(input.maxTenants)),
        furnished,
        utilitiesIncluded: input.utilitiesIncluded === true,
        entireHomeOnly: furnished && input.entireHomeOnly === true,
        pricingStructure:
          input.pricingStructure === 'room' ||
          input.pricingStructure === 'person' ||
          (input.pricingStructure === 'bed' && furnished)
            ? input.pricingStructure
            : furnished
              ? 'bed'
              : 'person',
        ...(input.bedroomsLayout ? { bedroomsLayout: input.bedroomsLayout } : {}),
        ...(input.monthlyRent != null && input.monthlyRent > 0
          ? { monthlyRent: Math.round(input.monthlyRent) }
          : {}),
        ...(input.addressConfirmed ? { addressConfirmed: true } : {}),
        ...(input.addressDetails ? { addressDetails: input.addressDetails } : {}),
      })
      if (input.depositAmount === null) {
        delete property.depositAmount
      } else if (input.depositAmount != null && input.depositAmount > 0) {
        property.depositAmount = Math.round(input.depositAmount)
      }
      property = normalizeProperty(property)
      const next = properties.map((p) => (p.id === propertyId ? property : p))
      setProperties(next)
      saveProperties(next)
      return property
    },
    [isAdmin, properties]
  )

  const updateClient = useCallback(
    (id: string, updates: Partial<Client>) => {
      const next = clients.map((c) => (c.id === id ? { ...c, ...updates } : c))
      persist(next, contracts)
    },
    [clients, contracts, persist]
  )

  const getClient = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients]
  )

  const addNote = useCallback(
    (clientId: string, note: Omit<Note, 'id' | 'createdAt'>) => {
      const existing = clients.find((c) => c.id === clientId)
      const newNote: Note = {
        ...note,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }
      updateClient(clientId, {
        notes: [...(existing?.notes ?? []), newNote],
      })
    },
    [clients, updateClient]
  )

  const saveContract = useCallback(
    async (contract: ContractData, options?: { asDraft?: boolean }) => {
      const idx = contracts.findIndex((c) => c.id === contract.id)
      const existing = idx >= 0 ? contracts[idx] : undefined
      const contentChanged = existing ? hasContractContentChanged(existing, contract) : false
      const shouldResetDelivery =
        Boolean(existing?.sentAt) && contentChanged
      const baseContract = shouldResetDelivery
        ? stripPortalDeliveryFields(contract)
        : contract
      const merged: ContractData = existing
        ? {
            ...baseContract,
            sentAt: baseContract.sentAt ?? existing.sentAt,
            viewedAt: shouldResetDelivery ? undefined : baseContract.viewedAt ?? existing.viewedAt,
            signedAt: shouldResetDelivery ? undefined : baseContract.signedAt ?? existing.signedAt,
            confirmedByClient: shouldResetDelivery
              ? false
              : baseContract.confirmedByClient ?? existing.confirmedByClient,
            clientSignature: shouldResetDelivery
              ? undefined
              : baseContract.clientSignature ?? existing.clientSignature,
            clientSignatureImage: shouldResetDelivery
              ? undefined
              : baseContract.clientSignatureImage ?? existing.clientSignatureImage,
            clientSignDate: shouldResetDelivery
              ? undefined
              : baseContract.clientSignDate ?? existing.clientSignDate,
          }
        : baseContract
      const nextContracts =
        idx >= 0
          ? contracts.map((c, i) => (i === idx ? merged : c))
          : [...contracts, merged]
      const wasSent = Boolean(existing?.sentAt || contract.sentAt)
      let nextClients = clients

      if (options?.asDraft && !wasSent) {
        nextClients = clients.map((c) =>
          c.id === contract.clientId
            ? { ...c, contractStatus: 'Draft in Progress' as const }
            : c
        )
      } else if (contract.pdfGenerated && !wasSent) {
        nextClients = clients.map((c) =>
          c.id === contract.clientId ? { ...c, contractStatus: 'Generated' as const } : c
        )
      }

      await persist(nextClients, nextContracts)
      if (isAdmin) {
        await refresh()
      }
    },
    [clients, contracts, persist, isAdmin, refresh]
  )

  const getContractForClient = useCallback(
    (clientId: string) => contracts.find((c) => c.clientId === clientId),
    [contracts]
  )

  const updateSettings = useCallback(
    (updates: Partial<BusinessSettings>) => {
      const next = { ...settings, ...updates }
      void (async () => {
        await persist(clients, contracts, next)
        // Re-sync after settings-only saves so server-created tenants are not lost
        // if the in-memory client list was briefly stale.
        if (isAdmin) await refresh()
      })()
    },
    [clients, contracts, settings, persist, isAdmin, refresh]
  )

  const markOfficialClient = useCallback(
    (clientId: string) => {
      updateClient(clientId, {
        isOfficialClient: true,
        officialClientSince: new Date().toISOString(),
      })
      addNote(clientId, {
        text: 'Marked as official client. PayPal payments are now enabled.',
        category: 'Payment',
      })
    },
    [updateClient, addNote]
  )

  const unmarkOfficialClient = useCallback(
    (clientId: string) => {
      updateClient(clientId, {
        isOfficialClient: false,
        officialClientSince: undefined,
      })
    },
    [updateClient]
  )

  const updateClientServiceTier = useCallback(
    async (clientId: string, tier: ServiceTier) => {
      const client = clients.find((c) => c.id === clientId)
      if (!client) return { requiresResend: false }

      const contract = contracts.find((c) => c.clientId === clientId)
      const result = buildServiceTierChangeResult(client, contract, tier)
      if (!result) return { requiresResend: false }

      let nextClients = clients.map((c) =>
        c.id === clientId ? { ...c, ...result.clientUpdates } : c
      )

      if (result.note) {
        const newNote: Note = {
          ...result.note,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        nextClients = nextClients.map((c) =>
          c.id === clientId ? { ...c, notes: [...c.notes, newNote] } : c
        )
      }

      let nextContracts = contracts
      if (result.contract) {
        const idx = contracts.findIndex((c) => c.clientId === clientId)
        nextContracts =
          idx >= 0
            ? contracts.map((c, i) => (i === idx ? result.contract! : c))
            : [...contracts, result.contract]
      }

      await persist(nextClients, nextContracts)
      return { requiresResend: result.requiresResend }
    },
    [clients, contracts, persist]
  )

  const applyPaymentCapture = useCallback(
    (
      clientId: string,
      payload: { capture?: PayPalCaptureResponse; invoice?: Partial<ClientInvoice> }
    ) => {
      const client = clients.find((c) => c.id === clientId)
      if (!client) return
      const contract = contracts.find((c) => c.clientId === clientId)
      const isPaid = Boolean(payload.capture || payload.invoice?.paidAt)
      const amount = payload.capture
        ? parseFloat(payload.capture.amount)
        : payload.invoice?.amount ?? client.invoice?.amount ?? 0

      const invoice: ClientInvoice = {
        description: payload.invoice?.description ?? client.invoice?.description ?? client.projectName,
        amount,
        currency: payload.capture?.currency ?? payload.invoice?.currency ?? 'USD',
        paypalOrderId: payload.capture?.orderId ?? payload.invoice?.paypalOrderId,
        paypalCaptureId: payload.capture?.captureId ?? payload.invoice?.paypalCaptureId,
        paymentLink: payload.invoice?.paymentLink ?? client.invoice?.paymentLink,
        createdAt: payload.invoice?.createdAt ?? client.invoice?.createdAt ?? new Date().toISOString(),
        paidAt: isPaid
          ? payload.invoice?.paidAt ?? new Date().toISOString()
          : client.invoice?.paidAt,
      }

      const updates: Partial<Client> = { invoice }

      if (isPaid) {
        updates.paymentStatus = paymentStatusAfterCapture(client.paymentStatus, amount, contract)
        addNote(clientId, {
          text: `PayPal payment received: $${amount.toFixed(2)} ${invoice.currency}. Status: ${updates.paymentStatus}.`,
          category: 'Payment',
        })
      }

      updateClient(clientId, updates)
    },
    [clients, contracts, updateClient, addNote]
  )

  const value = useMemo(
    () => ({
      clients,
      contracts,
      properties,
      settings,
      syncing,
      addClient,
      addClientWithContract,
      addProperty,
      updateProperty,
      updateClient,
      getClient,
      addNote,
      saveContract,
      getContractForClient,
      updateSettings,
      markOfficialClient,
      unmarkOfficialClient,
      applyPaymentCapture,
      updateClientServiceTier,
      refresh,
    }),
    [
      clients,
      contracts,
      properties,
      settings,
      syncing,
      addClient,
      addClientWithContract,
      addProperty,
      updateProperty,
      updateClient,
      getClient,
      addNote,
      saveContract,
      getContractForClient,
      updateSettings,
      markOfficialClient,
      unmarkOfficialClient,
      applyPaymentCapture,
      updateClientServiceTier,
      refresh,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
