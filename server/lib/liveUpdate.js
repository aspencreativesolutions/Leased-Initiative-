/**
 * Site-wide "live update" flag — when enabled, visitors see a status indicator
 * while the host is deploying changes.
 *
 * Stored in its own file (not store.json) so demo reseeds / store writes can
 * never accidentally clear it. Stays on until an admin explicitly turns it off.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readStoreFromDisk, writeStoreToDisk } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'leased-data')
  : path.join(__dirname, '..', 'data')

function getLiveUpdateFile() {
  return process.env.CLIENT_CRAFT_LIVE_UPDATE_FILE || path.join(DATA_DIR, 'live-update.json')
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readLiveUpdateFile() {
  ensureDataDir()
  const file = getLiveUpdateFile()
  if (!fs.existsSync(file)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return {
      enabled: Boolean(parsed?.enabled),
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return null
  }
}

function writeLiveUpdateFile(state) {
  ensureDataDir()
  const file = getLiveUpdateFile()
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
  fs.renameSync(tmp, file)
}

/** One-time migrate from store.json.liveUpdate if the dedicated file is missing. */
function migrateFromStoreIfNeeded() {
  const existing = readLiveUpdateFile()
  if (existing) return existing

  // Custom file path (tests / overrides): never touch the real store.json.
  if (process.env.CLIENT_CRAFT_LIVE_UPDATE_FILE) {
    const state = { enabled: false, updatedAt: null }
    writeLiveUpdateFile(state)
    return state
  }

  try {
    const store = readStoreFromDisk()
    const enabled = Boolean(store?.liveUpdate?.enabled)
    const updatedAt =
      typeof store?.liveUpdate?.updatedAt === 'string' ? store.liveUpdate.updatedAt : null
    const state = { enabled, updatedAt }
    writeLiveUpdateFile(state)

    // Drop the nested flag so future store writes can't flip it back on/off.
    if (store?.liveUpdate) {
      const { liveUpdate: _removed, ...rest } = store
      writeStoreToDisk(rest)
    }
    return state
  } catch {
    const state = { enabled: false, updatedAt: null }
    writeLiveUpdateFile(state)
    return state
  }
}

export function getLiveUpdateState(_store) {
  const state = migrateFromStoreIfNeeded()
  return { enabled: Boolean(state.enabled) }
}

export function setLiveUpdateEnabled(_store, enabled) {
  const state = {
    enabled: Boolean(enabled),
    updatedAt: new Date().toISOString(),
  }
  writeLiveUpdateFile(state)
  // Keep return shape compatible with older callers that expected a store patch.
  return {
    liveUpdate: state,
  }
}
