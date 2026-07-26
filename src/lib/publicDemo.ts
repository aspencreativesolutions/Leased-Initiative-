import { apiFetch } from '@/lib/api'
import type { WelcomeRole } from '@/lib/welcomeSlides'

export const PUBLIC_DEMO_SESSION_KEY = 'leased-public-demo'
export const PUBLIC_DEMO_ROLE_KEY = 'leased-public-demo-role'
/** One-shot: after a demo auth session fails, send the visitor home to re-enter a code. */
export const PUBLIC_DEMO_RECOVER_HOME_KEY = 'leased-public-demo-recover-home'
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
/** One-time “tour is optional” notice per POV within a demo session. */
export const PUBLIC_DEMO_TOUR_NOTICE_LANDLORD_KEY = 'leased-public-demo-tour-notice-landlord'
export const PUBLIC_DEMO_TOUR_NOTICE_TENANT_KEY = 'leased-public-demo-tour-notice-tenant'
/** Custom event to open/highlight Menu → Take the tour during the notice. */
export const DEMO_TOUR_NOTICE_HIGHLIGHT_EVENT = 'leased-demo-tour-notice-highlight'
/** After landlord tour notice dismiss — nudge Official Tenants lease tags on mobile. */
export const DEMO_LEASE_TAG_NUDGE_EVENT = 'leased-demo-lease-tag-nudge'
/** Optional visitor first name for personalizing mock messages/docs this demo session. */
export const PUBLIC_DEMO_FIRST_NAME_KEY = 'leased-public-demo-first-name'
/** Shown in templates when the visitor skips the optional first-name field. */
export const DEMO_SENDER_NAME_PLACEHOLDER = '[Your Name]'

export type DemoTourNoticePov = 'landlord' | 'tenant'

export type DemoTourNoticeHighlightDetail = {
  active: boolean
  /** Which menu trigger to target when both mobile and desktop exist. */
  menuScope?: 'mobile' | 'desktop' | 'any'
}

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

/** True when a JWT payload claims `publicDemo` (client-side peek; not signature-verified). */
export function tokenLooksLikePublicDemo(token: string | null | undefined): boolean {
  if (!token) return false
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return false
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as { publicDemo?: unknown }
    return payload.publicDemo === true
  } catch {
    return false
  }
}

