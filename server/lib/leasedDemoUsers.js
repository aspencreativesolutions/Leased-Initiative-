import { hashPassword, verifyPassword } from '../auth.js'
import { createDraftContract } from './contractDraft.js'
import {
  applyDemoScenarioToClient,
  applyDemoScenarioToContract,
  resolveDemoScenario,
  scenarioLeaseDates,
} from './demoLeaseFixtures.js'
import { forceApplyDemoLeaseFixturesToStore } from './applyDemoLeaseFixtures.js'
import { getDemoAsOfIso } from './demoClock.js'
import {
  computeLeaseEndDate,
  DEFAULT_LEASE_LENGTH_MONTHS,
} from './leaseSchedule.js'
import { generateId } from './notifications.js'
import { DEFAULT_PORTAL_THEME_ID } from './themeIds.js'

/** Demo password always matches the email for easy local sign-in */
export function getDemoPassword(email) {
  return email.trim().toLowerCase()
}

/**
 * Seed rental addresses within ~40 miles of Steubenville, OH.
 * Must stay in sync with DEFAULT_SEED_PROPERTIES / Rentals.
 */
export const DEMO_RENTAL_ADDRESSES = {
  juanita: '523 Juanita Street, Steubenville, OH 43952',
  heights: '201 Heights Street, Weirton, WV 26062',
  maryland: '77 Maryland Street, Wheeling, WV 26003',
  scioto: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  donnell: '211 Donnell Street, Weirton, WV 26062',
  broad: '107 Broad Street, St. Clairsville, OH 43950',
  bethany: '285 Bethany Pike, Wellsburg, WV 26070',
  canton: '430 Canton Road, Unit 11, Wintersville, OH 43953',
  ridgeA: '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
  ridgeB: '1430 Ridge Avenue, Unit B, Steubenville, OH 43952',
}

/** Landlord business mailing address (Steubenville downtown). */
export const DEMO_LANDLORD_OFFICE =
  '401 Market Street, Suite 200, Steubenville, OH 43952'

/** Retired demo emails removed on ensure / reseed. */
const OBSOLETE_LEASED_DEMO_EMAILS = new Set(['pending@leased.test'])

/**
 * One mock login per Leased flow state, plus extra Waiting to Connect applicants
 * whose desired addresses match seeded Rentals:
 * 1. Landlord — approve tenants & send leases
 * 2–5. Tenants awaiting approval (realistic names + rental addresses)
 * 6. Tenant lease sent — approved, waiting to sign
 * 7. Tenant active — lease signed
 */
