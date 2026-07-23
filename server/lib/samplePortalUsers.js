import { hashPassword, verifyPassword } from '../auth.js'
import { generateId } from './notifications.js'
import {
  REMOVED_SAMPLE_CLIENT_EMAILS,
  REMOVED_SAMPLE_CLIENT_NAMES,
  SAMPLE_CLIENT_EMAILS,
} from './sampleClientDates.js'
import { DEFAULT_PORTAL_THEME_ID } from './themeIds.js'

/** Mock portal passwords match the account email for easy demo sign-in */
export function getSamplePortalPassword(email) {
  return email.trim().toLowerCase()
}

const SAMPLE_PORTAL_THEMES = {
  'james@chenarch.com': 'slate',
  'jordan.kim@example.com': 'slate',
  'emily@rodriguezwellness.com': 'slate',
  'marcus@webblegal.com': 'slate',
  'lisa@parkphoto.com': 'slate',
  'ava.torres@example.com': 'slate',
  'noah.patel@example.com': 'slate',
  'priya.shah@example.com': 'slate',
  'ethan.brooks@example.com': 'slate',
  'maya.lopez@example.com': 'slate',
  'chris.nguyen@example.com': 'slate',
  'sam.rivera@example.com': 'slate',
}

/** Canonical property addresses for each mock portal tenant */
const SAMPLE_TENANT_ADDRESSES = {
  'james@chenarch.com': '523 Juanita Street, Steubenville, OH 43952',
  'jordan.kim@example.com': '523 Juanita Street, Steubenville, OH 43952',
  'emily@rodriguezwellness.com': '201 Heights Street, Weirton, WV 26062',
  'marcus@webblegal.com': '77 Maryland Street, Wheeling, WV 26003',
  'lisa@parkphoto.com': '285 Bethany Pike, Wellsburg, WV 26070',
  'ava.torres@example.com': '430 Canton Road, Unit 11, Wintersville, OH 43953',
  'noah.patel@example.com': '430 Canton Road, Unit 11, Wintersville, OH 43953',
  'priya.shah@example.com': '211 Donnell Street, Weirton, WV 26062',
  'ethan.brooks@example.com': '211 Donnell Street, Weirton, WV 26062',
  'maya.lopez@example.com': '211 Donnell Street, Weirton, WV 26062',
  'chris.nguyen@example.com': '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  'sam.rivera@example.com': '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
}

/** Old agency-style titles / outdated addresses → realistic mock addresses */
const SAMPLE_ADDRESS_MIGRATIONS = {
  '123 Creative Lane, Your City, ST 00000':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '412 Oak Street, Suite 2, Brooklyn, NY 11201':
    '285 Bethany Pike, Wellsburg, WV 26070',
  '88 Harbor Ave, Unit 4B, Queens, NY 11101': SAMPLE_TENANT_ADDRESSES['james@chenarch.com'],
  '15 Pine Court #301, Hoboken, NJ 07030':
    SAMPLE_TENANT_ADDRESSES['emily@rodriguezwellness.com'],
  '220 Maple Row, Miami, FL 33101': SAMPLE_TENANT_ADDRESSES['marcus@webblegal.com'],
  '9 River Road, Apt 12, San Francisco, CA 94107':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205':
    SAMPLE_TENANT_ADDRESSES['james@chenarch.com'],
  '56 East Market Street #210, Philadelphia, PA 19107':
    SAMPLE_TENANT_ADDRESSES['emily@rodriguezwellness.com'],
  '3315 South Magnolia Avenue, Tampa, FL 33609':
    SAMPLE_TENANT_ADDRESSES['marcus@webblegal.com'],
  '7748 Highland Park Lane, Austin, TX 78745':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '2140 Barton Springs Road, Unit 2B, Austin, TX 78704':
    '211 Donnell Street, Weirton, WV 26062',
  '8901 North Lamar Boulevard, Unit 3C, Austin, TX 78753':
    '107 Broad Street, St. Clairsville, OH 43950',
  '4821 Westheimer Road, Suite 210, Houston, TX 77056':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '1200 Congress Avenue, Suite 400, Austin, TX 78701':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '1847 North Whispering Pines Boulevard, Apartment 12B, Charlotte, NC 28202':
    SAMPLE_TENANT_ADDRESSES['lisa@parkphoto.com'],
  '261 East Main Street, St. Clairsville, OH 43950':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '150 Orchard Street, Wintersville, OH 43953':
    '430 Canton Road, Unit 11, Wintersville, OH 43953',
  '903 Logan Avenue, Mingo Junction, OH 43938':
    '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
  'Portfolio Website': SAMPLE_TENANT_ADDRESSES['james@chenarch.com'],
  'Brand Identity Package': SAMPLE_TENANT_ADDRESSES['emily@rodriguezwellness.com'],
  'Local SEO Optimization': SAMPLE_TENANT_ADDRESSES['marcus@webblegal.com'],
}

