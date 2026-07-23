/**
 * Public demo access — redeem a host-provided code or company link to explore static demo data.
 */
import { Router } from 'express'
import { readStoreFromDisk } from '../db.js'
import {
  demoAccountForRole,
  demoCodesMatch,
  getConfiguredDemoCode,
  preparePublicDemoStore,
  resetPublicDemoAfterExit,
} from '../lib/demoAccess.js'
import {
  findValidCompanyDemoLink,
  isCompanyDemoLinkExpired,
} from '../lib/companyDemoLinks.js'

const router = Router()

router.get('/status', (_req, res) => {
  const store = readStoreFromDisk()
  res.json({
    available: true,
    codeConfigured: Boolean(getConfiguredDemoCode(store)),
  })
})

router.post('/redeem', async (req, res) => {
  try {
    const code = req.body?.code
    const role = req.body?.role === 'landlord' ? 'landlord' : 'tenant'
    const store = readStoreFromDisk()
    const expected = getConfiguredDemoCode(store)

    if (!demoCodesMatch(code, expected)) {
      return res.status(403).json({ error: 'That demo code is not valid.' })
    }

    await preparePublicDemoStore()

    const account = demoAccountForRole(role)
    if (!account) {
      return res.status(500).json({ error: 'Demo account is not available' })
    }

    res.json({
      ok: true,
      publicDemo: true,
      account,
      message:
        'Demo data is ready. Sign in with the prefilled credentials — changes are not saved.',
    })
  } catch (err) {
    console.error('demo redeem', err)
    res.status(500).json({ error: 'Could not start the demo' })
  }
})

/** Validate a company demo invite link before the visitor confirms Start Demo. */
router.get('/company-link/:token', (req, res) => {
  const store = readStoreFromDisk()
  const token = req.params.token
  const links = store.companyDemoLinks ?? []
  const link = links.find((entry) => entry.token === token)

  if (!link) {
    return res.status(404).json({ error: 'This demo link is not valid.' })
  }
  if (isCompanyDemoLinkExpired(link)) {
    return res.status(410).json({
      error: 'This company demo link has expired. Ask your host for a new one.',
      expired: true,
      companyName: link.companyName,
    })
  }

  res.json({
    ok: true,
    companyName: link.companyName,
    expiresAt: link.expiresAt,
  })
})

/**
 * Unlock the public demo sandbox via a company invite link (no shared access code).
 * Visitor still chooses landlord/tenant on /demo/pov afterward.
 */
router.post('/company-link/:token/redeem', async (req, res) => {
  try {
    const store = readStoreFromDisk()
    const link = findValidCompanyDemoLink(store, req.params.token)
    if (!link) {
      const existing = (store.companyDemoLinks ?? []).find(
        (entry) => entry.token === req.params.token
      )
      if (existing && isCompanyDemoLinkExpired(existing)) {
        return res.status(410).json({
          error: 'This company demo link has expired. Ask your host for a new one.',
          expired: true,
        })
      }
      return res.status(404).json({ error: 'This demo link is not valid.' })
    }

    await preparePublicDemoStore()

    res.json({
      ok: true,
      publicDemo: true,
      companyName: link.companyName,
      message: 'Demo is ready. Choose a point of view to continue.',
    })
  } catch (err) {
    console.error('demo company-link redeem', err)
    res.status(500).json({ error: 'Could not start the demo' })
  }
})

/** Drop the in-memory sandbox and restore canonical demos on disk after a visitor exits. */
router.post('/exit', async (_req, res) => {
  try {
    resetPublicDemoAfterExit()
    await preparePublicDemoStore()
    resetPublicDemoAfterExit()
    res.json({ ok: true })
  } catch (err) {
    console.error('demo exit', err)
    res.status(500).json({ error: 'Could not reset demo data' })
  }
})

export default router