export const LEASED_DEMO_USERS = [
  {
    key: 'landlord',
    email: 'landlord@leased.test',
    name: 'Alex Landlord',
    role: 'admin',
    label: 'Landlord',
    description: 'Approve tenants and send lease contracts',
  },
  {
    key: 'pending-fresh',
    email: 'ava.mitchell@example.com',
    name: 'Ava Mitchell',
    role: 'client',
    label: 'Tenant — start application',
    description:
      'Portal starts at Start Application — pick a landlord company, then an address (furnished / unfurnished), or enter an invite code, then Send',
    tenantState: 'pending_approval',
    // Explicit nulls clear any prior prefs so the portal shows Start Application
    // at Connect with Landlord → Start Application → company → address.
    preferredLeaseMonths: null,
    preferredLandlordCompany: null,
    preferredPropertyAddress: null,
  },
  {
    key: 'pending',
    email: 'emma.johnson@example.com',
    name: 'Emma Johnson',
    role: 'client',
    label: 'Tenant — awaiting approval',
    description: 'Signed up for Scioto Drive townhouse; waiting for landlord approval',
    tenantState: 'pending_approval',
    preferredLeaseMonths: 12,
    preferredLandlordCompany: 'Leased Properties',
    preferredPropertyAddress: DEMO_RENTAL_ADDRESSES.scioto,
  },
  {
    key: 'pending-michael',
    email: 'michael.carter@example.com',
    name: 'Michael Carter',
    role: 'client',
    label: 'Tenant — awaiting approval (Donnell Street)',
    description: 'Signed up for Donnell Street; waiting for landlord approval',
    tenantState: 'pending_approval',
    preferredLeaseMonths: 12,
    preferredLandlordCompany: 'Leased Properties',
    preferredPropertyAddress: DEMO_RENTAL_ADDRESSES.donnell,
  },
  {
    key: 'pending-olivia',
    email: 'olivia.davis@example.com',
    name: 'Olivia Davis',
    role: 'client',
    label: 'Tenant — awaiting approval (Ridge Avenue duplex)',
    description: 'Signed up for Ridge Avenue Unit A duplex; waiting for landlord approval',
    tenantState: 'pending_approval',
    preferredLeaseMonths: 6,
    preferredLandlordCompany: 'Leased Properties',
    preferredPropertyAddress: DEMO_RENTAL_ADDRESSES.ridgeA,
  },
  {
    key: 'awaiting',
    email: 'awaiting@leased.test',
    name: 'Taylor Awaiting',
    role: 'client',
    label: 'Tenant — Sent',
    description: 'Approved; lease sent, waiting to sign',
    tenantState: 'lease_sent',
    preferredLeaseMonths: 12,
    preferredPropertyAddress: DEMO_RENTAL_ADDRESSES.canton,
    client: {
      businessName: 'Awaiting Lease Unit',
      phone: '(555) 200-0002',
      projectType: 'Apartment',
      projectName: DEMO_RENTAL_ADDRESSES.canton,
      projectDescription: 'Demo tenant with a lease waiting for signature.',
      projectStatus: 'Contract Sent',
      contractStatus: 'Sent',
      paymentStatus: 'Unpaid',
      isOfficialClient: false,
      leaseLengthMonths: 12,
    },
  },
  {
    key: 'active',
    email: 'active@leased.test',
    name: 'Casey Active',
    role: 'client',
    label: 'Tenant — Active',
    description: 'Signed lease; start date passed — current tenant (Aug 2025 start; final rent Aug 2026)',
    tenantState: 'active',
    preferredLeaseMonths: 12,
    preferredPropertyAddress: DEMO_RENTAL_ADDRESSES.broad,
    client: {
      businessName: 'Active Lease Unit',
      phone: '(555) 200-0003',
      projectType: 'House',
      projectName: DEMO_RENTAL_ADDRESSES.broad,
      projectDescription:
        'Demo tenant with a signed 12-month lease starting August 1, 2025 (Active — Month 11; final rent due August 1).',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      isOfficialClient: true,
      leaseLengthMonths: 12,
    },
  },
]

function findUserByEmail(users, email) {
  const normalized = email.trim().toLowerCase()
  return users.find((u) => u.email?.trim().toLowerCase() === normalized)
}

function findClientByEmail(clients, email) {
  const normalized = email.trim().toLowerCase()
  return clients.find((c) => c.email?.trim().toLowerCase() === normalized)
}

