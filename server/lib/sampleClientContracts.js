import { readStore, updateStore } from '../db.js'
import {
  appendContractToStore,
  clientNeedsContractRecord,
  notifyContractNeedsDetail,
  repairClientContractSync,
} from './ensureClientContract.js'

/** Backfill and sync contracts for clients that show sent/signed/in-progress but have missing or stale records. */
export function ensureSampleClientContracts(store) {
  let nextStore = store
  let changed = false
  let created = 0
  let repaired = 0

  for (const client of store.clients) {
    if (!clientNeedsContractRecord(client)) continue

    const contract = nextStore.contracts.find((c) => c.clientId === client.id)
    const result = repairClientContractSync(client, contract ?? null, nextStore.settings)

    if (!result.changed && !result.created) continue

    nextStore = appendContractToStore(nextStore, result.contract)
    nextStore = {
      ...nextStore,
      clients: nextStore.clients.map((c) => (c.id === client.id ? result.client : c)),
    }
    nextStore = notifyContractNeedsDetail(nextStore, result.client, result.contract)
    changed = true
    if (result.created) created += 1
    else repaired += 1
  }

  return { store: nextStore, changed, created, repaired }
}

export function ensureClientContractRecord(clientId) {
  const store = readStore()
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return store

  const contract = store.contracts.find((c) => c.clientId === clientId)
  const result = repairClientContractSync(client, contract ?? null, store.settings)
  if (!result.changed && !result.created) return store

  return updateStore((s) => {
    let next = appendContractToStore(s, result.contract)
    next = {
      ...next,
      clients: next.clients.map((c) => (c.id === clientId ? result.client : c)),
    }
    if (result.needsDetail) {
      next = notifyContractNeedsDetail(next, result.client, result.contract)
    }
    return next
  })
}
