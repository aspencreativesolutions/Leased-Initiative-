import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { hashPassword } from '../server/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const E2E_DB_PATH = path.join(__dirname, 'test-store.json')

export const E2E_ADMIN = {
  name: 'E2eadmin',
  email: 'e2eadmin@aspencreativesolutions.com',
  password: 'E2eAdmin123!',
}

const DEFAULT_SETTINGS = {
  businessName: 'E2E Studio',
  ownerName: 'E2E Admin',
  email: E2E_ADMIN.email,
  phone: '555-0100',
  address: '123 Test Street',
  defaultPaymentTerms: '50% deposit due upon signing; remaining balance due upon project completion.',
  defaultRevisionLimit: '2 rounds',
  defaultContractFooter: 'Thank you for your business.',
}

export default async function globalSetup() {
  if (fs.existsSync(E2E_DB_PATH)) {
    fs.unlinkSync(E2E_DB_PATH)
  }

  const passwordHash = await hashPassword(E2E_ADMIN.password)
  const now = new Date().toISOString()

  const store = {
    users: [
      {
        id: 'e2e-admin-user',
        email: E2E_ADMIN.email,
        passwordHash,
        name: E2E_ADMIN.name,
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: now,
        createdAt: now,
      },
    ],
    clients: [],
    contracts: [],
    settings: DEFAULT_SETTINGS,
    projectFiles: [],
    adminNotifications: [],
    clientNotifications: [],
    adminAuditLog: [],
  }

  fs.writeFileSync(E2E_DB_PATH, JSON.stringify(store, null, 2))
}
