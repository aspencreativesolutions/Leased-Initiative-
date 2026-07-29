import { useEffect, useState, type CSSProperties } from 'react'

/** Percent of “full” tile size. Slider midpoint (100%) is the balanced default. */
export const TILE_SCALE_MIN = 50
export const TILE_SCALE_MAX = 150
/** Midpoint of TILE_SCALE_MIN…MAX — balanced starting view. */
export const TILE_SCALE_DEFAULT = 100
/** Lease grid starts at the slider midpoint; persisted preference still wins when set. */
export const LEASE_TILE_SCALE_DEFAULT = TILE_SCALE_DEFAULT
/** Official Tenants dashboard Tile View — slightly under full so more tiles fit per row. */
export const OFFICIAL_TENANTS_TILE_SCALE_DEFAULT = 95
/** Payments gallery starts at the slider midpoint; persisted preference still wins when set. */
export const PAYMENT_TILE_SCALE_DEFAULT = TILE_SCALE_DEFAULT
export const TILE_SCALE_STEP = 5

/** Base edge length (px) for a lease tile at 100% scale. */
export const LEASE_TILE_BASE_PX = 65

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

/** Fixed-width lease tiles; 65px base module × 4 → 260×260 min at 100%. */
export function leaseTileScaleStyle(factor: number): CSSProperties {
  const edge = Math.round(LEASE_TILE_BASE_PX * 4 * factor)
  return {
    ['--tile-scale' as string]: String(factor),
    ['--tile-gap' as string]: `${1 * factor}rem`,
    ['--tile-pad' as string]: `${1.1 * factor}rem`,
    ['--tile-title' as string]: `${0.95 * factor}rem`,
    ['--tile-body' as string]: `${0.82 * factor}rem`,
    ['--tile-meta' as string]: `${0.72 * factor}rem`,
    ['--tile-label' as string]: `${0.62 * factor}rem`,
    ['--lease-tile-size' as string]: `${edge}px`,
  }
}

/** Auto-fit centered grid of equal squares; denser when scale is near 50%. */
export function leaseTileGridClassName(scale: number): string {
  void scale
  return 'lease-tile-grid grid gap-[var(--tile-gap)]'
}

/** Same fixed module as lease tiles, plus a rent-amount type size. */
export function paymentTileScaleStyle(factor: number): CSSProperties {
  return {
    ...leaseTileScaleStyle(factor),
    ['--tile-amount' as string]: `${1.05 * factor}rem`,
  }
}

/** Auto-fill grid of equal squares — same layout as lease agreements. */
export function paymentTileGridClassName(scale: number): string {
  // `payment-tile-grid` keeps overdue message panels from stretching sibling tiles.
  return `${leaseTileGridClassName(scale)} payment-tile-grid`
}