function migrateSampleAddress(value) {
  if (!value?.trim()) return value
  return SAMPLE_ADDRESS_MIGRATIONS[value.trim()] ?? value
}

function resolveSampleTenantAddress(email, current) {
  const canonical = SAMPLE_TENANT_ADDRESSES[email]
  if (canonical) return canonical
  return migrateSampleAddress(current) || current
}

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isSampleClient(client) {
  const email = client.email?.trim().toLowerCase()
  return Boolean(client.isSampleClient || (email && SAMPLE_CLIENT_EMAILS.has(email)))
}

/** Sample clients that may be missing from older stores */
function buildMissingSampleClients(now) {
  return [
    {
      id: generateId(),
      name: 'James Chen',
      businessName: 'Chen Architecture',
      email: 'james@chenarch.com',
      phone: '(555) 876-5432',
      projectType: 'House',
      projectName: '523 Juanita Street, Steubenville, OH 43952',
      projectDescription:
        'Shares $2,400 home with Jordan on one lease — July rent past due.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Overdue',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'shared_home',
      leaseGroupId: 'lease-juanita-523',
      unitOrRoomLabel: 'Main floor',
      notes: [],
      deadlines: [
        {
          id: generateId(),
          type: 'follow-up',
          date: daysFromNow(2),
          time: '10:30',
          meetingLink: 'https://meet.example.com/chen-architecture-followup',
          label: 'Overdue rent follow-up call',
        },
      ],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Jordan Kim',
      businessName: 'Kim Studio',
      email: 'jordan.kim@example.com',
      phone: '(740) 555-0198',
      projectType: 'House',
      projectName: '523 Juanita Street, Steubenville, OH 43952',
      projectDescription:
        'Roommate at Juanita on the shared lease — never paid late; $800 toward July.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Unpaid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      currentPeriodAmountPaid: 800,
      occupancyArrangement: 'shared_home',
      leaseGroupId: 'lease-juanita-523',
      unitOrRoomLabel: 'Upper floor',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Emily Rodriguez',
      businessName: 'Rodriguez Wellness',
      email: 'emily@rodriguezwellness.com',
      phone: '(555) 111-2222',
      projectType: 'House',
      projectName: '201 Heights Street, Weirton, WV 26062',
      projectDescription:
        'Accepted tenant — lease sent for August 1 start; awaiting signature.',
      projectStatus: 'Contract Sent',
      contractStatus: 'Sent',
      paymentStatus: 'Unpaid',
      leaseLengthMonths: 12,
      isOfficialClient: false,
      followUpDate: daysFromNow(9),
      occupancyArrangement: 'entire_home',
      notes: [
        {
          id: generateId(),
          text: 'Lease sent to portal. Waiting for Emily to review and sign.',
          createdAt: now,
          category: 'Contract',
        },
      ],
      deadlines: [
        {
          id: generateId(),
          type: 'follow-up',
          date: daysFromNow(9),
          time: '15:00',
          meetingLink: 'https://meet.example.com/rodriguez-wellness-discovery',
          label: 'Lease signature follow-up',
        },
      ],
      isSampleClient: true,
      demoLeaseStartDate: '2026-08-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Marcus Webb',
      businessName: 'Webb Legal Group',
      email: 'marcus@webblegal.com',
      phone: '(555) 333-4444',
      projectType: 'House',
      projectName: '77 Maryland Street, Wheeling, WV 26003',
      projectDescription:
        'Signed 12-month lease begins August 1 — lives alone; first month paid early.',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'entire_home',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-08-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Lisa Park',
      businessName: 'Park Photography',
      email: 'lisa@parkphoto.com',
      phone: '(555) 555-6666',
      projectType: 'House',
      projectName: '285 Bethany Pike, Wellsburg, WV 26070',
      projectDescription: 'Entire single-family home alone — Active; never late.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'entire_home',
      followUpDate: daysFromNow(4),
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Ava Torres',
      businessName: 'Torres Design',
      email: 'ava.torres@example.com',
      phone: '(740) 555-0142',
      projectType: 'Apartment',
      projectName: '430 Canton Road, Unit 11, Wintersville, OH 43953',
      projectDescription:
        'Shares apartment Unit 11 with Noah — signed lease begins August 1, 2026; deposit paid.',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'shared_apartment',
      leaseGroupId: 'lease-canton-11',
      unitOrRoomLabel: 'Unit 11 · Bedroom A',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-08-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Noah Patel',
      businessName: 'Patel Labs',
      email: 'noah.patel@example.com',
      phone: '(740) 555-0177',
      projectType: 'Apartment',
      projectName: '430 Canton Road, Unit 11, Wintersville, OH 43953',
      projectDescription:
        'Shares apartment Unit 11 with Ava — signed lease begins August 1, 2026; deposit paid.',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'shared_apartment',
      leaseGroupId: 'lease-canton-11',
      unitOrRoomLabel: 'Unit 11 · Bedroom B',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-08-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Priya Shah',
      businessName: 'Shah Consulting',
      email: 'priya.shah@example.com',
      phone: '(304) 555-0101',
      projectType: 'House',
      projectName: '211 Donnell Street, Weirton, WV 26062',
      projectDescription: 'One of three housemates on a shared Donnell lease.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'shared_home',
      leaseGroupId: 'lease-donnell-211',
      unitOrRoomLabel: 'Room 1',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Ethan Brooks',
      businessName: 'Brooks Media',
      email: 'ethan.brooks@example.com',
      phone: '(304) 555-0102',
      projectType: 'House',
      projectName: '211 Donnell Street, Weirton, WV 26062',
      projectDescription: 'One of three housemates on a shared Donnell lease.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'shared_home',
      leaseGroupId: 'lease-donnell-211',
      unitOrRoomLabel: 'Room 2',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Maya Lopez',
      businessName: 'Lopez Studio',
      email: 'maya.lopez@example.com',
      phone: '(304) 555-0103',
      projectType: 'House',
      projectName: '211 Donnell Street, Weirton, WV 26062',
      projectDescription: 'One of three housemates on a shared Donnell lease.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'shared_home',
      leaseGroupId: 'lease-donnell-211',
      unitOrRoomLabel: 'Room 3',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Chris Nguyen',
      businessName: 'Nguyen Analytics',
      email: 'chris.nguyen@example.com',
      phone: '(740) 555-0188',
      projectType: 'Townhouse',
      projectName: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
      projectDescription:
        'Room rental at Scioto — signed lease begins August 1, 2026; deposit paid. Separate lease from Sam.',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'room_rental',
      leaseGroupId: 'lease-scioto-chris',
      unitOrRoomLabel: 'Room A',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-08-01',
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Sam Rivera',
      businessName: 'Rivera Co.',
      email: 'sam.rivera@example.com',
      phone: '(740) 555-0191',
      projectType: 'Townhouse',
      projectName: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
      projectDescription:
        'Room rental at Scioto — signed lease begins August 1, 2026; deposit paid. Separate lease from Chris.',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      occupancyArrangement: 'room_rental',
      leaseGroupId: 'lease-scioto-sam',
      unitOrRoomLabel: 'Room B',
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-08-01',
      createdAt: now,
    },
  ]
}

