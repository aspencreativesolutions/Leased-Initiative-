import { apiFetch } from '@/lib/api'
import { isPublicDemoSession, PUBLIC_DEMO_SESSION_KEY } from '@/lib/publicDemo'

export const LIVE_UPDATE_POLL_MS = 4000
export const LIVE_UPDATE_BASELINE_KEY = 'leased-live-update-baseline'
export const LIVE_UPDATE_BOOT_BASELINE_KEY = 'leased-live-update-boot-baseline'
/** Sticky client cache so the beacon stays up across reloads / brief API blips. */
export const LIVE_UPDATE_ENABLED_CACHE_KEY = 'leased-live-update-enabled'
/**
 * After the visitor dismisses the explanation (“Got it”), persist so reloads and
 * route changes do not reopen it. Cleared when live updates is turned off/on.
 */
export const LIVE_UPDATE_NOTICE_SEEN_KEY = 'leased-live-update-notice-seen'
export const LIVE_UPDATE_CHANGED_EVENT = 'leased-live-update-changed'

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
  } catch {
    /* ignore */
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
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as { bootId?: string }
        if (typeof data.bootId === 'string' && data.bootId) {
          writeLiveUpdateBootBaseline(data.bootId)
        }
        break
      }
    } catch {
      /* retry */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400))
  }

  const version = await fetchLiveUpdateVersion()
  if (version) writeLiveUpdateBaseline(version)

  // Re-assert demo session so a mid-refresh storage quirk cannot drop immersion.
  if (typeof window !== 'undefined' && isPublicDemoSession()) {
    try {
      sessionStorage.setItem(PUBLIC_DEMO_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  // Keep the exact path/query/hash the visitor was on.
  window.location.reload()
}
