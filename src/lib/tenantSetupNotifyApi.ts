import { apiFetch } from '@/lib/api'

export type TenantSetupNotifyChannels = 'email' | 'phone' | 'both'

export type TenantSetupNotifyResult = {
  ok: boolean
  setupUrl?: string
  warning?: string
  error?: string
  configured?: { email: boolean; sms: boolean }
  email?: { sent?: boolean; devMode?: boolean; error?: string } | null
  sms?: { sent?: boolean; devMode?: boolean; error?: string } | null
}

export function notifyTenantSetup(input: {
  channels: TenantSetupNotifyChannels
  name: string
  email?: string
  phone?: string
  propertyAddress?: string
  landlordCompany?: string
}) {
  return apiFetch<TenantSetupNotifyResult>('/api/data/notify-tenant-setup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
