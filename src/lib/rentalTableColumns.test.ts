import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_RENTAL_TABLE_COLUMNS,
  hiddenRentalTableColumns,
  hideRentalTableColumn,
  loadRentalVisibleColumns,
  moveRentalTableColumn,
  resetRentalTableColumns,
  restoreRentalTableColumn,
  RENTALS_VISIBLE_COLUMNS_KEY,
  saveRentalVisibleColumns,
  type RentalTableColumnId,
} from '@/lib/rentalTableColumns'

describe('hide and restore rental table columns', () => {
  it('hides a column without leaving a gap in the order', () => {
    expect(
      hideRentalTableColumn([...DEFAULT_RENTAL_TABLE_COLUMNS], 'bedrooms')
    ).toEqual([
      'address',
      'propertyType',
      'monthlyRent',
      'occupancy',
      'tenantShare',
      'maxTenants',
      'openUnits',
    ])
  })

  it('does not hide the last remaining column', () => {
    const only: RentalTableColumnId[] = ['address']
    expect(hideRentalTableColumn(only, 'address')).toEqual(only)
  })

  it('restores a column to its default-relative position', () => {
    const visible: RentalTableColumnId[] = [
      'address',
      'monthlyRent',
      'openUnits',
    ]
    expect(restoreRentalTableColumn(visible, 'occupancy')).toEqual([
      'address',
      'monthlyRent',
      'occupancy',
      'openUnits',
    ])
  })

  it('lists hidden columns in default order', () => {
    expect(
      hiddenRentalTableColumns(['address', 'openUnits'])
    ).toEqual([
      'propertyType',
      'monthlyRent',
      'occupancy',
      'tenantShare',
      'bedrooms',
      'maxTenants',
    ])
  })
})

describe('moveRentalTableColumn with hidden columns', () => {
  it('reorders without reintroducing hidden columns', () => {
    const order: RentalTableColumnId[] = [
      'address',
      'monthlyRent',
      'openUnits',
    ]
    expect(moveRentalTableColumn(order, 'openUnits', 'address')).toEqual([
      'openUnits',
      'address',
      'monthlyRent',
    ])
  })
})

describe('rental table column persistence', () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
        removeItem: (key: string) => {
          memory.delete(key)
        },
      },
    })
  })

  it('persists a hidden-column layout across save and load', () => {
    const order: RentalTableColumnId[] = ['address', 'occupancy', 'openUnits']
    saveRentalVisibleColumns(order)
    expect(loadRentalVisibleColumns()).toEqual(order)
    expect(memory.get(RENTALS_VISIBLE_COLUMNS_KEY)).toBeTruthy()
  })

  it('reset restores default order and visibility', () => {
    saveRentalVisibleColumns(['address'])
    expect(resetRentalTableColumns()).toEqual([...DEFAULT_RENTAL_TABLE_COLUMNS])
    expect(loadRentalVisibleColumns()).toEqual([...DEFAULT_RENTAL_TABLE_COLUMNS])
  })
})
