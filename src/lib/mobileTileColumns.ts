import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** Shared across Rentals, Official Tenants, Lease Agreements, and Payments on mobile. */
export const MOBILE_TILE_COLUMNS_KEY = 'leased-mobile-tile-columns-v2'

export type MobileTileColumns = 1 | 2

export const MOBILE_TILE_COLUMNS_DEFAULT: MobileTileColumns = 2

function isMobileTileColumns(value: unknown): value is MobileTileColumns {
  return value === 1 || value === 2
}

export function loadMobileTileColumns(
  storageKey: string = MOBILE_TILE_COLUMNS_KEY
): MobileTileColumns {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw == null) return MOBILE_TILE_COLUMNS_DEFAULT
    const parsed = Number(raw)
    if (isMobileTileColumns(parsed)) return parsed
  } catch {
    /* localStorage unavailable */
  }
  return MOBILE_TILE_COLUMNS_DEFAULT
}

export function saveMobileTileColumns(
  columns: MobileTileColumns,
  storageKey: string = MOBILE_TILE_COLUMNS_KEY
): void {
  try {
    localStorage.setItem(storageKey, String(columns))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Persist 1- or 2-column mobile tile preference. */
export function useMobileTileColumns(
  storageKey: string = MOBILE_TILE_COLUMNS_KEY
) {
  const [columns, setColumnsState] = useState(() =>
    loadMobileTileColumns(storageKey)
  )

  useEffect(() => {
    saveMobileTileColumns(columns, storageKey)
  }, [columns, storageKey])

  const setColumns = (next: MobileTileColumns) => {
    setColumnsState(next)
  }

  return { columns, setColumns }
}

/**
 * Mobile: fixed 1 or 2 columns. Desktop (md+): lease auto-fit centered square grid.
 */
export function sectionTileGridClassName(columns: MobileTileColumns): string {
  return cn(
    'section-tile-grid grid w-full min-w-0',
    columns === 1 ? 'section-tile-grid--cols-1' : 'section-tile-grid--cols-2'
  )
}