function findClientByEmail(clients, email) {
  const normalized = email.trim().toLowerCase()
  return clients.find((c) => c.email?.trim().toLowerCase() === normalized)
}

/**
 * Remove retired mock tenants (and linked portal users / contracts) from existing stores.
 */
export function purgeRemovedSampleClients(store) {
  const removedEmails = REMOVED_SAMPLE_CLIENT_EMAILS
  const removedNames = REMOVED_SAMPLE_CLIENT_NAMES
  if (
    (!removedEmails || removedEmails.size === 0) &&
    (!removedNames || removedNames.size === 0)
  ) {
    return { store, changed: false, removedClients: 0 }
  }

  const matchesRemoved = (email, name) => {
    const normalizedEmail = email?.trim().toLowerCase()
    const normalizedName = name?.trim().toLowerCase()
    if (normalizedEmail && removedEmails?.has(normalizedEmail)) return true
    if (normalizedName && removedNames?.has(normalizedName)) return true
    return false
  }

  const removedClientIds = new Set(
    (store.clients ?? [])
      .filter((c) => matchesRemoved(c.email, c.name))
      .map((c) => c.id)
  )

  if (removedClientIds.size === 0) {
    const usersOnly = (store.users ?? []).filter(
      (u) => !matchesRemoved(u.email, u.name)
    )
    if (usersOnly.length === (store.users ?? []).length) {
      return { store, changed: false, removedClients: 0 }
    }
    return {
      store: { ...store, users: usersOnly },
      changed: true,
      removedClients: 0,
    }
  }

  const clients = (store.clients ?? []).filter((c) => !removedClientIds.has(c.id))
  const contracts = (store.contracts ?? []).filter((c) => !removedClientIds.has(c.clientId))
  const users = (store.users ?? []).filter((u) => {
    if (matchesRemoved(u.email, u.name)) return false
    if (u.clientId && removedClientIds.has(u.clientId)) return false
    return true
  })
  const invoices = (store.invoices ?? []).filter(
    (inv) => !inv.clientId || !removedClientIds.has(inv.clientId)
  )
  const notifications = (store.adminNotifications ?? []).filter(
    (n) => !n.clientId || !removedClientIds.has(n.clientId)
  )
  const problemReports = (store.problemReports ?? []).filter(
    (r) => !r.clientId || !removedClientIds.has(r.clientId)
  )
  const rentPayments = (store.rentPayments ?? []).filter(
    (p) => !p.clientId || !removedClientIds.has(p.clientId)
  )

  return {
    store: {
      ...store,
      clients,
      contracts,
      users,
      ...(store.invoices ? { invoices } : {}),
      ...(store.adminNotifications ? { adminNotifications: notifications } : {}),
      ...(store.problemReports ? { problemReports } : {}),
      ...(store.rentPayments ? { rentPayments } : {}),
    },
    changed: true,
    removedClients: removedClientIds.size,
  }
}

