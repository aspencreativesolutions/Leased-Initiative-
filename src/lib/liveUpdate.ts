import { apiFetch } from '@/lib/api'

export const LIVE_UPDATE_POLL_MS = 4000
export const LIVE_UPDATE_BASELINE_KEY = 'leased-live-update-baseline'
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LIVE_UPDATE_CHANGED_EVENT, { detail: { enabled: result.enabled } })
    )
  }
  return result
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

export function hasSeenLiveUpdateNotice(): boolean {
  try {
    return localStorage.getItem(LIVE_UPDATE_NOTICE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markLiveUpdateNoticeSeen(): void {
  try {
    localStorage.setItem(LIVE_UPDATE_NOTICE_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}
