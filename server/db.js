import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrateStoreTiers } from './lib/serviceTier.js'
import {
  getSandboxStore,
  isDemoSandboxActive,
  setSandboxStore,
} from './lib/demoSandbox.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'leased-data')
  : path.join(__dirname, 'data')

const DEFAULT_STORE = {
  users: [],
  clients: [],
  contracts: [],
  properties: [],
  settings: {
    businessName: 'Your Studio',
    ownerName: 'Your Name',
    email: '',
    phone: '',
    address: '',
    defaultPaymentTerms: '50% deposit due upon signing; remaining balance due upon project completion.',
    defaultRevisionLimit: '2 rounds',
    defaultContractFooter: 'Thank you for your business.',
    customDefaultLeaseDates: false,
    defaultLeaseStartDate: '',
    defaultLeaseEndDate: '',
  },
  projectFiles: [],
  adminNotifications: [],
  clientNotifications: [],
  adminAuditLog: [],
  tenantInvites: [],
  companyDemoLinks: [],
  bugReports: [],
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function getDbFile() {
  return process.env.CLIENT_CRAFT_DB_FILE || path.join(DATA_DIR, 'store.json')
}

/** Always reads the on-disk store (ignores public-demo sandbox). */
export function readStoreFromDisk() {
  ensureDataDir()
  const dbFile = getDbFile()
  if (!fs.existsSync(dbFile)) {
    writeStoreToDisk(DEFAULT_STORE)
    return structuredClone(DEFAULT_STORE)
  }
  const raw = fs.readFileSync(dbFile, 'utf8')
  const parsed = { ...DEFAULT_STORE, ...JSON.parse(raw) }
  const { clients, contracts, changed } = migrateStoreTiers(parsed)
  if (changed) {
    writeStoreToDisk({ ...parsed, clients, contracts })
  }
  return { ...parsed, clients, contracts }
}

/** Always writes to disk (ignores public-demo sandbox). */
export function writeStoreToDisk(store) {
  ensureDataDir()
  const dbFile = getDbFile()
  const tmp = `${dbFile}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2))
  fs.renameSync(tmp, dbFile)
}

export function readStore() {
  if (isDemoSandboxActive()) {
    const sandbox = getSandboxStore()
    if (sandbox) return sandbox
  }
  return readStoreFromDisk()
}

export function writeStore(store) {
  if (isDemoSandboxActive()) {
    setSandboxStore(store)
    return
  }
  writeStoreToDisk(store)
}

export function updateStore(updater) {
  const store = readStore()
  const next = updater(store)
  writeStore(next)
  return next
}
