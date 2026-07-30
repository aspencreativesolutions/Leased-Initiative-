import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import {
  LIVE_UPDATE_CHANGED_EVENT,
  LIVE_UPDATE_POLL_MS,
  clearLiveUpdateBaseline,
  clearLiveUpdateNoticeSeen,
  fetchLiveUpdateRevision,
  fetchPublicLiveUpdateStatus,
  isLiveUpdateRevisionNewer,
  performLiveUpdateRefresh,
  readCachedLiveUpdateEnabled,
  readLiveUpdateNoticeSeen,
  settleLiveUpdateAfterRefresh,
  writeCachedLiveUpdateEnabled,
  writeLiveUpdateNoticeSeen,
} from '@/lib/liveUpdate'
import { cn } from '@/lib/utils'

/**
 * Top-left live-update beacon for all visitors while Admin Mode has live updates on.
 * The glowing red dot stays visible until the admin turns the feature off — through
 * refreshes, route changes, and brief API blips. The explanation opens once when
 * live updates first turns on (or when the visitor clicks the dot); “Got it” keeps
 * it dismissed across reloads until they open it again.
 *
 * When a frontend or backend revision changes, the beacon becomes a spinning refresh
 * control and the page reloads automatically in place — same URL, demo session intact.
 */
export function LiveUpdateIndicator() {
  const [enabled, setEnabled] = useState(() => readCachedLiveUpdateEnabled())
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const wasEnabledRef = useRef(readCachedLiveUpdateEnabled())
  const refreshStartedRef = useRef(false)
  const noticeTitleId = useId()
  const noticeDescId = useId()

  const turnOn = useCallback((openNoticeIfUnseen: boolean) => {
    writeCachedLiveUpdateEnabled(true)
    setEnabled(true)
    wasEnabledRef.current = true
    if (openNoticeIfUnseen && !readLiveUpdateNoticeSeen()) {
      setNoticeOpen(true)
    }
  }, [])

  const turnOff = useCallback(() => {
    writeCachedLiveUpdateEnabled(false)
    clearLiveUpdateBaseline()
    clearLiveUpdateNoticeSeen()
    wasEnabledRef.current = false
    refreshStartedRef.current = false
    setEnabled(false)
    setUpdateAvailable(false)
    setNoticeOpen(false)
    setRefreshing(false)
  }, [])

  const startSeamlessRefresh = useCallback(async () => {
    if (refreshStartedRef.current) return
    refreshStartedRef.current = true
    setUpdateAvailable(true)
    setRefreshing(true)
    try {
      await performLiveUpdateRefresh()
    } catch {
      // Allow another attempt on the next poll if reload never happened.
      refreshStartedRef.current = false
      setRefreshing(false)
    }
  }, [])

  const sync = useCallback(async () => {
    try {
      const status = await fetchPublicLiveUpdateStatus()
      if (!status.enabled) {
        // Only hide on a definitive “off” from the server — never on network blips.
        turnOff()
        return
      }

      // Fresh on-cycle (missed an off→on while this tab was open): allow one notice.
      if (!wasEnabledRef.current) {
        clearLiveUpdateNoticeSeen()
      }

      // Keep the beacon on; only auto-open the explanation if it hasn’t been dismissed.
      turnOn(true)

      if (refreshStartedRef.current) return

      const revision = await fetchLiveUpdateRevision()
      if (!revision.version && !revision.bootId) {
        // Keep last known update-available state if both signals blip.
        return
      }

      // Right after a seamless reload: lock in the current revision so the
      // refresh control does not immediately reappear for the same push.
      if (settleLiveUpdateAfterRefresh(revision)) {
        setUpdateAvailable(false)
        return
      }

      if (isLiveUpdateRevisionNewer(revision)) {
        setUpdateAvailable(true)
        void startSeamlessRefresh()
        return
      }

      setUpdateAvailable(false)
    } catch {
      // Keep last known UI (and sticky cache) if the poll fails briefly.
    }
  }, [startSeamlessRefresh, turnOff, turnOn])

  useEffect(() => {
    // Cached-on: show the beacon immediately. Only auto-open the explanation if
    // the visitor has not dismissed it yet for this live-update cycle.
    if (readCachedLiveUpdateEnabled()) {
      setEnabled(true)
      if (!readLiveUpdateNoticeSeen()) {
        setNoticeOpen(true)
      }
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
      // Admin just turned live updates on — show the explanation once for this cycle.
      turnOn(true)
      void sync()
    }
    window.addEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(LIVE_UPDATE_CHANGED_EVENT, onChanged)
  }, [sync, turnOff, turnOn])

  const dismissNotice = () => {
    writeLiveUpdateNoticeSeen()
    setNoticeOpen(false)
  }

  const openNotice = () => {
    setNoticeOpen(true)
  }

  if (!enabled) return null

  const showRefreshControl = updateAvailable || refreshing

  return (
    <>
      {/* Beacon sits above the notice overlay so the glowing control is always visible. */}
      <div className="pointer-events-none fixed left-3 top-3 z-[110] flex items-start gap-2">
        {showRefreshControl ? (
          <button
            type="button"
            onClick={() => {
              void startSeamlessRefresh()
            }}
            disabled={refreshing}
            className="live-update-refresh pointer-events-auto"
            aria-label="Refreshing to load live updates"
            title="Refreshing to load live updates…"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', 'animate-spin')}
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
                {showRefreshControl ? (
                  <span className="live-update-refresh live-update-refresh--inline">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" strokeWidth={2.5} />
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
                  The page refreshes automatically when new changes are ready — you stay on this
                  page. The glowing red dot turns into a refresh icon while that happens. This
                  stays until updates are finished.
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
              {showRefreshControl ? (
                <p className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[#ff1744] px-3 py-2 text-xs font-semibold text-white">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} aria-hidden />
                  Refreshing…
                </p>
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
