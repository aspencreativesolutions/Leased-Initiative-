import { apiFetch } from '@/lib/api'
import {
  isPublicDemoSession,
  PUBLIC_DEMO_RECOVER_HOME_KEY,
  PUBLIC_DEMO_SESSION_KEY,
} from '@/lib/publicDemo'

export const LIVE_UPDATE_POLL_MS = 4000
export const LIVE_UPDATE_BASELINE_KEY = 'leased-live-update-baseline'
export const LIVE_UPDATE_BOOT_BASELINE_KEY = 'leased-live-update-boot-baseline'
/**
 * Set just before a seamless reload so the next boot adopts the current revision
 * as baseline (no immediate re-prompt while the server is still settling).
 */
export const LIVE_UPDATE_JUST_REFRESHED_KEY = 'leased-live-update-just-refreshed'
/** Sticky client cache so the beacon stays up across reloads / brief API blips. */
export const LIVE_UPDATE_ENABLED_CACHE_KEY = 'leased-live-update-enabled'
/**
 * After the visitor dismisses the explanation (“Got it”), persist so reloads and
 * route changes do not reopen it. Cleared when live updates is turned off/on.
 */
export const LIVE_UPDATE_NOTICE_SEEN_KEY = 'leased-live-update-notice-seen'
export const LIVE_UPDATE_CHANGED_EVENT = 'leased-live-update-changed'

const LIVE_UPDATE_HEALTH_ATTEMPTS = 30
const LIVE_UPDATE_HEALTH_DELAY_MS = 400

export type LiveUpdateStatus = {
  enabled: boolean
}

export type LiveUpdateRevision = {
  /** Frontend / file-watch version from /live-update-version.json */
  version: string | null
  /** Backend process boot id from /api/health */
  bootId: string | null
}

export async function fetchPublicLiveUpdateStatus(): Promise<LiveUpdateStatus> {
  const res = await fetch('/api/demo/live-update', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('Could not load live update status')
  }
  const data = (await res.json()) as LiveUpdateStatus
  return { enabled: Boolean(data.enabled) }
}

export async function fetchAdminLiveUpdateStatus(): Promise<LiveUpdateStatus> {
  return apiFetch<LiveUpdateStatus>('/api/dev/admin/live-update')
}

export async function saveAdminLiveUpdateEnabled(enabled: boolean): Promise<LiveUpdateStatus> {
  const result = await apiFetch<LiveUpdateStatus & { ok: boolean }>('/api/dev/admin/live-update', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
  const nextEnabled = Boolean(result.enabled)
  writeCachedLiveUpdateEnabled(nextEnabled)
  if (typeof window !== 'undefined') {
    // New on/off cycle: reset explanation so the next “on” can show it once.
    clearLiveUpdateNoticeSeen()
    if (!nextEnabled) {
      clearLiveUpdateBaseline()
    }
    window.dispatchEvent(
      new CustomEvent(LIVE_UPDATE_CHANGED_EVENT, { detail: { enabled: nextEnabled } })
    )
  }
  return { enabled: nextEnabled }
}

export async function fetchLiveUpdateVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/live-update-version.json?_=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return typeof data.version === 'string' && data.version ? data.version : null
  } catch {
    return null
  }
}

/** Backend boot id — changes whenever the API process restarts. */
export async function fetchLiveUpdateBootId(): Promise<string | null> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { bootId?: string }
    return typeof data.bootId === 'string' && data.bootId ? data.bootId : null
  } catch {
    return null
  }
}

export async function fetchLiveUpdateRevision(): Promise<LiveUpdateRevision> {
  const [version, bootId] = await Promise.all([fetchLiveUpdateVersion(), fetchLiveUpdateBootId()])
  return { version, bootId }
}