/** Mark that the next unauthenticated redirect should go to the homepage demo entry. */
export function markPublicDemoRecoverHome(): void {
  try {
    sessionStorage.setItem(PUBLIC_DEMO_RECOVER_HOME_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** True when a failed demo auth asked to recover on the homepage. */
export function peekPublicDemoRecoverHome(): boolean {
  try {
    return sessionStorage.getItem(PUBLIC_DEMO_RECOVER_HOME_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Unauthenticated demo visitors should land on the homepage Quick Access (key icon)
 * to re-enter a demo code — not on landlord/tenant sign-in.
 */
export function shouldRecoverPublicDemoAtHome(): boolean {
  return isPublicDemoSession() || peekPublicDemoRecoverHome()
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

function tourNoticeStorageKey(pov: DemoTourNoticePov): string {
  return pov === 'landlord'
    ? PUBLIC_DEMO_TOUR_NOTICE_LANDLORD_KEY
    : PUBLIC_DEMO_TOUR_NOTICE_TENANT_KEY
}

function clearDemoTourNoticeState(): void {
  try {
    sessionStorage.removeItem(PUBLIC_DEMO_TOUR_NOTICE_LANDLORD_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_TOUR_NOTICE_TENANT_KEY)
  } catch {
    /* ignore */
  }
}

/** Whether the one-time tour notice has already been dismissed for this POV. */
export function hasSeenDemoTourNotice(pov: DemoTourNoticePov): boolean {
  try {
    return sessionStorage.getItem(tourNoticeStorageKey(pov)) === '1'
  } catch {
    return true
  }
}

export function markDemoTourNoticeSeen(pov: DemoTourNoticePov): void {
  try {
    sessionStorage.setItem(tourNoticeStorageKey(pov), '1')
  } catch {
    /* ignore */
  }
}

/** Expand/highlight Menu → Take the tour while the optional-tour notice is visible. */
export function setDemoTourNoticeHighlight(
  active: boolean,
  menuScope: DemoTourNoticeHighlightDetail['menuScope'] = 'any'
): void {
  try {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent<DemoTourNoticeHighlightDetail>(DEMO_TOUR_NOTICE_HIGHLIGHT_EVENT, {
        detail: { active, menuScope },
      })
    )
  } catch {
    /* ignore */
  }
}

/** Pulse + peek Official Tenants lease tags (mobile landlord demo). */
export function requestDemoLeaseTagNudge(): void {
  try {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(DEMO_LEASE_TAG_NUDGE_EVENT))
  } catch {
    /* ignore */
  }
}

/** Mark the browser session as a public demo. Pass a role once the visitor chooses a POV. */
export function markPublicDemoSession(role?: WelcomeRole | null): void {
  try {
    const wasActive = sessionStorage.getItem(PUBLIC_DEMO_SESSION_KEY) === '1'
    sessionStorage.setItem(PUBLIC_DEMO_SESSION_KEY, '1')
    // New demo session — reset one-time per-POV tour notices and personalization.
    if (!wasActive) {
      clearDemoTourNoticeState()
      sessionStorage.removeItem(PUBLIC_DEMO_FIRST_NAME_KEY)
    }
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
    sessionStorage.removeItem(PUBLIC_DEMO_FIRST_NAME_KEY)
    sessionStorage.removeItem(PUBLIC_DEMO_RECOVER_HOME_KEY)
    clearDemoTourNoticeState()
  } catch {
    /* ignore */
  }
}

/** Optional first name entered on the demo entry screen (session-scoped). */
export function getDemoFirstName(): string | null {
  try {
    const name = sessionStorage.getItem(PUBLIC_DEMO_FIRST_NAME_KEY)?.trim()
    return name || null
  } catch {
    return null
  }
}

/** Persist or clear the optional demo first name for this browser session only. */
export function setDemoFirstName(name: string | null | undefined): void {
  try {
    const trimmed = name?.trim() ?? ''
    if (trimmed) {
      sessionStorage.setItem(PUBLIC_DEMO_FIRST_NAME_KEY, trimmed)
    } else {
      sessionStorage.removeItem(PUBLIC_DEMO_FIRST_NAME_KEY)
    }
  } catch {
    /* ignore */
  }
}

/**
 * In a public demo: visitor first name, or `[Your Name]` when skipped.
 * Outside a public demo: `null` (callers should use account settings).
 */
export function resolveDemoSenderName(): string | null {
  if (!isPublicDemoSession()) return null
  return getDemoFirstName() || DEMO_SENDER_NAME_PLACEHOLDER
}

/**
 * Display name for landlord → tenant mock messages and document signatures.
 * Prefers the optional demo first name while a public demo is active.
 */
export function resolveLandlordSenderName(settings: {
  ownerName?: string
  businessName?: string
}): string {
  const demoName = resolveDemoSenderName()
  if (demoName) return demoName
  const owner = settings.ownerName?.trim()
  if (owner && owner !== 'Your Name') return owner
  return settings.businessName?.trim() || 'Your landlord'
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
  role: WelcomeRole,
  firstName?: string | null
): Promise<DemoRedeemResponse> {
  return apiFetch<DemoRedeemResponse>('/api/demo/redeem', {
    method: 'POST',
    body: JSON.stringify({
      code,
      role,
      ...(firstName?.trim() ? { firstName: firstName.trim() } : {}),
    }),
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
  token: string,
  firstName?: string | null
): Promise<{ ok: true; publicDemo: true; companyName: string; message: string }> {
  return apiFetch(`/api/demo/company-link/${encodeURIComponent(token)}/redeem`, {
    method: 'POST',
    body: JSON.stringify({
      ...(firstName?.trim() ? { firstName: firstName.trim() } : {}),
    }),
  })
}

export interface DemoVisitorEntry {
  id: string
  firstName: string
  source: 'access-code' | 'company-link'
  companyName?: string
  createdAt: string
}

export async function fetchAdminDemoVisitors(): Promise<{ visitors: DemoVisitorEntry[] }> {
  return apiFetch<{ visitors: DemoVisitorEntry[] }>('/api/dev/admin/demo-visitors')
}

/** Opposite demo POV so visitors can try landlord and tenant sides. */
export function oppositeDemoRole(role: WelcomeRole | null): WelcomeRole {
  return role === 'landlord' ? 'tenant' : 'landlord'
}
