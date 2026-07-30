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
  withTenantArrangementColumn,
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

  it('never persists arrangement in saved layouts', () => {
    expect(
      normalizeTenantTableColumns([
        'tenant',
        'arrangement',
        'contact',
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

describe('withTenantArrangementColumn', () => {
  it('inserts Arrangement immediately after Tenant when enabled', () => {
    expect(
      withTenantArrangementColumn([...DEFAULT_TENANT_TABLE_COLUMNS], true)
    ).toEqual([
      'tenant',
      'arrangement',
      'contact',
      'address',
      'paymentStatus',
      'actions',
    ])
  })

  it('follows Tenant when the user reorders columns', () => {
    expect(
      withTenantArrangementColumn(
        ['contact', 'tenant', 'address', 'paymentStatus', 'actions'],
        true
      )
    ).toEqual([
      'contact',
      'tenant',
      'arrangement',
      'address',
      'paymentStatus',
      'actions',
    ])
  })

  it('strips Arrangement when Show Arrangements is off', () => {
    expect(
      withTenantArrangementColumn(
        ['tenant', 'arrangement', 'contact', 'actions'],
        false
      )
    ).toEqual(['tenant', 'contact', 'actions'])
  })

  it('inserts before Actions when Tenant is hidden', () => {
    expect(
      withTenantArrangementColumn(
        ['contact', 'address', 'paymentStatus', 'actions'],
        true
      )
    ).toEqual(['contact', 'address', 'paymentStatus', 'arrangement', 'actions'])
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

  it('does not hide the Arrangement toggle column via Edit Columns', () => {
    const order: TenantTableColumnId[] = [
      'tenant',
      'arrangement',
      'contact',
      'actions',
    ]
    expect(hideTenantTableColumn(order, 'arrangement')).toEqual([
      'tenant',
      'contact',
      'actions',
    ])
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

  it('ignores Arrangement as a drag target and strips it from the result', () => {
    const order: TenantTableColumnId[] = [
      'tenant',
      'arrangement',
      'contact',
      'actions',
    ]
    expect(moveTenantTableColumn(order, 'contact', 'arrangement')).toEqual([
      'tenant',
      'contact',
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

  it('includes Arrangement width when the column is visible', () => {
    const widths = tenantTableColumnWidths([
      'tenant',
      'arrangement',
      'paymentStatus',
      'actions',
    ])
    expect(widths.actions).toBe('8%')
    const total =
      parseFloat(widths.tenant) +
      parseFloat(widths.arrangement) +
      parseFloat(widths.paymentStatus)
    expect(total).toBeCloseTo(92, 1)
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

  it('does not persist Arrangement in localStorage', () => {
    saveTenantTableColumnOrder([
      'tenant',
      'arrangement',
      'contact',
      'address',
      'paymentStatus',
      'actions',
    ])
    expect(loadTenantTableColumnOrder()).toEqual([
      'tenant',
      'contact',
      'address',
      'paymentStatus',
      'actions',
    ])
  })

  it('reset restores default order and visibility', () => {
    saveTenantTableColumnOrder(['tenant', 'actions'])
    expect(resetTenantTableColumnOrder()).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
    expect(loadTenantTableColumnOrder()).toEqual([...DEFAULT_TENANT_TABLE_COLUMNS])
  })
})