/**
 * Ensures every mock client has a linked portal login (emailVerified, password = email).
 */
export async function ensureSamplePortalUsers(store) {
  let changed = false
  let createdUsers = 0
  let restoredClients = 0
  const now = new Date().toISOString()

  let clients = [...store.clients]
  let users = [...store.users]

  for (const stub of buildMissingSampleClients(now)) {
    const email = stub.email.trim().toLowerCase()
    if (!findClientByEmail(clients, email)) {
      clients.push(stub)
      changed = true
      restoredClients += 1
    }
  }

  for (const email of SAMPLE_CLIENT_EMAILS) {
    const client = findClientByEmail(clients, email)
    if (!client || !isSampleClient(client)) continue

    const clientIndex = clients.findIndex((c) => c.id === client.id)
    const portalThemeId = SAMPLE_PORTAL_THEMES[email] ?? DEFAULT_PORTAL_THEME_ID
    const password = getSamplePortalPassword(email)

    let user = users.find((u) => u.email === email && u.role === 'client')
    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : false

    if (!user) {
      user = {
        id: generateId(),
        email,
        passwordHash: await hashPassword(password),
        name: client.name,
        role: 'client',
        clientId: client.id,
        portalThemeId,
        emailVerified: true,
        emailVerifiedAt: now,
        isSamplePortalUser: true,
        createdAt: now,
      }
      users.push(user)
      createdUsers += 1
      changed = true
    } else {
      const needsUpdate =
        user.clientId !== client.id ||
        !user.isSamplePortalUser ||
        user.emailVerified !== true ||
        !passwordMatches ||
        user.portalThemeId !== portalThemeId

      if (needsUpdate) {
        user = {
          ...user,
          clientId: client.id,
          ...(!passwordMatches || !user.isSamplePortalUser
            ? { passwordHash: await hashPassword(password), isSamplePortalUser: true }
            : {}),
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt ?? now,
          portalThemeId,
        }
        users = users.map((u) => (u.id === user.id ? user : u))
        changed = true
      }
    }

    const nextAddress = resolveSampleTenantAddress(email, clients[clientIndex].projectName)
    const isEmilyLeaseSent = email === 'emily@rodriguezwellness.com'
    const needsClientUpdate =
      clients[clientIndex].accountUserId !== user.id ||
      clients[clientIndex].projectName !== nextAddress ||
      (isEmilyLeaseSent &&
        (clients[clientIndex].contractStatus !== 'Sent' ||
          clients[clientIndex].projectStatus !== 'Contract Sent' ||
          clients[clientIndex].isOfficialClient === true))

    if (needsClientUpdate) {
      clients[clientIndex] = {
        ...clients[clientIndex],
        accountUserId: user.id,
        projectName: nextAddress,
        ...(isEmilyLeaseSent
          ? {
              contractStatus: 'Sent',
              projectStatus: 'Contract Sent',
              isOfficialClient: false,
              officialClientSince: undefined,
              projectDescription:
                'Accepted tenant — lease sent for August 1 start; awaiting signature.',
            }
          : {}),
      }
      changed = true
    }
  }

  let contracts = [...store.contracts]
  contracts = contracts.map((contract) => {
    const client = clients.find((c) => c.id === contract.clientId)
    const email = client?.email?.trim().toLowerCase()
    if (!email || !SAMPLE_CLIENT_EMAILS.has(email)) return contract

    const address = resolveSampleTenantAddress(email, client.projectName)
    if (contract.projectTitle === address && contract.clientAddress === address) {
      return contract
    }

    changed = true
    return {
      ...contract,
      projectTitle: address,
      clientAddress: address,
    }
  })

  return {
    store: { ...store, users, clients, contracts },
    changed,
    createdUsers,
    restoredClients,
  }
}
