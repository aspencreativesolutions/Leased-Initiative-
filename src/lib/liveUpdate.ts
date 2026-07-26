import { apiFetch } from '@/lib/api'

export const LIVE_UPDATE_POLL_MS = 4000
export const LIVE_UPDATE_BASELINE_KEY = 'leased-live-update-baseline'
/** Sticky client cache so the beacon stays up across reloads / brief API blips. */
export const LIVE_UPDATE_ENABLED_CACHE_KEY = 'leased-live-update-enabled'
/** Legacy key — cleared so refresh always re-shows the live-update notice. */
export const LIVE_UPDATE_NOTICE_SEEN_KEY = 'leased-live-update-notice-seen'
export const LIVE_UPDATE_CHANGED_EVENT = 'leased-live-update-changed'

export type LiveUpdateStatus = {
  enabled: boolean
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
    if (nextEnabled) {
      // Drop any stale “seen” flags so the load/refresh notice can show.
      clearLiveUpdateNoticeSeen()
    } else {
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

export function clearLiveUpdateBaseline(): void {
  try {
    sessionStorage.removeItem(LIVE_UPDATE_BASELINE_KEY)
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
