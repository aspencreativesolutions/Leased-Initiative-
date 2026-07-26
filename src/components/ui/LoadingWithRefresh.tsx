import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const DEFAULT_DELAY_MS = 5_000

type LoadingWithRefreshProps = {
  message?: string
  onRefresh: () => void
  /** How long to wait before offering Refresh. Defaults to 5 seconds. */
  delayMs?: number
  className?: string
}

/**
 * Full-page / section loading state: spinner first, then a Refresh action
 * after `delayMs` so slow or stuck loads never dump users on a hard error.
 */
export function LoadingWithRefresh({
  message = 'Loading…',
  onRefresh,
  delayMs = DEFAULT_DELAY_MS,
  className,
}: LoadingWithRefreshProps) {
  const [showRefresh, setShowRefresh] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setShowRefresh(true), delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs])

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-ink" strokeWidth={1.5} aria-hidden />
      <p className="text-sm text-ink-muted">{message}</p>
      {showRefresh ? (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onRefresh}
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Refresh
        </Button>
      ) : null}
    </div>
  )
}
