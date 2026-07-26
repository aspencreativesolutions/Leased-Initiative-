import { useCallback, useEffect, useId, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import {
  LIVE_UPDATE_CHANGED_EVENT,
  LIVE_UPDATE_POLL_MS,
  clearLiveUpdateBaseline,
  clearLiveUpdateNoticeSeen,
  fetchLiveUpdateVersion,
  fetchPublicLiveUpdateStatus,
  hasSeenLiveUpdateNotice,
  markLiveUpdateNoticeSeen,
  readLiveUpdateBaseline,
  writeLiveUpdateBaseline,
} from '@/lib/liveUpdate'
import { cn } from '@/lib/utils'

/**
 * Top-left live-update beacon for all visitors while Admin Mode has live updates on.
 * The glowing red dot stays visible the whole time; click it for an explanation.
 * When a new build is ready, the explanation offers Refresh.
 */
export function LiveUpdateIndicator() {
  const [enabled, setEnabled] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const noticeTitleId = useId()
  const noticeDescId = useId()

  const sync = useCallback(async () => {
    try {
      const status = await fetchPublicLiveUpdateStatus()
      if (!status.enabled) {
        clearLiveUpdateBaseline()
        setEnabled(false)
        setUpdateAvailable(false)
        setNoticeOpen(false)
        return
      }

      setEnabled(true)

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
      // Keep last known UI if the poll fails briefly.
    }
  }, [])

  useEffect(() => {
    void sync()
    const interval = window.setInterval(() => {
      void sync()
    }, LIVE_UPDATE_POLL_MS)
    const onFocus = () => {
      void sync()
    }
    const onChanged = () => {
      void sync()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
    }
  }, [sync])

  useEffect(() => {
    if (!enabled) {
      setNoticeOpen(false)
      return
    }
    if (hasSeenLiveUpdateNotice()) return
    setNoticeOpen(true)
  }, [enabled])

  useEffect(() => {
    const onChanged = (event: Event) => {
      const nextEnabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled)
      if (!nextEnabled) {
        setNoticeOpen(false)
        return
      }
      // When live updates are turned on (including from Admin Mode), show the
      // same first-load warning users see — even if this tab already dismissed it.
      clearLiveUpdateNoticeSeen()
      setNoticeOpen(true)
    }
    window.addEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
  }, [])

  const dismissNotice = () => {
    markLiveUpdateNoticeSeen()
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

    const version = await fetchLiveUpdateVersion()
    if (version) writeLiveUpdateBaseline(version)
    // Keep the exact path/query/hash the visitor was on.
    window.location.reload()
  }

  if (!enabled) return null

  return (
    <>
      <div className="pointer-events-none fixed left-3 top-3 z-[100] flex items-start gap-2">
        <button
          type="button"
          onClick={openNotice}
          className={cn(
            'live-update-dot pointer-events-auto cursor-pointer border-0 p-0',
            updateAvailable && 'live-update-dot--update-ready'
          )}
          aria-label={
            updateAvailable
              ? 'Live updates available — click for details'
              : 'Live updates in progress — click for details'
          }
          title={
            updateAvailable
              ? 'New update ready — click for details'
              : 'Live updates — click for details'
          }
        />
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
                <span
                  className={cn(
                    'live-update-dot',
                    updateAvailable && 'live-update-dot--update-ready'
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={noticeTitleId} className="text-sm font-semibold text-ink">
                  Live updates
                </h2>
                <p id={noticeDescId} className="mt-1 text-[12px] leading-snug text-ink-muted">
                  The developer has turned live update on, meaning active changes are being made.
                  Click the glowing red dot anytime to see this reminder.
                  {updateAvailable
                    ? ' A new update is ready — refresh the page to load it.'
                    : null}
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
