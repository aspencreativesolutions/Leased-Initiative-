import { apiFetch } from '@/lib/api'
import type { ServiceTier } from '@/types'

export interface PortalProfileProject {
  contractId: string
  projectTitle: string
  serviceTier: ServiceTier
  developerName: string
  businessName: string
  sentAt?: string
  signedAt?: string
}

export interface PortalProfile {
  email: string
  name: string
  phone: string
  linked: boolean
  projects: PortalProfileProject[]
}

export async function fetchPortalProfile() {
  return apiFetch<PortalProfile>('/api/portal/profile')
}

export async function updatePortalProfile(data: { name?: string; phone?: string }) {
  return apiFetch<PortalProfile>('/api/portal/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
