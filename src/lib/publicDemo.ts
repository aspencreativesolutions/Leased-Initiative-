import { apiFetch } from '@/lib/api'
import type { WelcomeRole } from '@/lib/welcomeSlides'

export const PUBLIC_DEMO_SESSION_KEY = 'leased-public-demo'
export const PUBLIC_DEMO_ROLE_KEY = 'leased-public-demo-role'
/** One-time attention cue for the Switch POV control within a demo session. */
export const PUBLIC_DEMO_POV_INTRO_KEY = 'leased-public-demo-pov-intro'

export interface DemoAccountCredentials {
  email: string
  password: string
  role: 'admin' | 'client'
  loginPath: string
  homePath: string
  accountRole: WelcomeRole
  label: string
  name: string
}

export interface DemoRedeemResponse {
  ok: true
  publicDemo: true
  account: DemoAccountCredentials
  message: string
}

export function isPublicDemoSession(): boolean {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function getPublicDemoRole(): WelcomeRole | null {
  try {
    const role = sessionStorage.getItem(PUBLIC_DEMO_ROLE_KEY)
    if (role === 'landlord' || role === 'tenant') return role
    return null
  } catch {
    return null
  }
}

/** Mark the browser session as a public demo. Pass a role once the visitor chooses a POV. */
export function markPublicDemoSession(role?: WelcomeRole | null): void {
  try {
    sessionStorage.setItem(PUBLIC_DEMO_SESSION_KEY, '1')
    if (role === 'landlord' || role === 'tenant') {
      sessionStorage.setItem(PUBLIC_DEMO_ROLE_KEY, role)
    } else {
      sessionStorage.removeItem(PUBLIC_DEMO_ROLE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function clearPublicDemoSession(): void {
  try {
    sessionStorage.removeItem(PUBLIC_DEMO_SESSION_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_ROLE_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_POV_INTRO_KEY)
  } catch {
    /* ignore */
  }
}

/** Whether the Switch POV control has already played its entrance cue this demo session. */
export function hasPlayedDemoPovIntro(): boolean {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_POV_INTRO_KEY) === '1'
  } catch {
    return true
  }
}

export function markDemoPovIntroPlayed(): void {
  try {
    sessionStorage.setItem(PUBLIC_DEMO_POV_INTRO_KEY, '1')
  } catch {
    /* ignore */
  }
}

export async function redeemDemoCode(
  code: string,
  role: WelcomeRole
): Promise<DemoRedeemResponse> {
  return apiFetch<DemoRedeemResponse>('/api/demo/redeem', {
    method: 'POST',
    body: JSON.stringify({ code, role }),
  })
}

export async function exitPublicDemo(): Promise<void> {
  try {
    await apiFetch('/api/demo/exit', { method: 'POST' })
  } catch {
    /* best-effort reset */
  } finally {
    clearPublicDemoSession()
  }
}

export async function fetchAdminDemoCode(): Promise<{ code: string; source: string }> {
  return apiFetch('/api/dev/admin/demo-code')
}

export async function saveAdminDemoCode(code: string): Promise<{ code: string }> {
  return apiFetch('/api/dev/admin/demo-code', {
    method: 'PUT',
    body: JSON.stringify({ code }),
  })
}

export interface CompanyDemoLinkSummary {
  id: string
  companyName: string
  url: string
  createdAt: string
  expiresAt: string
}

export interface CompanyDemoLinksResponse {
  links: CompanyDemoLinkSummary[]
  companySuggestions: string[]
}

export interface CreateCompanyDemoLinkResponse {
  ok: true
  url: string
  expiryDays: number
  link: CompanyDemoLinkSummary
}

export async function fetchAdminCompanyDemoLinks(): Promise<CompanyDemoLinksResponse> {
  return apiFetch('/api/dev/admin/company-demo-links')
}

export async function createAdminCompanyDemoLink(
  companyName: string
): Promise<CreateCompanyDemoLinkResponse> {
  return apiFetch('/api/dev/admin/company-demo-links', {
    method: 'POST',
    body: JSON.stringify({ companyName }),
  })
}

export interface CompanyDemoLinkStatus {
  ok: true
  companyName: string
  expiresAt: string
}

export async function fetchCompanyDemoLink(token: string): Promise<CompanyDemoLinkStatus> {
  return apiFetch(`/api/demo/company-link/${encodeURIComponent(token)}`)
}

export async function redeemCompanyDemoLink(
  token: string
): Promise<{ ok: true; publicDemo: true; companyName: string; message: string }> {
  return apiFetch(`/api/demo/company-link/${encodeURIComponent(token)}/redeem`, {
    method: 'POST',
  })
}

/** Opposite demo POV so visitors can try landlord and tenant sides. */
export function oppositeDemoRole(role: WelcomeRole | null): WelcomeRole {
  return role === 'landlord' ? 'tenant' : 'landlord'
}
