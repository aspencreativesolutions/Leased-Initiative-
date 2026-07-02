import fs from 'fs'
import os from 'os'
import path from 'path'
import express from 'express'

let tempDbPath = null

export function useTestStore() {
  tempDbPath = path.join(
    os.tmpdir(),
    `client-craft-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  )
  process.env.CLIENT_CRAFT_DB_FILE = tempDbPath
}

export function cleanupTestStore() {
  if (tempDbPath && fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath)
  }
  delete process.env.CLIENT_CRAFT_DB_FILE
  tempDbPath = null
}

export async function createAuthTestApp() {
  const { default: authRoutes } = await import('../routes/auth.js')
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  return app
}
