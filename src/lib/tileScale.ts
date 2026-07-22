import { useEffect, useState, type CSSProperties } from 'react'

/** Percent of “full” tile size. Default is compact (~half). */
export const TILE_SCALE_MIN = 50
export const TILE_SCALE_MAX = 150
export const TILE_SCALE_DEFAULT = 55
export const TILE_SCALE_STEP = 5

function clampScale(value: number): number {
  const stepped = Math.round(value / TILE_SCALE_STEP) * TILE_SCALE_STEP
  return Math.min(TILE_SCALE_MAX, Math.max(TILE_SCALE_MIN, stepped))
}

function readStoredScale(storageKey: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw == null) return fallback
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return fallback
    return clampScale(parsed)
  } catch {
    return fallback
  }
}

/** Persist tile magnification (percent) per page. */
export function useTileScale(
  storageKey: string,
  defaultScale: number = TILE_SCALE_DEFAULT
) {
  const [scale, setScaleState] = useState(() =>
    readStoredScale(storageKey, clampScale(defaultScale))
  )

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(scale))
    } catch {
      /* ignore quota / private mode */
    }
  }, [scale, storageKey])

  const setScale = (next: number) => {
    setScaleState(clampScale(next))
  }

  return {
    /** 50–150 */
    scale,
    setScale,
    /** 0.5–1.5 multiplier for CSS vars / layout */
    factor: scale / 100,
  }
}

/** Denser grids at lower magnification; roomier at higher. */
export function tileGridClassName(scale: number): string {
  if (scale <= 65) {
    return 'grid grid-cols-2 gap-[var(--tile-gap)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
  }
  if (scale <= 90) {
    return 'grid grid-cols-1 gap-[var(--tile-gap)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }
  if (scale <= 120) {
    return 'grid grid-cols-1 gap-[var(--tile-gap)] sm:grid-cols-2 lg:grid-cols-3'
  }
  return 'grid grid-cols-1 gap-[var(--tile-gap)] sm:grid-cols-2'
}

export function tileScaleStyle(factor: number): CSSProperties {
  return {
    ['--tile-scale' as string]: String(factor),
    ['--tile-gap' as string]: `${0.65 * factor}rem`,
    ['--tile-pad' as string]: `${0.7 * factor}rem`,
    ['--tile-title' as string]: `${0.8 * factor}rem`,
    ['--tile-body' as string]: `${0.72 * factor}rem`,
    ['--tile-meta' as string]: `${0.62 * factor}rem`,
    ['--tile-label' as string]: `${0.55 * factor}rem`,
  }
}
