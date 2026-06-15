import { hashPassword, verifyPassword } from '../auth.js'
import { generateId } from './notifications.js'
import { SAMPLE_CLIENT_EMAILS } from './sampleClientDates.js'
import { DEFAULT_PORTAL_THEME_ID } from './themeIds.js'

/** Mock portal passwords match the account email for easy demo sign-in */
export function getSamplePortalPassword(email) {
  return email.trim().toLowerCase()
}

const SAMPLE_PORTAL_THEMES = {
  'sarah@bloombotanicals.com': 'ocean',
  'james@chenarch.com': 'rose',
  'emily@rodriguezwellness.com': 'forest',
  'marcus@webblegal.com': 'mono',
  'lisa@parkphoto.com': 'soft',
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
      projectType: 'Website Design',
      projectName: 'Portfolio Website',
      projectStatus: 'Contract Sent',
      contractStatus: 'Sent',
      paymentStatus: 'Unpaid',
      serviceTier: 'Studio',
      isOfficialClient: false,
      notes: [],
      deadlines: [
        {
          id: generateId(),
          type: 'follow-up',
          date: daysFromNow(2),
          time: '10:30',
          meetingLink: 'https://meet.example.com/chen-architecture-followup',
          label: 'Contract review call',
        },
        {
          id: generateId(),
          type: 'contract',
          date: daysFromNow(6),
          label: 'Contract signature follow-up',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Emily Rodriguez',
      businessName: 'Rodriguez Wellness',
      email: 'emily@rodriguezwellness.com',
      phone: '(555) 111-2222',
      projectType: 'Branding',
      projectName: 'Brand Identity Package',
      projectStatus: 'Inquiry',
      contractStatus: 'Not Started',
      paymentStatus: 'Unpaid',
      isOfficialClient: false,
      followUpDate: daysFromNow(9),
      notes: [
        {
          id: generateId(),
          text: 'Discovery call scheduled. Interested in logo + social templates.',
          createdAt: now,
          category: 'Follow-Up',
        },
      ],
      deadlines: [
        {
          id: generateId(),
          type: 'follow-up',
          date: daysFromNow(9),
          time: '15:00',
          meetingLink: 'https://meet.example.com/rodriguez-wellness-discovery',
          label: 'Discovery call',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
  ]
}

function findClientByEmail(clients, email) {
  const normalized = email.trim().toLowerCase()
  return clients.find((c) => c.email?.trim().toLowerCase() === normalized)
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
        !passwordMatches

      if (needsUpdate) {
        user = {
          ...user,
          clientId: client.id,
          ...(!passwordMatches || !user.isSamplePortalUser
            ? { passwordHash: await hashPassword(password), isSamplePortalUser: true }
            : {}),
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt ?? now,
          portalThemeId: user.portalThemeId ?? portalThemeId,
        }
        users = users.map((u) => (u.id === user.id ? user : u))
        changed = true
      }
    }

    if (clients[clientIndex].accountUserId !== user.id) {
      clients[clientIndex] = { ...clients[clientIndex], accountUserId: user.id }
      changed = true
    }
  }

  return {
    store: { ...store, users, clients },
    changed,
    createdUsers,
    restoredClients,
  }
}