async function ensureUserRecord(users, demo, extras = {}) {
  const email = demo.email.trim().toLowerCase()
  const password = getDemoPassword(email)
  const now = new Date().toISOString()
  let user = findUserByEmail(users, email)
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false
  const clearLeaseMonths = demo.preferredLeaseMonths === null
  const clearPropertyAddress = demo.preferredPropertyAddress === null
  const clearLandlordCompany = demo.preferredLandlordCompany === null
  const preferredLeaseMonths = clearLeaseMonths
    ? undefined
    : (demo.preferredLeaseMonths ??
      demo.client?.leaseLengthMonths ??
      (demo.role === 'client' ? DEFAULT_LEASE_LENGTH_MONTHS : undefined))
  const preferredPropertyAddress = clearPropertyAddress
    ? undefined
    : (demo.preferredPropertyAddress ?? demo.client?.projectName)
  const preferredLandlordCompany = clearLandlordCompany
    ? undefined
    : demo.preferredLandlordCompany

  if (!user) {
    user = {
      id: generateId(),
      email,
      passwordHash: await hashPassword(password),
      name: demo.name,
      role: demo.role,
      emailVerified: true,
      emailVerifiedAt: now,
      isLeasedDemoUser: true,
      portalThemeId: demo.role === 'client' ? DEFAULT_PORTAL_THEME_ID : undefined,
      ...(preferredLeaseMonths != null ? { preferredLeaseMonths } : {}),
      ...(preferredPropertyAddress ? { preferredPropertyAddress } : {}),
      ...(preferredLandlordCompany ? { preferredLandlordCompany } : {}),
      createdAt: now,
      ...extras,
    }
    return { users: [...users, user], user, created: true }
  }

  const needsClearPrefs =
    (clearLeaseMonths && user.preferredLeaseMonths != null) ||
    (clearPropertyAddress && user.preferredPropertyAddress) ||
    (clearLandlordCompany && user.preferredLandlordCompany)

  const needsUpdate =
    user.role !== demo.role ||
    user.name !== demo.name ||
    !user.isLeasedDemoUser ||
    user.emailVerified !== true ||
    !passwordOk ||
    needsClearPrefs ||
    (preferredLeaseMonths != null && user.preferredLeaseMonths !== preferredLeaseMonths) ||
    (preferredPropertyAddress != null &&
      user.preferredPropertyAddress !== preferredPropertyAddress) ||
    (preferredLandlordCompany != null &&
      user.preferredLandlordCompany !== preferredLandlordCompany) ||
    (extras.clientId !== undefined && user.clientId !== extras.clientId) ||
    (extras.clientId === null && user.clientId)

  if (!needsUpdate) {
    return { users, user, created: false }
  }

  const next = {
    ...user,
    name: demo.name,
    role: demo.role,
    emailVerified: true,
    emailVerifiedAt: user.emailVerifiedAt ?? now,
    isLeasedDemoUser: true,
    ...(preferredLeaseMonths != null ? { preferredLeaseMonths } : {}),
    ...(preferredPropertyAddress != null ? { preferredPropertyAddress } : {}),
    ...(preferredLandlordCompany != null ? { preferredLandlordCompany } : {}),
    ...(!passwordOk ? { passwordHash: await hashPassword(password) } : {}),
    ...extras,
  }
  if (clearLeaseMonths) delete next.preferredLeaseMonths
  if (clearPropertyAddress) delete next.preferredPropertyAddress
  if (clearLandlordCompany) delete next.preferredLandlordCompany
  if (demo.role === 'client' && !next.portalThemeId) {
    next.portalThemeId = DEFAULT_PORTAL_THEME_ID
  }
  if (extras.clientId === null) {
    next.clientId = null
  }

  return {
    users: users.map((u) => (u.id === next.id ? next : u)),
    user: next,
    created: false,
  }
}

function ensureTenantClient(clients, demo, userId, now) {
  const email = demo.email.trim().toLowerCase()
  let client = findClientByEmail(clients, email)
  const scenario = resolveDemoScenario(email)
  const leaseLengthMonths =
    scenario?.leaseMonths ??
    demo.client.leaseLengthMonths ??
    demo.preferredLeaseMonths ??
    DEFAULT_LEASE_LENGTH_MONTHS

  const leaseDates = scenario
    ? scenarioLeaseDates(scenario)
    : {
        leaseStartDate: '2026-08-01',
        leaseEndDate: computeLeaseEndDate('2026-08-01', leaseLengthMonths),
      }

  const base = {
    name: demo.name,
    businessName: demo.client.businessName,
    email,
    phone: demo.client.phone,
    projectType: demo.client.projectType,
    projectName: demo.client.projectName,
    projectDescription: demo.client.projectDescription,
    projectStatus: demo.client.projectStatus,
    contractStatus: demo.client.contractStatus,
    paymentStatus: scenario?.paymentStatus ?? demo.client.paymentStatus,
    serviceTier: 'Studio',
    leaseLengthMonths,
    isOfficialClient: demo.client.isOfficialClient,
    officialClientSince: demo.client.isOfficialClient ? now : undefined,
    notes: [],
    deadlines: [],
    isSampleClient: true,
    isLeasedDemoClient: true,
    accountUserId: userId,
  }

  if (!client) {
    client = {
      id: generateId(),
      ...base,
      createdAt: now,
    }
    if (scenario) {
      client = applyDemoScenarioToClient(client, scenario, generateId)
    }
    return {
      clients: [...clients, client],
      client,
      created: true,
      leaseStartDate: leaseDates.leaseStartDate,
      leaseEndDate: leaseDates.leaseEndDate,
    }
  }

  let next = {
    ...client,
    ...base,
    officialClientSince:
      demo.client.isOfficialClient
        ? client.officialClientSince ?? now
        : undefined,
    deadlines: client.deadlines ?? [],
  }
  if (scenario) {
    next = applyDemoScenarioToClient(next, scenario, generateId)
  }

  return {
    clients: clients.map((c) => (c.id === next.id ? next : c)),
    client: next,
    created: false,
    leaseStartDate: leaseDates.leaseStartDate,
    leaseEndDate: leaseDates.leaseEndDate,
  }
}

