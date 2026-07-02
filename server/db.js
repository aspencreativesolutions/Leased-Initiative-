import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrateStoreTiers } from './lib/serviceTier.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')

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

function getDbFile() {
  return process.env.CLIENT_CRAFT_DB_FILE || path.join(DATA_DIR, 'store.json')
}

export function readStore() {
  ensureDataDir()
  const dbFile = getDbFile()
  if (!fs.existsSync(dbFile)) {
    writeStore(DEFAULT_STORE)
    return structuredClone(DEFAULT_STORE)
  }
  const raw = fs.readFileSync(dbFile, 'utf8')
  const parsed = { ...DEFAULT_STORE, ...JSON.parse(raw) }
  const { clients, contracts, changed } = migrateStoreTiers(parsed)
  if (changed) {
    writeStore({ ...parsed, clients, contracts })
  }
  return { ...parsed, clients, contracts }
}

export function writeStore(store) {
  ensureDataDir()
  const dbFile = getDbFile()
  const tmp = `${dbFile}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2))
  fs.renameSync(tmp, dbFile)
}

export function updateStore(updater) {
  const store = readStore()
  const next = updater(store)
  writeStore(next)
  return next
}
