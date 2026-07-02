import fs from 'fs'
import path from 'path'
import { E2E_DB_PATH } from './global-setup'

export const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3011'

export interface TestStore {
  users: Array<{
    id: string
    email: string
    emailVerificationToken?: string
    clientId?: string | null
    role: string
  }>
  clients: Array<{ id: string; email: string; name: string; projectName?: string }>
  contracts: Array<{ id: string; clientId: string }>
}

export function readTestStore(): TestStore {
  return JSON.parse(fs.readFileSync(E2E_DB_PATH, 'utf8')) as TestStore
}

export async function apiJson<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${path} (${res.status})`)
  }
  return data
}

export async function loginApi(email: string, password: string): Promise<string> {
  const data = await apiJson<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.token
}

export async function registerClientApi(
  name: string,
  email: string,
  password: string
): Promise<void> {
  await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, accountType: 'client' }),
  })
}

export async function verifyEmailByAddress(email: string): Promise<string> {
  const store = readTestStore()
  const user = store.users.find((u) => u.email === email.trim().toLowerCase())
  if (!user?.emailVerificationToken) {
    throw new Error(`No verification token for ${email}`)
  }
  const data = await apiJson<{ token: string }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: user.emailVerificationToken }),
  })
  return data.token
}

export async function getRegistrations(adminToken: string) {
  return apiJson<{ registrations: Array<{ id: string; email: string; name: string }> }>(
    '/api/data/registrations',
    { token: adminToken }
  )
}

export async function acceptRegistration(adminToken: string, userId: string) {
  return apiJson<{ client: { id: string }; contract: { id: string } | null }>(
    `/api/data/accept-registration/${userId}`,
    { method: 'POST', token: adminToken }
  )
}

export async function prepareDepositFlow(adminToken: string, clientId: string) {
  return apiJson(`/api/e2e/clients/${clientId}/prepare-deposit-flow`, {
    method: 'POST',
    token: adminToken,
  })
}

export async function clickDepositInvoice(clientToken: string) {
  return apiJson('/api/portal/invoice/click', {
    method: 'POST',
    token: clientToken,
  })
}

export async function simulateDepositPaid(adminToken: string, clientId: string) {
  return apiJson(`/api/e2e/clients/${clientId}/simulate-deposit-paid`, {
    method: 'POST',
    token: adminToken,
  })
}

export async function simulateFinalPaid(adminToken: string, clientId: string) {
  return apiJson(`/api/e2e/clients/${clientId}/simulate-final-paid`, {
    method: 'POST',
    token: adminToken,
  })
}

export async function startProjectApi(adminToken: string, clientId: string) {
  return apiJson(`/api/data/clients/${clientId}/start-project`, {
    method: 'POST',
    token: adminToken,
  })
}

export async function completeProjectApi(adminToken: string, clientId: string) {
  return apiJson(`/api/data/clients/${clientId}/complete-project`, {
    method: 'POST',
    token: adminToken,
  })
}

export function findClientIdByEmail(email: string): string {
  const store = readTestStore()
  const client = store.clients.find((c) => c.email.trim().toLowerCase() === email.trim().toLowerCase())
  if (!client) throw new Error(`Client not found for ${email}`)
  return client.id
}

export function findContractIdForClient(clientId: string): string {
  const store = readTestStore()
  const contract = store.contracts.find((c) => c.clientId === clientId)
  if (!contract) throw new Error(`Contract not found for client ${clientId}`)
  return contract.id
}
