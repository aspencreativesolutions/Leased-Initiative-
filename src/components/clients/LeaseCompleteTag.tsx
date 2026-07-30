import { useEffect, useRef, useState } from 'react'
import { requestKeyReturnNotification } from '@/lib/keyReturnNotifyApi'
import { buildKeyReturnNotificationMessage, getKeyReturnPreferences } from '@/lib/keyReturn'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

interface LeaseCompleteTagProps {
  clientId: string
  className?: string
}

/**
 * Red Lease Complete control. Hover shows “Request Key Return” and sends the
 * key-return notice (deduped server-side). Click does the same for keyboard/touch.
 */
export function LeaseCompleteTag({ clientId, className }: LeaseCompleteTagProps) {
  const { settings } = useApp()
  const prefs = getKeyReturnPreferences(settings)
  const notice = buildKeyReturnNotificationMessage(prefs)
  const [hovered, setHovered] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const hoverTimer = useRef<number | null>(null)
  const requestedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current)
    }
  }, [])

  const sendNotice = async () => {
    if (requestedRef.current || status === 'sending') return
    requestedRef.current = true
    setStatus('sending')
    try {
      await requestKeyReturnNotification(clientId)
      setStatus('sent')
    } catch {
      requestedRef.current = false
      setStatus('error')
    }
  }

  const label =
    status === 'sent'
      ? 'Key Return Requested'
      : status === 'sending'
        ? 'Sending…'
        : hovered
          ? 'Request Key Return'
          : 'Lease Complete'

  return (
    <button
      type="button"
      className={cn(
        'shrink-0 rounded-[var(--radius-sm)] border-2 border-accent bg-accent-light px-1.5 py-0.5',
        'text-[8px] font-black uppercase leading-none tracking-caps text-accent',
        'transition-colors hover:border-accent hover:bg-accent hover:text-white',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
        className
      )}
      title={notice}
      aria-label={
        status === 'sent'
          ? 'Key return notice sent'
          : `Lease complete. Request key return: ${notice}`
      }
      onMouseEnter={() => {
        setHovered(true)
        if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current)
        hoverTimer.current = window.setTimeout(() => {
          void sendNotice()
        }, 350)
      }}
      onMouseLeave={() => {
        setHovered(false)
        if (hoverTimer.current != null) {
          window.clearTimeout(hoverTimer.current)
          hoverTimer.current = null
        }
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => void sendNotice()}
      disabled={status === 'sending'}
    >
      {label}
    </button>
  )
}
