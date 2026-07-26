import { useCallback, useEffect, useId, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import {
  LIVE_UPDATE_CHANGED_EVENT,
  LIVE_UPDATE_POLL_MS,
  clearLiveUpdateBaseline,
  fetchLiveUpdateVersion,
  fetchPublicLiveUpdateStatus,
  hasSeenLiveUpdateNotice,
  markLiveUpdateNoticeSeen,
  readLiveUpdateBaseline,
  writeLiveUpdateBaseline,
} from '@/lib/liveUpdate'
import { cn } from '@/lib/utils'

type IndicatorMode = 'hidden' | 'watching' | 'refresh'

/**
 * Top-left live-update beacon for all visitors while Admin Mode has live updates on.
 * Pulsing red dot while waiting; turns into a refresh control when a new build is detected.
 */
export function LiveUpdateIndicator() {
  const [mode, setMode] = useState<IndicatorMode>('hidden')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const noticeTitleId = useId()
  const noticeDescId = useId()

  const sync = useCallback(async () => {
    try {
      const status = await fetchPublicLiveUpdateStatus()
      if (!status.enabled) {
        clearLiveUpdateBaseline()
        setMode('hidden')
        setNoticeOpen(false)
        return
      }

      const version = await fetchLiveUpdateVersion()
      if (!version) {
        setMode('watching')
        return
      }

      const baseline = readLiveUpdateBaseline()
      if (!baseline) {
        writeLiveUpdateBaseline(version)
        setMode('watching')
        return
      }

      if (version !== baseline) {
        setMode('refresh')
        return
      }

      setMode('watching')
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
    if (mode === 'hidden') {
      setNoticeOpen(false)
      return
    }
    if (hasSeenLiveUpdateNotice()) return
    setNoticeOpen(true)
  }, [mode])

  const dismissNotice = () => {
    markLiveUpdateNoticeSeen()
    setNoticeOpen(false)
  }

  const handleRefresh = async () => {
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

  if (mode === 'hidden') return null

  return (
    <>
      <div className="pointer-events-none fixed left-3 top-3 z-[100] flex items-start gap-2">
        {mode === 'watching' ? (
          <span
            className="live-update-dot pointer-events-auto"
            role="status"
            aria-label="Live updates in progress"
            title="Live updates in progress"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              void handleRefresh()
            }}
            className="live-update-refresh pointer-events-auto"
            aria-label="Refresh to apply live updates"
            title="Refresh to apply updates"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </button>
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
                <span className="live-update-dot" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={noticeTitleId} className="text-sm font-semibold text-ink">
                  Live updates
                </h2>
                <p id={noticeDescId} className="mt-1 text-[12px] leading-snug text-ink-muted">
                  The developer has turned live update on, meaning active changes are being made.
                  When the glowing dot turns to a refresh button refresh the page.
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
            <button
              type="button"
              onClick={dismissNotice}
              className="mt-3 w-full rounded-[var(--radius-sm)] bg-ink px-3 py-2 text-xs font-semibold text-surface"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
