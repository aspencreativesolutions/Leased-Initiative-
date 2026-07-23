import { describe, expect, it } from 'vitest'
import {
  hideSpreadsheetColumn,
  hiddenSpreadsheetColumns,
  moveSpreadsheetColumn,
  normalizeVisibleSpreadsheetColumns,
  redistributeColumnWidths,
  restoreSpreadsheetColumn,
} from '@/lib/spreadsheetColumnVisibility'

const DEFAULT = [
  'tenant',
  'address',
  'leaseStatus',
  'paymentStatus',
  'leaseEnd',
] as const

type Col = (typeof DEFAULT)[number]

describe('restoreSpreadsheetColumn', () => {
  it('inserts after the closest still-visible predecessor', () => {
    const visible: Col[] = ['tenant', 'address', 'leaseEnd']
    expect(restoreSpreadsheetColumn(visible, 'paymentStatus', DEFAULT)).toEqual([
      'tenant',
      'address',
      'paymentStatus',
      'leaseEnd',
    ])
  })

  it('inserts lease status after address when payment status is also hidden', () => {
    const visible: Col[] = ['tenant', 'address', 'leaseEnd']
    expect(restoreSpreadsheetColumn(visible, 'leaseStatus', DEFAULT)).toEqual([
      'tenant',
      'address',
      'leaseStatus',
      'leaseEnd',
    ])
  })

  it('inserts before the closest successor when no predecessor is visible', () => {
    const visible: Col[] = ['leaseEnd']
    expect(restoreSpreadsheetColumn(visible, 'tenant', DEFAULT)).toEqual([
      'tenant',
      'leaseEnd',
    ])
  })

  it('appends when restoring into an empty visible list', () => {
    expect(restoreSpreadsheetColumn([], 'address', DEFAULT)).toEqual(['address'])
  })

  it('is a no-op when the column is already visible', () => {
    const visible: Col[] = ['tenant', 'address']
    expect(restoreSpreadsheetColumn(visible, 'address', DEFAULT)).toEqual(visible)
  })
})

describe('hideSpreadsheetColumn', () => {
  it('removes the column without affecting others', () => {
    expect(
      hideSpreadsheetColumn(
        ['tenant', 'address', 'leaseStatus', 'paymentStatus', 'leaseEnd'],
        'leaseStatus'
      )
    ).toEqual(['tenant', 'address', 'paymentStatus', 'leaseEnd'])
  })
})

describe('moveSpreadsheetColumn', () => {
  it('moves a column onto another column’s slot', () => {
    expect(
      moveSpreadsheetColumn(
        ['tenant', 'address', 'leaseStatus', 'paymentStatus'],
        'paymentStatus',
        'tenant'
      )
    ).toEqual(['paymentStatus', 'tenant', 'address', 'leaseStatus'])
  })

  it('is a no-op when from and to are the same', () => {
    const visible = ['tenant', 'address'] as const
    expect(moveSpreadsheetColumn(visible, 'tenant', 'tenant')).toEqual([
      'tenant',
      'address',
    ])
  })
})

describe('hiddenSpreadsheetColumns', () => {
  it('returns hidden columns in default order', () => {
    expect(
      hiddenSpreadsheetColumns(['tenant', 'leaseEnd'], DEFAULT)
    ).toEqual(['address', 'leaseStatus', 'paymentStatus'])
  })
})

describe('normalizeVisibleSpreadsheetColumns', () => {
  it('falls back to defaults for empty or invalid input', () => {
    expect(normalizeVisibleSpreadsheetColumns(null, DEFAULT)).toEqual([...DEFAULT])
    expect(normalizeVisibleSpreadsheetColumns([], DEFAULT)).toEqual([...DEFAULT])
    expect(normalizeVisibleSpreadsheetColumns(['nope'], DEFAULT)).toEqual([
      ...DEFAULT,
    ])
  })

  it('keeps a valid partial preference without appending missing columns', () => {
    expect(
      normalizeVisibleSpreadsheetColumns(['address', 'tenant'], DEFAULT)
    ).toEqual(['address', 'tenant'])
  })
})

describe('redistributeColumnWidths', () => {
  it('scales visible widths to fill available space', () => {
    const columns = [
      { id: 'a' as const, width: '40%' },
      { id: 'b' as const, width: '40%' },
      { id: 'c' as const, width: '20%' },
    ]
    const widths = redistributeColumnWidths(columns, ['a', 'c'], 0)
    expect(parseFloat(widths.a)).toBeCloseTo(66.667, 2)
    expect(parseFloat(widths.c)).toBeCloseTo(33.333, 2)
  })

  it('reserves space for a pinned actions column', () => {
    const columns = [
      { id: 'a' as const, width: '50%' },
      { id: 'b' as const, width: '50%' },
    ]
    const widths = redistributeColumnWidths(columns, ['a'], 8)
    expect(widths.a).toBe('92%')
  })
})