export function readCachedLiveUpdateEnabled(): boolean {
  try {
    return localStorage.getItem(LIVE_UPDATE_ENABLED_CACHE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeCachedLiveUpdateEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LIVE_UPDATE_ENABLED_CACHE_KEY, '1')
    } else {
      localStorage.removeItem(LIVE_UPDATE_ENABLED_CACHE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function readLiveUpdateBaseline(): string | null {
  try {
    return sessionStorage.getItem(LIVE_UPDATE_BASELINE_KEY)
  } catch {
    return null
  }
}

export function writeLiveUpdateBaseline(version: string): void {
  try {
    sessionStorage.setItem(LIVE_UPDATE_BASELINE_KEY, version)
  } catch {
    /* ignore */
  }
}

export function readLiveUpdateBootBaseline(): string | null {
  try {
    return sessionStorage.getItem(LIVE_UPDATE_BOOT_BASELINE_KEY)
  } catch {
    return null
  }
}

export function writeLiveUpdateBootBaseline(bootId: string): void {
  try {
    sessionStorage.setItem(LIVE_UPDATE_BOOT_BASELINE_KEY, bootId)
  } catch {
    /* ignore */
  }
}

export function writeLiveUpdateRevisionBaseline(revision: LiveUpdateRevision): void {
  if (revision.version) writeLiveUpdateBaseline(revision.version)
  if (revision.bootId) writeLiveUpdateBootBaseline(revision.bootId)
}

/**
 * True when we have a prior baseline and either the frontend version or the
 * backend boot id has changed since then.
 */
export function isLiveUpdateRevisionNewer(revision: LiveUpdateRevision): boolean {
  const versionBaseline = readLiveUpdateBaseline()
  const bootBaseline = readLiveUpdateBootBaseline()

  // First successful read for each signal — establish baseline, not an update.
  let sawChange = false

  if (revision.version) {
    if (!versionBaseline) {
      writeLiveUpdateBaseline(revision.version)
    } else if (revision.version !== versionBaseline) {
      sawChange = true
    }
  }

  if (revision.bootId) {
    if (!bootBaseline) {
      writeLiveUpdateBootBaseline(revision.bootId)
    } else if (revision.bootId !== bootBaseline) {
      sawChange = true
    }
  }

  return sawChange
}

export function clearLiveUpdateBaseline(): void {
  try {
    sessionStorage.removeItem(LIVE_UPDATE_BASELINE_KEY)
    sessionStorage.removeItem(LIVE_UPDATE_BOOT_BASELINE_KEY)
    sessionStorage.removeItem(LIVE_UPDATE_JUST_REFRESHED_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * After a seamless refresh reload: adopt the current revision as baseline once
 * so the refresh/notice does not immediately reappear for the same push.
 */
export function settleLiveUpdateAfterRefresh(revision: LiveUpdateRevision): boolean {
  try {
    if (sessionStorage.getItem(LIVE_UPDATE_JUST_REFRESHED_KEY) !== '1') return false
    sessionStorage.removeItem(LIVE_UPDATE_JUST_REFRESHED_KEY)
    writeLiveUpdateRevisionBaseline(revision)
    return true
  } catch {
    return false
  }
}

export function readLiveUpdateNoticeSeen(): boolean {
  try {
    return localStorage.getItem(LIVE_UPDATE_NOTICE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function writeLiveUpdateNoticeSeen(): void {
  try {
    localStorage.setItem(LIVE_UPDATE_NOTICE_SEEN_KEY, '1')
    sessionStorage.removeItem(LIVE_UPDATE_NOTICE_SEEN_KEY)
  } catch {
    /* ignore */
  }
}

export function clearLiveUpdateNoticeSeen(): void {
  try {
    sessionStorage.removeItem(LIVE_UPDATE_NOTICE_SEEN_KEY)
    localStorage.removeItem(LIVE_UPDATE_NOTICE_SEEN_KEY)
  } catch {
    /* ignore */
  }
}

/** Preserve demo immersion and current URL, then reload once the API is healthy. */
export async function performLiveUpdateRefresh(options?: {
  onWaiting?: () => void
}): Promise<void> {
  options?.onWaiting?.()

  // Wait for the API so auth rehydration keeps the current route
  // (avoids demo recover → home during live-update server restarts).
  let healthy = false
  let healthyBootId: string | null = null
  for (let attempt = 0; attempt < LIVE_UPDATE_HEALTH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as { bootId?: string }
        healthyBootId =
          typeof data.bootId === 'string' && data.bootId ? data.bootId : null
        healthy = true
        break
      }
    } catch {
      /* retry */
    }
    if (attempt < LIVE_UPDATE_HEALTH_ATTEMPTS - 1) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, LIVE_UPDATE_HEALTH_DELAY_MS)
      )
    }
  }

  if (!healthy) {
    throw new Error('API is not ready for refresh')
  }

  if (healthyBootId) writeLiveUpdateBootBaseline(healthyBootId)

  const version = await fetchLiveUpdateVersion()
  if (version) writeLiveUpdateBaseline(version)

  // Re-assert demo immersion and clear any stale “re-enter code” flag from a
  // mid-restart auth blip so reload stays on this page in demo mode.
  if (typeof window !== 'undefined') {
    try {
      if (isPublicDemoSession()) {
        sessionStorage.setItem(PUBLIC_DEMO_SESSION_KEY, '1')
        sessionStorage.removeItem(PUBLIC_DEMO_RECOVER_HOME_KEY)
      }
      sessionStorage.setItem(LIVE_UPDATE_JUST_REFRESHED_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  // Keep the exact path/query/hash the visitor was on.
  window.location.reload()
}
