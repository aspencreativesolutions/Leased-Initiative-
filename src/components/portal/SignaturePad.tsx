import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Point = { x: number; y: number }

interface SignaturePadProps {
  className?: string
  /** Called with a PNG data URL when the pad has ink, or null when cleared/empty */
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
}

function getPoint(canvas: HTMLCanvasElement, event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

/**
 * Mouse / touch signature canvas. Emits a PNG data URL while ink is present.
 */
export function SignaturePad({ className, onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const [hasInk, setHasInk] = useState(false)

  const emitEmpty = () => {
    setHasInk(false)
    onChange(null)
  }

  const emitImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setHasInk(true)
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    emitEmpty()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.25
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const onPointerDown = (event: PointerEvent) => {
      if (disabled) return
      event.preventDefault()
      canvas.setPointerCapture(event.pointerId)
      drawingRef.current = true
      lastPointRef.current = getPoint(canvas, event)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!drawingRef.current || disabled) return
      event.preventDefault()
      const next = getPoint(canvas, event)
      const prev = lastPointRef.current
      if (!prev) {
        lastPointRef.current = next
        return
      }
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(next.x, next.y)
      ctx.stroke()
      lastPointRef.current = next
    }

    const endStroke = (event: PointerEvent) => {
      if (!drawingRef.current) return
      drawingRef.current = false
      lastPointRef.current = null
      try {
        canvas.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
      emitImage()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endStroke)
    canvas.addEventListener('pointercancel', endStroke)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endStroke)
      canvas.removeEventListener('pointercancel', endStroke)
    }
    // onChange identity changes are ignored — parent should stabilize or accept re-bind
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-white',
          disabled && 'opacity-60'
        )}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={200}
          className="block h-36 w-full touch-none sm:h-44"
          aria-label="Draw your signature"
          role="img"
        />
        {!hasInk ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-sm italic text-ink-faint">
            Draw your signature here
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">Use your mouse or finger to sign</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !hasInk}
          onClick={clear}
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  )
}
