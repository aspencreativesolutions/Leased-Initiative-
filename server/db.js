import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrateStoreTiers } from './lib/serviceTier.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'store.json')

const DEFAULT_STORE = {
  users: [],
  clients: [],
  contracts: [],
  settings: {
    businessName: 'Your Studio',
    ownerName: 'Your Name',
    email: '',
    phone: '',
    address: '',
    defaultPaymentTerms: '50% deposit due upon signing; remaining balance due upon project completion.',
    defaultRevisionLimit: '2 rounds',
    defaultContractFooter: 'Thank you for your business.',
  },
  projectFiles: [],
  adminNotifications: [],
  clientNotifications: [],
  adminAuditLog: [],
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readStore() {
  ensureDataDir()
  if (!fs.existsSync(DB_FILE)) {
    writeStore(DEFAULT_STORE)
    return structuredClone(DEFAULT_STORE)
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  const parsed = { ...DEFAULT_STORE, ...JSON.parse(raw) }
  const { clients, contracts, changed } = migrateStoreTiers(parsed)
  if (changed) {
    writeStore({ ...parsed, clients, contracts })
  }
  return { ...parsed, clients, contracts }
}

export function writeStore(store) {
  ensureDataDir()
  const tmp = `${DB_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2))
  fs.renameSync(tmp, DB_FILE)
}

export function updateStore(updater) {
  const store = readStore()
  const next = updater(store)
  writeStore(next)
  return next
}
