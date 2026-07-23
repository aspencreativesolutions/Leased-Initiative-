import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_TENANT_TABLE_COLUMNS,
  hiddenTenantTableColumns,
  hideTenantTableColumn,
  loadTenantTableColumnOrder,
  moveTenantTableColumn,
  normalizeTenantTableColumns,
  resetTenantTableColumnOrder,
  restoreTenantTableColumn,
  saveTenantTableColumnOrder,
  tenantTableColumnWidths,
  type TenantTableColumnId,
} from '@/lib/tenantTableColumns'

describe('normalizeTenantTableColumns', () => {
  it('keeps a partial visible preference without re-adding hidden columns', () => {
    expect(normalizeTenantTableColumns(['tenant', 'paymentStatus'])).toEqual([
      'tenant',
      'paymentStatus',
      'actions',
    ])
  })

  it('drops the legacy leaseStatus column id', () => {
    expect(
      normalizeTenantTableColumns([
        'tenant',
        'contact',
        'address',
        'leaseStatus',
        'paymentStatus',
        'actions',
      ])
    ).toEqual(['tenant', 'contact', 'address', 'paymentStatus', 'actions'])
  })

  it('maps legacy email column id to contact', () => {
    expect(
      normalizeTenantTableColumns([
        'tenant',
        'email',
        'address',
        'paymentStatus',
        'actions',
      ])
    ).toEqual(['tenant', 'contact', 'address', 'paymentStatus', 'actions'])
  })

  it('falls back to defaults for empty or invalid input', () => {
    expect(normalizeTenantTableColumns(null)).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
    expect(normalizeTenantTableColumns([])).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
    expect(normalizeTenantTableColumns(['nope'])).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
  })

  it('always pins actions last', () => {
    expect(normalizeTenantTableColumns(['actions', 'contact', 'tenant'])).toEqual([
      'contact',
      'tenant',
      'actions',
    ])
  })
})

describe('hide and restore tenant table columns', () => {
  it('hides a column without leaving a gap in the order', () => {
    const next = hideTenantTableColumn([...DEFAULT_TENANT_TABLE_COLUMNS], 'contact')
    expect(next).toEqual(['tenant', 'address', 'paymentStatus', 'actions'])
  })

  it('does not hide the last remaining data column', () => {
    const only = normalizeTenantTableColumns(['tenant'])
    expect(hideTenantTableColumn(only, 'tenant')).toEqual(only)
  })

  it('restores a column to its default-relative position', () => {
    const visible: TenantTableColumnId[] = [
      'tenant',
      'address',
      'paymentStatus',
      'actions',
    ]
    expect(restoreTenantTableColumn(visible, 'contact')).toEqual([
      'tenant',
      'contact',
      'address',
      'paymentStatus',
      'actions',
    ])
  })

  it('restores after the closest visible predecessor when neighbors are gone', () => {
    const visible: TenantTableColumnId[] = ['tenant', 'paymentStatus', 'actions']
    expect(restoreTenantTableColumn(visible, 'address')).toEqual([
      'tenant',
      'address',
      'paymentStatus',
      'actions',
    ])
  })

  it('lists hidden columns in default order', () => {
    expect(
      hiddenTenantTableColumns(['tenant', 'paymentStatus', 'actions'])
    ).toEqual(['contact', 'address'])
  })
})

describe('moveTenantTableColumn with hidden columns', () => {
  it('reorders without reintroducing hidden columns', () => {
    const order: TenantTableColumnId[] = [
      'tenant',
      'address',
      'paymentStatus',
      'actions',
    ]
    expect(moveTenantTableColumn(order, 'paymentStatus', 'tenant')).toEqual([
      'paymentStatus',
      'tenant',
      'address',
      'actions',
    ])
  })
})

describe('tenantTableColumnWidths', () => {
  it('redistributes widths across visible columns and reserves actions', () => {
    const widths = tenantTableColumnWidths(['tenant', 'paymentStatus', 'actions'])
    expect(widths.actions).toBe('8%')
    const tenant = parseFloat(widths.tenant)
    const payment = parseFloat(widths.paymentStatus)
    expect(tenant + payment).toBeCloseTo(92, 1)
  })
})

describe('tenant table column persistence', () => {
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
    const order: TenantTableColumnId[] = [
      'tenant',
      'address',
      'paymentStatus',
      'actions',
    ]
    saveTenantTableColumnOrder(order)
    expect(loadTenantTableColumnOrder()).toEqual(order)
  })

  it('reset restores default order and visibility', () => {
    saveTenantTableColumnOrder(['tenant', 'actions'])
    expect(resetTenantTableColumnOrder()).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
    expect(loadTenantTableColumnOrder()).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
  })
})
