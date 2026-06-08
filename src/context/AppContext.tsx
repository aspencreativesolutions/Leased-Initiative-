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
  ServiceTier,
} from '@/types'
import { buildServiceTierChangeResult, paymentStatusAfterCapture } from '@/lib/clientUtils'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import {
  generateId,
  loadClients,
  loadContracts,
  loadSettings,
  saveClients,
  saveContracts,
  saveSettings,
} from '@/lib/storage'

interface AppContextValue {
  clients: Client[]
  contracts: ContractData[]
  settings: BusinessSettings
  syncing: boolean
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'notes' | 'deadlines'>) => Client
  updateClient: (id: string, updates: Partial<Client>) => void
  getClient: (id: string) => Client | undefined
  addNote: (clientId: string, note: Omit<Note, 'id' | 'createdAt'>) => void
  saveContract: (contract: ContractData) => Promise<void>
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
  refresh: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

async function fetchAdminData() {
  return apiFetch<{
    clients: Client[]
    contracts: ContractData[]
    settings: BusinessSettings
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
  await apiFetch('/api/data/contracts', {
    method: 'PUT',
    body: JSON.stringify({ contracts }),
  })
  if (settings) {
    await apiFetch('/api/data/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAdmin, user, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [settings, setSettings] = useState<BusinessSettings>(loadSettings())
  const [syncing, setSyncing] = useState(false)
  const [migrated, setMigrated] = useState(false)

  const refresh = useCallback(async () => {
    if (isAdmin) {
      setSyncing(true)
      try {
        const data = await fetchAdminData()
        setClients(data.clients)
        setContracts(data.contracts)
        setSettings(data.settings)
        saveClients(data.clients)
        saveContracts(data.contracts)
        saveSettings(data.settings)
      } finally {
        setSyncing(false)
      }
    } else {
      setClients(loadClients())
      setContracts(loadContracts())
      setSettings(loadSettings())
    }
  }, [isAdmin])

  useEffect(() => {
    if (authLoading) return

    if (!isAdmin) {
      setClients(loadClients())
      setContracts(loadContracts())
      setSettings(loadSettings())
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
            }),
          })
          setMigrated(true)
        }

        await refresh()
      } catch {
        setClients(loadClients())
        setContracts(loadContracts())
        setSettings(loadSettings())
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
    async (contract: ContractData) => {
      const idx = contracts.findIndex((c) => c.id === contract.id)
      const existing = idx >= 0 ? contracts[idx] : undefined
      const merged: ContractData = existing
        ? {
            ...contract,
            sentAt: contract.sentAt ?? existing.sentAt,
            viewedAt: contract.viewedAt ?? existing.viewedAt,
            signedAt: contract.signedAt ?? existing.signedAt,
            confirmedByClient: contract.confirmedByClient ?? existing.confirmedByClient,
            clientSignature: contract.clientSignature ?? existing.clientSignature,
            clientSignDate: contract.clientSignDate ?? existing.clientSignDate,
          }
        : contract
      const nextContracts =
        idx >= 0
          ? contracts.map((c, i) => (i === idx ? merged : c))
          : [...contracts, merged]
      const nextClients = contract.pdfGenerated
        ? clients.map((c) =>
            c.id === contract.clientId ? { ...c, contractStatus: 'Generated' as const } : c
          )
        : clients
      await persist(nextClients, nextContracts)
    },
    [clients, contracts, persist]
  )

  const getContractForClient = useCallback(
    (clientId: string) => contracts.find((c) => c.clientId === clientId),
    [contracts]
  )

  const updateSettings = useCallback(
    (updates: Partial<BusinessSettings>) => {
      const next = { ...settings, ...updates }
      persist(clients, contracts, next)
    },
    [clients, contracts, settings, persist]
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
      settings,
      syncing,
      addClient,
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
      settings,
      syncing,
      addClient,
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