function ensureLeaseContract(contracts, client, settings, now, leaseDates) {
  const existing = contracts.find((c) => c.clientId === client.id)
  const scenario = resolveDemoScenario(client.email)
  const leaseStartDate = leaseDates?.leaseStartDate ?? '2026-08-01'
  const leaseEndDate =
    leaseDates?.leaseEndDate ??
    computeLeaseEndDate(
      leaseStartDate,
      client.leaseLengthMonths ?? DEFAULT_LEASE_LENGTH_MONTHS
    )

  if (existing) {
    let next = {
      ...existing,
      startDate: leaseStartDate,
      completionDate: leaseEndDate,
      paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
      clientAddress:
        client.isLeasedDemoClient || !existing.clientAddress
          ? client.projectName
          : existing.clientAddress,
    }
    if (scenario) {
      next = applyDemoScenarioToContract(next, client, scenario)
    }
    if (client.contractStatus === 'Sent' || client.contractStatus === 'Signed') {
      next = { ...next, sentAt: next.sentAt ?? now }
    }
    if (client.contractStatus === 'Signed') {
      next = {
        ...next,
        signedAt: next.signedAt ?? now,
        confirmedByClient: true,
        clientSignature: next.clientSignature || client.name,
        clientSignDate: next.clientSignDate || leaseStartDate,
      }
    }
    if (JSON.stringify(next) === JSON.stringify(existing)) {
      return { contracts, contract: existing, created: false }
    }
    return {
      contracts: contracts.map((c) => (c.id === next.id ? next : c)),
      contract: next,
      created: false,
    }
  }

  let contract = createDraftContract(client, settings, {
    startDate: leaseStartDate,
    completionDate: leaseEndDate,
    paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
    readyImmediately: true,
  })
  contract = {
    ...contract,
    clientAddress: client.projectName,
    isPlaceholderDraft: true,
  }
  if (scenario) {
    contract = applyDemoScenarioToContract(contract, client, scenario)
  }
  if (client.contractStatus === 'Sent' || client.contractStatus === 'Signed') {
    contract = { ...contract, sentAt: now }
  }
  if (client.contractStatus === 'Signed') {
    contract = {
      ...contract,
      signedAt: now,
      confirmedByClient: true,
      clientSignature: client.name,
      clientSignDate: leaseStartDate,
    }
  }

  return { contracts: [...contracts, contract], contract, created: true }
}

/**
 * Ensures one demo login for each Leased possibility. Idempotent.
 */
