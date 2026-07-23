/**
 * Local Admin Mode helpers — reseed demos and reset onboarding for scenario testing.
 * Disabled when NODE_ENV=production unless ENABLE_ADMIN_MODE=1.
 */
import { Router } from 'express'
import { readStore, writeStore, readStoreFromDisk, writeStoreToDisk } from '../db.js'
import {
  LEASED_DEMO_USERS,
  forceReseedLeasedDemoUsers,
  resetDemoOnboarding,
  getDemoPassword,
} from '../lib/leasedDemoUsers.js'
import { ensureSamplePortalUsers, getSamplePortalPassword, purgeRemovedSampleClients } from '../lib/samplePortalUsers.js'
import { ensureSampleClientContracts } from '../lib/sampleClientContracts.js'
import { purgeImportedLeaseScanData } from '../lib/purgeImportedLeaseScan.js'
import { ensureStoreProperties } from '../lib/properties.js'
import { SAMPLE_CLIENT_EMAILS } from '../lib/sampleClientDates.js'
import {
  getConfiguredDemoCode,
  setDemoAccessCodeOnStore,
} from '../lib/demoAccess.js'
import {
  buildCompanyDemoLinkUrl,
  createCompanyDemoLink,
  listActiveCompanyDemoLinks,
  listKnownCompanyDemoNames,
} from '../lib/companyDemoLinks.js'

const router = Router()

export function isAdminModeApiEnabled() {
  if (process.env.ENABLE_ADMIN_MODE === '1') return true
  if (process.env.E2E_TEST === '1') return false
  return process.env.NODE_ENV !== 'production'
}

const SAMPLE_SCENARIO_USERS = [
  {
    key: 'sample-emily',
    email: 'emily@rodriguezwellness.com',
    name: 'Emily Rodriguez',
    role: 'client',
    label: 'Tenant — lease sent',
    description: 'Accepted; lease sent, waiting to sign',
    journey: 'lease_sent',
  },
  {
    key: 'sample-james',
    email: 'james@chenarch.com',
    name: 'James Chen',
    role: 'client',
    label: 'Tenant — lease sent + overdue',
    description: 'Lease sent with overdue rent',
    journey: 'lease_sent_overdue',
  },
  {
    key: 'sample-marcus',
    email: 'marcus@webblegal.com',
    name: 'Marcus Webb',
    role: 'client',
    label: 'Tenant — paid / active',
    description: 'Signed, fully paid, project started',
    journey: 'paid_active',
  },
  {
    key: 'sample-lisa',
    email: 'lisa@parkphoto.com',
    name: 'Lisa Park',
    role: 'client',
    label: 'Tenant — multi-overdue rent',
    description: 'Signed with multiple overdue rent payments',
    journey: 'multi_overdue',
  },
]

router.get('/admin/catalog', (_req, res) => {
  const demos = LEASED_DEMO_USERS.map((d) => ({
    key: d.key,
    email: d.email,
    name: d.name,
    role: d.role,
    label: d.label,
    description: d.description,
    tenantState: d.tenantState ?? null,
    passwordHint: 'password equals email',
  }))

  const samples = SAMPLE_SCENARIO_USERS.map((s) => ({
    ...s,
    passwordHint: 'password equals email',
  }))

  res.json({
    demos,
    samples,
    note: 'Demo passwords match the account email.',
  })
})

router.post('/admin/reseed', async (_req, res) => {
  try {
    let store = readStore()
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

    const contractResult = ensureSampleClientContracts(store)
    store = contractResult.store

    writeStore(store)

    res.json({
      ok: true,
      demos: {
        createdUsers: demoResult.createdUsers,
        wiped: demoResult.wiped === true,
      },
      imports: {
        removedClients: importPurge.removedClients,
        removedContracts: importPurge.removedContracts,
        removedProperties: importPurge.removedProperties,
        removedInvites: importPurge.removedInvites,
      },
      samples: {
        createdUsers: portalResult.createdUsers,
        restoredClients: portalResult.restoredClients,
      },
      contracts: {
        created: contractResult.created,
        repaired: contractResult.repaired ?? 0,
      },
    })
  } catch (err) {
    console.error('admin reseed', err)
    res.status(500).json({ error: 'Could not reseed demo data' })
  }
})

router.post('/admin/reset-onboarding', (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase()
    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    const store = readStore()
    const result = resetDemoOnboarding(store, email)
    if (result.error) {
      return res.status(404).json({ error: result.error })
    }

    if (result.changed) {
      writeStore(result.store)
    }

    res.json({ ok: true, email: result.email })
  } catch (err) {
    console.error('admin reset-onboarding', err)
    res.status(500).json({ error: 'Could not reset onboarding' })
  }
})

/** Confirm a mock login exists and return its role/home path (passwords stay client-side: email). */
router.get('/admin/users/:email', (req, res) => {
  const email = req.params.email?.trim().toLowerCase()
  const store = readStore()
  const user = store.users?.find((u) => u.email?.trim().toLowerCase() === email)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const isDemo =
    user.isLeasedDemoUser === true ||
    LEASED_DEMO_USERS.some((d) => d.email === email) ||
    user.isSamplePortalUser === true ||
    SAMPLE_CLIENT_EMAILS.has(email)

  res.json({
    email: user.email,
    name: user.name,
    role: user.role,
    isDemo,
    homePath: user.role === 'admin' ? '/studio' : '/portal',
    passwordEqualsEmail: isDemo,
    demoPassword: isDemo ? getDemoPassword(email) || getSamplePortalPassword(email) : undefined,
  })
})

router.get('/admin/demo-code', (_req, res) => {
  const store = readStoreFromDisk()
  res.json({
    code: getConfiguredDemoCode(store),
    source: store.settings?.demoAccessCode
      ? 'settings'
      : process.env.DEMO_ACCESS_CODE
        ? 'env'
        : 'default',
  })
})

router.put('/admin/demo-code', (req, res) => {
  try {
    const code = req.body?.code
    const store = readStoreFromDisk()
    const result = setDemoAccessCodeOnStore(store, code)
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }
    writeStoreToDisk(result.store)
    res.json({
      ok: true,
      code: getConfiguredDemoCode(result.store),
      source: 'settings',
    })
  } catch (err) {
    console.error('admin demo-code', err)
    res.status(500).json({ error: 'Could not save demo access code' })
  }
})

router.get('/admin/company-demo-links', (_req, res) => {
  const store = readStoreFromDisk()
  const links = listActiveCompanyDemoLinks(store).map((link) => ({
    id: link.id,
    companyName: link.companyName,
    url: buildCompanyDemoLinkUrl(link.token),
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  }))
  res.json({
    links,
    companySuggestions: listKnownCompanyDemoNames(store),
  })
})

router.post('/admin/company-demo-links', (req, res) => {
  try {
    const store = readStoreFromDisk()
    const result = createCompanyDemoLink(store, req.body?.companyName)
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }
    writeStoreToDisk(result.store)
    res.json({
      ok: true,
      url: result.url,
      expiryDays: result.expiryDays,
      link: {
        id: result.link.id,
        companyName: result.link.companyName,
        url: result.url,
        createdAt: result.link.createdAt,
        expiresAt: result.link.expiresAt,
      },
    })
  } catch (err) {
    console.error('admin company-demo-links', err)
    res.status(500).json({ error: 'Could not generate company demo link' })
  }
})

export default router
