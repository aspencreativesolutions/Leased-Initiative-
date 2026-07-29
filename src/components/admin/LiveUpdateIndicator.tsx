import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import {
  LIVE_UPDATE_CHANGED_EVENT,
  LIVE_UPDATE_POLL_MS,
  clearLiveUpdateBaseline,
  clearLiveUpdateNoticeSeen,
  fetchLiveUpdateVersion,
  fetchPublicLiveUpdateStatus,
  readCachedLiveUpdateEnabled,
  readLiveUpdateBaseline,
  writeCachedLiveUpdateEnabled,
  writeLiveUpdateBaseline,
} from '@/lib/liveUpdate'
import { isPublicDemoSession, PUBLIC_DEMO_SESSION_KEY } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

/**
 * Top-left live-update beacon for all visitors while Admin Mode has live updates on.
 * The glowing red dot stays until the admin turns the feature off — above notices,
 * through refreshes, and through brief API blips. Every page load / refresh opens an
 * explanation; dismiss closes it for this view only (click the dot to reopen).
 * When a new build is ready, the glowing indicator becomes a refresh button so
 * visitors can reload in place (demo session stays intact).
 */
export function LiveUpdateIndicator() {
  const [enabled, setEnabled] = useState(() => readCachedLiveUpdateEnabled())
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const noticedThisLoadRef = useRef(false)
  const noticeTitleId = useId()
  const noticeDescId = useId()

  const turnOn = useCallback((openNotice: boolean) => {
    writeCachedLiveUpdateEnabled(true)
    setEnabled(true)
    if (openNotice && !noticedThisLoadRef.current) {
      noticedThisLoadRef.current = true
      clearLiveUpdateNoticeSeen()
      setNoticeOpen(true)
    }
  }, [])

  const turnOff = useCallback(() => {
    writeCachedLiveUpdateEnabled(false)
    clearLiveUpdateBaseline()
    setEnabled(false)
    setUpdateAvailable(false)
    setNoticeOpen(false)
    noticedThisLoadRef.current = false
  }, [])

  const sync = useCallback(async () => {
    try {
      const status = await fetchPublicLiveUpdateStatus()
      if (!status.enabled) {
        // Only hide on a definitive “off” from the server — never on network blips.
        turnOff()
        return
      }

      turnOn(!noticedThisLoadRef.current)

      const version = await fetchLiveUpdateVersion()
      if (!version) {
        setUpdateAvailable(false)
        return
      }

      const baseline = readLiveUpdateBaseline()
      if (!baseline) {
        writeLiveUpdateBaseline(version)
        setUpdateAvailable(false)
        return
      }

      setUpdateAvailable(version !== baseline)
    } catch {
      // Keep last known UI (and sticky cache) if the poll fails briefly.
    }
  }, [turnOff, turnOn])

  useEffect(() => {
    // Cached-on: show the load notice immediately, then confirm with the server.
    if (readCachedLiveUpdateEnabled() && !noticedThisLoadRef.current) {
      noticedThisLoadRef.current = true
      clearLiveUpdateNoticeSeen()
      setNoticeOpen(true)
    }
    void sync()
    const interval = window.setInterval(() => {
      void sync()
    }, LIVE_UPDATE_POLL_MS)
    const onFocus = () => {
      void sync()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [sync])

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail
      if (!detail || typeof detail.enabled !== 'boolean') {
        void sync()
        return
      }
      if (!detail.enabled) {
        turnOff()
        return
      }
      // Admin just turned live updates on — show the same warning visitors get.
      noticedThisLoadRef.current = false
      turnOn(true)
      void sync()
    }
    window.addEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
  }, [sync, turnOff, turnOn])

  const dismissNotice = () => {
    setNoticeOpen(false)
  }

  const openNotice = () => {
    setNoticeOpen(true)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    // Wait for the API to be reachable so auth rehydration keeps the current route
    // (avoids demo recover → home during live-update server restarts).
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (res.ok) break
      } catch {
        /* retry */
      }
      await new Promise((resolve) => window.setTimeout(resolve, 400))
    }

    // Re-assert demo session so a mid-refresh storage quirk cannot drop immersion.
    if (isPublicDemoSession()) {
      try {
        sessionStorage.setItem(PUBLIC_DEMO_SESSION_KEY, '1')
      } catch {
        /* ignore */
      }
    }

    const version = await fetchLiveUpdateVersion()
    if (version) writeLiveUpdateBaseline(version)
    // Keep the exact path/query/hash the visitor was on.
    window.location.reload()
  }

  if (!enabled) return null

  return (
    <>
      {/* Beacon sits above the notice overlay so the glowing control is always visible. */}
      <div className="pointer-events-none fixed left-3 top-3 z-[110] flex items-start gap-2">
        {updateAvailable ? (
          <button
            type="button"
            onClick={() => {
              void handleRefresh()
            }}
            disabled={refreshing}
            className="live-update-refresh pointer-events-auto"
            aria-label={
              refreshing ? 'Refreshing to load live updates' : 'Refresh to load live updates'
            }
            title={refreshing ? 'Refreshing…' : 'New update ready — refresh'}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={openNotice}
            className="live-update-dot pointer-events-auto cursor-pointer border-0 p-0"
            aria-label="Live updates in progress — click for details"
            title="Live updates — click for details"
          />
        )}
      </div>

      {noticeOpen ? (
        <div
          className="fixed inset-0 z-[101]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={noticeTitleId}
          aria-describedby={noticeDescId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/45"
            aria-label="Dismiss"
            onClick={dismissNotice}
          />
          <div
            className={cn(
              'absolute left-3 top-12 w-[min(calc(100vw-1.5rem),18.5rem)] rounded-[var(--radius-md)]',
              'border-[length:var(--border-width)] border-ink bg-surface-paper p-3.5 shadow-lift'
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                {updateAvailable ? (
                  <span className="live-update-refresh live-update-refresh--inline">
                    <RefreshCw className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span className="live-update-dot" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={noticeTitleId} className="text-sm font-semibold text-ink">
                  Live updates
                </h2>
                <p id={noticeDescId} className="mt-1 text-[12px] leading-snug text-ink-muted">
                  The developer has turned live update on, meaning active changes are being made.
                  The glowing red dot turns into a refresh icon when the page should be refreshed.
                  This stays until updates are finished.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissNotice}
                className="rounded-[var(--radius-sm)] p-0.5 text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {updateAvailable ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleRefresh()
                  }}
                  disabled={refreshing}
                  className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[#ff1744] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {refreshing ? 'Refreshing…' : 'Refresh page'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismissNotice}
                className="w-full rounded-[var(--radius-sm)] bg-ink px-3 py-2 text-xs font-semibold text-surface"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
