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
} from '@/types'
import { paymentStatusAfterCapture } from '@/lib/clientUtils'
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
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'notes' | 'deadlines'>) => Client
  updateClient: (id: string, updates: Partial<Client>) => void
  getClient: (id: string) => Client | undefined
  addNote: (clientId: string, note: Omit<Note, 'id' | 'createdAt'>) => void
  saveContract: (contract: ContractData) => void
  getContractForClient: (clientId: string) => ContractData | undefined
  updateSettings: (updates: Partial<BusinessSettings>) => void
  markOfficialClient: (clientId: string) => void
  unmarkOfficialClient: (clientId: string) => void
  applyPaymentCapture: (
    clientId: string,
    payload: { capture?: PayPalCaptureResponse; invoice?: Partial<ClientInvoice> }
  ) => void
  refresh: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [settings, setSettings] = useState<BusinessSettings>(loadSettings())

  const refresh = useCallback(() => {
    setClients(loadClients())
    setContracts(loadContracts())
    setSettings(loadSettings())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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
      const next = [...loadClients(), client]
      saveClients(next)
      setClients(next)
      return client
    },
    []
  )

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    const next = loadClients().map((c) => (c.id === id ? { ...c, ...updates } : c))
    saveClients(next)
    setClients(next)
  }, [])

  const getClient = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients]
  )

  const addNote = useCallback(
    (clientId: string, note: Omit<Note, 'id' | 'createdAt'>) => {
      const existing = loadClients().find((c) => c.id === clientId)
      const newNote: Note = {
        ...note,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }
      updateClient(clientId, {
        notes: [...(existing?.notes ?? []), newNote],
      })
    },
    [updateClient]
  )

  const saveContract = useCallback(
    (contract: ContractData) => {
      const existing = loadContracts()
      const idx = existing.findIndex((c) => c.id === contract.id)
      const next =
        idx >= 0
          ? existing.map((c, i) => (i === idx ? contract : c))
          : [...existing, contract]
      saveContracts(next)
      setContracts(next)
      if (contract.pdfGenerated) {
        updateClient(contract.clientId, { contractStatus: 'Generated' })
      }
    },
    [updateClient]
  )

  const getContractForClient = useCallback(
    (clientId: string) => contracts.find((c) => c.clientId === clientId),
    [contracts]
  )

  const updateSettings = useCallback((updates: Partial<BusinessSettings>) => {
    const next = { ...loadSettings(), ...updates }
    saveSettings(next)
    setSettings(next)
  }, [])

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

  const applyPaymentCapture = useCallback(
    (
      clientId: string,
      payload: { capture?: PayPalCaptureResponse; invoice?: Partial<ClientInvoice> }
    ) => {
      const client = loadClients().find((c) => c.id === clientId)
      if (!client) return
      const contract = loadContracts().find((c) => c.clientId === clientId)
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
    [updateClient, addNote]
  )

  const value = useMemo(
    () => ({
      clients,
      contracts,
      settings,
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
      refresh,
    }),
    [
      clients,
      contracts,
      settings,
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
