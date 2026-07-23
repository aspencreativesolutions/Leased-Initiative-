import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONTRACTS_VISIBLE_COLUMNS_KEY,
  DEFAULT_CONTRACT_TABLE_COLUMNS,
  hiddenContractTableColumns,
  hideContractTableColumn,
  loadContractVisibleColumns,
  moveContractTableColumn,
  resetContractTableColumns,
  restoreContractTableColumn,
  saveContractVisibleColumns,
  type ContractTableColumnId,
} from '@/lib/contractTableColumns'

describe('hide and restore contract table columns', () => {
  it('hides a column without leaving a gap in the order', () => {
    expect(
      hideContractTableColumn([...DEFAULT_CONTRACT_TABLE_COLUMNS], 'duration')
    ).toEqual(['tenant', 'address', 'status', 'progress'])
  })

  it('does not hide the last remaining column', () => {
    const only: ContractTableColumnId[] = ['tenant']
    expect(hideContractTableColumn(only, 'tenant')).toEqual(only)
  })

  it('restores a column to its default-relative position', () => {
    const visible: ContractTableColumnId[] = ['tenant', 'progress']
    expect(restoreContractTableColumn(visible, 'status')).toEqual([
      'tenant',
      'status',
      'progress',
    ])
  })

  it('lists hidden columns in default order', () => {
    expect(hiddenContractTableColumns(['tenant', 'progress'])).toEqual([
      'address',
      'status',
      'duration',
    ])
  })
})

describe('moveContractTableColumn with hidden columns', () => {
  it('reorders without reintroducing hidden columns', () => {
    const order: ContractTableColumnId[] = ['tenant', 'status', 'progress']
    expect(moveContractTableColumn(order, 'progress', 'tenant')).toEqual([
      'progress',
      'tenant',
      'status',
    ])
  })
})

describe('contract table column persistence', () => {
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
    const order: ContractTableColumnId[] = ['tenant', 'status', 'progress']
    saveContractVisibleColumns(order)
    expect(loadContractVisibleColumns()).toEqual(order)
    expect(memory.get(CONTRACTS_VISIBLE_COLUMNS_KEY)).toBeTruthy()
  })

  it('reset restores default order and visibility', () => {
    saveContractVisibleColumns(['tenant'])
    expect(resetContractTableColumns()).toEqual([
      ...DEFAULT_CONTRACT_TABLE_COLUMNS,
    ])
    expect(loadContractVisibleColumns()).toEqual([
      ...DEFAULT_CONTRACT_TABLE_COLUMNS,
    ])
  })
})
