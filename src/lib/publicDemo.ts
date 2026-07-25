import { apiFetch } from '@/lib/api'
import type { WelcomeRole } from '@/lib/welcomeSlides'

export const PUBLIC_DEMO_SESSION_KEY = 'leased-public-demo'
export const PUBLIC_DEMO_ROLE_KEY = 'leased-public-demo-role'
/** One-time attention cue for the Switch POV control within a demo session. */
export const PUBLIC_DEMO_POV_INTRO_KEY = 'leased-public-demo-pov-intro'
/** Session tip after a tenant application (Waiting to Connect nudge). */
export const PUBLIC_DEMO_POST_APPLY_TIP_KEY = 'leased-public-demo-post-apply-tip'
/** Tip text waiting to be shown by Switch POV (survives mount race). */
export const PUBLIC_DEMO_POV_PENDING_TIP_KEY = 'leased-public-demo-pov-pending-tip'
/** Applicant email to highlight under Waiting to Connect after POV switch. */
export const PUBLIC_DEMO_WAITING_CONNECT_HIGHLIGHT_KEY =
  'leased-public-demo-waiting-connect-highlight'
/** Applicant display name for landlord guide cues. */
export const PUBLIC_DEMO_APPLICANT_NAME_KEY = 'leased-public-demo-applicant-name'
/** Spotlight New Registrants after switching to landlord. */
export const PUBLIC_DEMO_NEW_REGISTRANTS_CUE_KEY = 'leased-public-demo-new-registrants-cue'
/** Spotlight Pending Tenants after accepting an applicant. */
export const PUBLIC_DEMO_PENDING_TENANT_CUE_KEY = 'leased-public-demo-pending-tenant-cue'
/** Custom event to expand + animate Switch POV with an optional tip. */
export const DEMO_POV_ATTENTION_EVENT = 'leased-demo-pov-attention'
/** Custom event for tour-like landlord guide cues. */
export const DEMO_GUIDE_CUE_EVENT = 'leased-demo-guide-cue'

export const DEMO_POST_APPLY_TIP =
  'Tap Switch to Landlord POV — you’ll land on New Registrants / Waiting to Connect without choosing a role again.'

export const DEMO_AVA_TENANT_KEY = 'pending-fresh'
export const DEMO_AVA_EMAIL = 'ava.mitchell@example.com'
export const DEMO_AVA_NAME = 'Ava Mitchell'

export type DemoGuideCueKind = 'new-registrants' | 'pending-tenant'

export type DemoGuideCueDetail = {
  kind: DemoGuideCueKind
  name?: string
}

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
    sessionStorage.removeItem(PUBLIC_DEMO_POST_APPLY_TIP_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_POV_PENDING_TIP_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_WAITING_CONNECT_HIGHLIGHT_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_APPLICANT_NAME_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_NEW_REGISTRANTS_CUE_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_PENDING_TENANT_CUE_KEY)
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

export type DemoPovAttentionDetail = {
  tip?: string
}

/** Expand Switch POV with attention animation and an optional tip message. */
export function requestDemoPovAttention(tip?: string): void {
  try {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent<DemoPovAttentionDetail>(DEMO_POV_ATTENTION_EVENT, {
        detail: tip ? { tip } : {},
      })
    )
  } catch {
    /* ignore */
  }
}

function dispatchGuideCue(kind: DemoGuideCueKind, name?: string): void {
  try {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent<DemoGuideCueDetail>(DEMO_GUIDE_CUE_EVENT, {
        detail: { kind, name },
      })
    )
  } catch {
    /* ignore */
  }
}

/**
 * Once per demo session: nudge visitors to switch to landlord after a
 * tenant application is submitted from the portal.
 */
export function requestPostApplyDemoTip(
  applicantEmail?: string | null,
  applicantName?: string | null
): void {
  try {
    if (typeof window === 'undefined') return
    if (!isPublicDemoSession()) return
    if (sessionStorage.getItem(PUBLIC_DEMO_POST_APPLY_TIP_KEY) === '1') return
    sessionStorage.setItem(PUBLIC_DEMO_POST_APPLY_TIP_KEY, '1')
    sessionStorage.setItem(PUBLIC_DEMO_POV_PENDING_TIP_KEY, DEMO_POST_APPLY_TIP)
    const email = applicantEmail?.trim().toLowerCase()
    if (email) {
      sessionStorage.setItem(PUBLIC_DEMO_WAITING_CONNECT_HIGHLIGHT_KEY, email)
    }
    const name = applicantName?.trim() || DEMO_AVA_NAME
    sessionStorage.setItem(PUBLIC_DEMO_APPLICANT_NAME_KEY, name)
    requestDemoPovAttention(DEMO_POST_APPLY_TIP)
  } catch {
    /* ignore */
  }
}

