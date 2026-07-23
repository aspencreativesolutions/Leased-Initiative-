import { readStoreFromDisk, writeStoreToDisk } from '../db.js'
import {
  clearSandboxStore,
  ensureSandboxFrom,
} from './demoSandbox.js'
import { forceApplyDemoLeaseFixturesToStore } from './applyDemoLeaseFixtures.js'
import {
  forceReseedLeasedDemoUsers,
  getDemoPassword,
  LEASED_DEMO_USERS,
} from './leasedDemoUsers.js'
import { ensureSamplePortalUsers, purgeRemovedSampleClients } from './samplePortalUsers.js'
import { ensureSampleClientContracts } from './sampleClientContracts.js'
import { ensureSampleHouseholdFields } from './sampleClientDates.js'
import { purgeImportedLeaseScanData } from './purgeImportedLeaseScan.js'
import { ensureStoreProperties } from './properties.js'

const DEFAULT_DEMO_CODE = 'LEASED'

export function getConfiguredDemoCode(store) {
  const fromSettings = store?.settings?.demoAccessCode
  if (typeof fromSettings === 'string' && fromSettings.trim()) {
    return fromSettings.trim()
  }
  const fromEnv = process.env.DEMO_ACCESS_CODE
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim()
  }
  return DEFAULT_DEMO_CODE
}

export function normalizeDemoCode(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
}

export function demoCodesMatch(provided, expected) {
  return normalizeDemoCode(provided) === normalizeDemoCode(expected)
}

export function demoAccountForRole(role) {
  const key = role === 'landlord' ? 'landlord' : 'active'
  const demo = LEASED_DEMO_USERS.find((d) => d.key === key)
  if (!demo) return null
  const email = demo.email
  return {
    key: demo.key,
    email,
    password: getDemoPassword(email),
    name: demo.name,
    role: demo.role,
    label: demo.label,
    loginPath: demo.role === 'admin' ? '/studio/login' : '/login',
    homePath: demo.role === 'admin' ? '/studio' : '/portal',
    accountRole: role === 'landlord' ? 'landlord' : 'tenant',
  }
}

/**
 * Wipe + recreate leased demos (and samples) on disk, then refresh the sandbox
 * from that baseline so public demo exploration starts clean.
 */
export async function preparePublicDemoStore() {
  let store = readStoreFromDisk()
  const demoResult = await forceReseedLeasedDemoUsers(store)
  store = demoResult.store

  const importPurge = purgeImportedLeaseScanData(store)
  store = importPurge.store

  const propertiesResult = ensureStoreProperties(store)
  store = propertiesResult.store

  const purgeResult = purgeRemovedSampleClients(store)
  store = purgeResult.store

  const portalResult = await ensureSamplePortalUsers(store)
  store = portalResult.store

  const householdResult = ensureSampleHouseholdFields(store)
  store = householdResult.store

  const contractResult = ensureSampleClientContracts(store)
  store = contractResult.store

  const fixtures = forceApplyDemoLeaseFixturesToStore(store)
  store = fixtures.store

  writeStoreToDisk(store)
  ensureSandboxFrom(store)

  return {
    store,
    createdUsers: demoResult.createdUsers,
  }
}

export function resetPublicDemoAfterExit() {
  clearSandboxStore()
}

export function setDemoAccessCodeOnStore(store, code) {
  const trimmed = String(code ?? '').trim()
  if (!trimmed) {
    return {
      store,
      error: 'Demo access code cannot be empty',
    }
  }
  if (trimmed.length < 4 || trimmed.length > 64) {
    return {
      store,
      error: 'Demo access code must be between 4 and 64 characters',
    }
  }
  return {
    store: {
      ...store,
      settings: {
        ...store.settings,
        demoAccessCode: trimmed,
      },
    },
  }
}