export async function ensureLeasedDemoUsers(store) {
  let users = [...store.users]
  let clients = [...store.clients]
  let contracts = [...store.contracts]
  let settings = { ...store.settings }
  let changed = false
  let createdUsers = 0
  const now = getDemoAsOfIso()

  const usersBeforeObsolete = users.length
  users = users.filter(
    (u) => !OBSOLETE_LEASED_DEMO_EMAILS.has(u.email?.trim().toLowerCase())
  )
  if (users.length !== usersBeforeObsolete) changed = true

  if (!settings.businessName || settings.businessName === 'Your Studio') {
    settings = {
      ...settings,
      businessName: 'Leased Properties',
      ownerName: 'Alex Landlord',
      email: 'landlord@leased.test',
      phone: '(555) 100-0001',
      address: DEMO_LANDLORD_OFFICE,
    }
    changed = true
  } else if (
    settings.address === '100 Lease Lane, Demo City, ST 00000' ||
    settings.address === '1200 Congress Avenue, Suite 400, Austin, TX 78701' ||
    settings.address === '4821 Westheimer Road, Suite 210, Houston, TX 77056'
  ) {
    settings = {
      ...settings,
      address: DEMO_LANDLORD_OFFICE,
    }
    changed = true
  }

  for (const demo of LEASED_DEMO_USERS) {
    if (demo.role === 'admin') {
      const result = await ensureUserRecord(users, demo, { clientId: null })
      users = result.users
      if (result.created) {
        createdUsers += 1
        changed = true
      } else if (result.user !== findUserByEmail(store.users, demo.email)) {
        changed = true
      }
      continue
    }

    if (demo.tenantState === 'pending_approval') {
      const result = await ensureUserRecord(users, demo, {
        clientId: null,
        registrationDismissed: false,
      })
      users = result.users
      if (result.created) {
        createdUsers += 1
        changed = true
      } else {
        // Keep pending tenants unlinked so they appear in the approval queue
        const linked = result.user.clientId
        const dismissed = result.user.registrationDismissed
        if (linked || dismissed) {
          users = users.map((u) =>
            u.id === result.user.id
              ? { ...u, clientId: null, registrationDismissed: false }
              : u
          )
          changed = true
        } else if (result.user !== findUserByEmail(store.users, demo.email)) {
          changed = true
        }
      }
      continue
    }

    // lease_sent or active — need client + contract + linked user
    const stubUserResult = await ensureUserRecord(users, demo, {})
    users = stubUserResult.users
    if (stubUserResult.created) {
      createdUsers += 1
      changed = true
    }

    const clientResult = ensureTenantClient(clients, demo, stubUserResult.user.id, now)
    clients = clientResult.clients
    if (clientResult.created) changed = true

    const userResult = await ensureUserRecord(users, demo, {
      clientId: clientResult.client.id,
    })
    users = userResult.users
    if (userResult.created) {
      createdUsers += 1
      changed = true
    }

    const contractResult = ensureLeaseContract(
      contracts,
      clientResult.client,
      settings,
      now,
      {
        leaseStartDate: clientResult.leaseStartDate,
        leaseEndDate: clientResult.leaseEndDate,
      }
    )
    contracts = contractResult.contracts
    if (contractResult.created) changed = true
  }

  return {
    store: { ...store, users, clients, contracts, settings },
    changed,
    createdUsers,
  }
}

export function formatLeasedDemoLogins() {
  const lines = ['Demo logins (password = email):']
  for (const demo of LEASED_DEMO_USERS) {
    lines.push(`  • ${demo.label}: ${demo.email}`)
  }
  return lines.join('\n')
}

export function isLeasedDemoEmail(email) {
  const normalized = email?.trim().toLowerCase()
  return Boolean(normalized && LEASED_DEMO_USERS.some((d) => d.email === normalized))
}

/**
 * Wipe leased demo users/clients/contracts, then recreate canonical journey states.
 * Use from Admin Mode so scenario testing always starts from a known baseline.
 */
export async function forceReseedLeasedDemoUsers(store) {
  const demoEmails = new Set([
    ...LEASED_DEMO_USERS.map((d) => d.email.trim().toLowerCase()),
    ...OBSOLETE_LEASED_DEMO_EMAILS,
  ])
  const demoClientIds = new Set(
    (store.clients ?? [])
      .filter(
        (c) =>
          c.isLeasedDemoClient === true || isLeasedDemoEmail(c.email)
      )
      .map((c) => c.id)
  )

  const users = (store.users ?? []).filter(
    (u) =>
      !(
        u.isLeasedDemoUser === true ||
        demoEmails.has(u.email?.trim().toLowerCase())
      )
  )
  const clients = (store.clients ?? []).filter((c) => !demoClientIds.has(c.id))
  const contracts = (store.contracts ?? []).filter((c) => !demoClientIds.has(c.clientId))

  const result = await ensureLeasedDemoUsers({
    ...store,
    users,
    clients,
    contracts,
  })

  const fixtures = forceApplyDemoLeaseFixturesToStore(result.store)

  return {
    ...result,
    store: fixtures.store,
    wiped: true,
  }
}

/** Clear onboarding progress so the guided tour can run again for a demo account. */
export function resetDemoOnboarding(store, email) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) {
    return { store, changed: false, error: 'email is required' }
  }

  const user = findUserByEmail(store.users ?? [], normalized)
  if (!user) {
    return { store, changed: false, error: 'User not found' }
  }

  const nextProgress = { completedSteps: [] }
  const users = store.users.map((u) =>
    u.id === user.id ? { ...u, onboardingProgress: nextProgress } : u
  )

  return {
    store: { ...store, users },
    changed: true,
    userId: user.id,
    email: normalized,
  }
}