/** Read and clear a pending Switch POV tip (e.g. after Application sent). */
export function consumePendingDemoPovTip(): string | null {
  try {
    const tip = sessionStorage.getItem(PUBLIC_DEMO_POV_PENDING_TIP_KEY)
    if (!tip) return null
    sessionStorage.removeItem(PUBLIC_DEMO_POV_PENDING_TIP_KEY)
    return tip
  } catch {
    return null
  }
}

/** Whether landlord POV should open Waiting to Connect after a post-apply tip. */
export function peekWaitingConnectHighlightEmail(): string | null {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_WAITING_CONNECT_HIGHLIGHT_KEY)
  } catch {
    return null
  }
}

export function peekDemoApplicantName(): string | null {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_APPLICANT_NAME_KEY)
  } catch {
    return null
  }
}

/** Read (without clearing) then later clear via consume after the section mounts. */
export function consumeWaitingConnectHighlightEmail(): string | null {
  try {
    const email = sessionStorage.getItem(PUBLIC_DEMO_WAITING_CONNECT_HIGHLIGHT_KEY)
    if (!email) return null
    sessionStorage.removeItem(PUBLIC_DEMO_WAITING_CONNECT_HIGHLIGHT_KEY)
    return email
  } catch {
    return null
  }
}

/** After landlord switch: spotlight New Registrants in the nav. */
export function requestNewRegistrantsDemoCue(applicantName?: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (!isPublicDemoSession()) return
    const name = applicantName?.trim() || peekDemoApplicantName() || DEMO_AVA_NAME
    sessionStorage.setItem(PUBLIC_DEMO_NEW_REGISTRANTS_CUE_KEY, name)
    dispatchGuideCue('new-registrants', name)
  } catch {
    /* ignore */
  }
}

export function peekNewRegistrantsDemoCue(): string | null {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_NEW_REGISTRANTS_CUE_KEY)
  } catch {
    return null
  }
}

export function consumeNewRegistrantsDemoCue(): string | null {
  try {
    const name = sessionStorage.getItem(PUBLIC_DEMO_NEW_REGISTRANTS_CUE_KEY)
    if (!name) return null
    sessionStorage.removeItem(PUBLIC_DEMO_NEW_REGISTRANTS_CUE_KEY)
    return name
  } catch {
    return null
  }
}

/** After accepting an applicant: spotlight Pending Tenants. */
export function requestPendingTenantDemoCue(applicantName?: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (!isPublicDemoSession()) return
    const name = applicantName?.trim() || peekDemoApplicantName() || DEMO_AVA_NAME
    sessionStorage.setItem(PUBLIC_DEMO_PENDING_TENANT_CUE_KEY, name)
    dispatchGuideCue('pending-tenant', name)
  } catch {
    /* ignore */
  }
}

export function peekPendingTenantDemoCue(): string | null {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_PENDING_TENANT_CUE_KEY)
  } catch {
    return null
  }
}

export function consumePendingTenantDemoCue(): string | null {
  try {
    const name = sessionStorage.getItem(PUBLIC_DEMO_PENDING_TENANT_CUE_KEY)
    if (!name) return null
    sessionStorage.removeItem(PUBLIC_DEMO_PENDING_TENANT_CUE_KEY)
    return name
  } catch {
    return null
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
  return apiFetch<{ code: string; source: string }>('/api/dev/admin/demo-code')
}

export async function saveAdminDemoCode(code: string): Promise<{ code: string }> {
  return apiFetch<{ code: string }>('/api/dev/admin/demo-code', {
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
  return apiFetch<CompanyDemoLinksResponse>('/api/dev/admin/company-demo-links')
}

export async function createAdminCompanyDemoLink(
  companyName: string
): Promise<CreateCompanyDemoLinkResponse> {
  return apiFetch<CreateCompanyDemoLinkResponse>('/api/dev/admin/company-demo-links', {
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
  return apiFetch<CompanyDemoLinkStatus>(`/api/demo/company-link/${encodeURIComponent(token)}`)
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
