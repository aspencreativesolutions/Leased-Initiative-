import { AsyncLocalStorage } from 'node:async_hooks'

/** @type {AsyncLocalStorage<{ useSandbox: boolean }>} */
export const demoStoreAls = new AsyncLocalStorage()

/** In-memory clone used only for public demo sessions — never written to disk. */
let sandboxStore = null

export function isDemoSandboxActive() {
  return demoStoreAls.getStore()?.useSandbox === true && sandboxStore != null
}

export function getSandboxStore() {
  return sandboxStore
}

export function setSandboxStore(store) {
  sandboxStore = store
}

export function clearSandboxStore() {
  sandboxStore = null
}

export function ensureSandboxFrom(store) {
  sandboxStore = structuredClone(store)
  return sandboxStore
}

export function runInDemoSandbox(fn) {
  if (!sandboxStore) {
    throw new Error('Demo sandbox has not been prepared')
  }
  return demoStoreAls.run({ useSandbox: true }, fn)
}
