import { apiFetch } from '@/lib/api'
import { isAdminUnlocked } from '@/lib/adminUnlock'

export type AdminMockRole = 'admin' | 'client'

export interface AdminMockUser {
  key: string
  email: string
  name: string
  role: AdminMockRole
  label: string
  description: string
  group: 'core' | 'edge'
  /** Canonical tenant journey slice when role is client */
  journey?: string
}

export interface AdminScenario {
  id: string
  label: string
  description: string
  /** Login as this mock user (omit for first-time / signed-out) */
  email?: string
  /** Navigate here after login / logout */
  path: string
  /** Wipe + recreate leased demos before switching */
  reseed?: boolean
}

/** Password for every mock account equals the email. */
export function getMockPassword(email: string) {
  return email.trim().toLowerCase()
}

export const CORE_MOCK_USERS: AdminMockUser[] = [
  {
    key: 'landlord',
    email: 'landlord@leased.test',
    name: 'Alex Landlord',
    role: 'admin',
    label: 'Landlord',
    description: 'Approve tenants and send leases',
    group: 'core',
  },
  {
    key: 'pending-fresh',
    email: 'ava.mitchell@example.com',
    name: 'Ava Mitchell',
    role: 'client',
    label: 'Tenant — start application',
    description:
      'Portal starts at Start Application — landlord company, then address (furnished / unfurnished), or invite code, then Send',
    group: 'core',
    journey: 'pending_approval',
  },
  {
    key: 'pending',
    email: 'emma.johnson@example.com',
    name: 'Emma Johnson',
    role: 'client',
    label: 'Tenant — awaiting approval',
    description: 'Signed up for Scioto Drive townhouse; waiting for landlord approval',
    group: 'core',
    journey: 'pending_approval',
  },
  {
    key: 'awaiting',
    email: 'awaiting@leased.test',
    name: 'Taylor Awaiting',
    role: 'client',
    label: 'Tenant — Sent',
    description: 'Approved; lease sent, waiting to sign',
    group: 'core',
    journey: 'lease_sent',
  },
  {
    key: 'active',
    email: 'active@leased.test',
    name: 'Casey Active',
    role: 'client',
    label: 'Tenant — Active',
    description: 'Signed lease; start date passed — current tenant',
    group: 'core',
    journey: 'active',
  },
]

export const EDGE_MOCK_USERS: AdminMockUser[] = [
  {
    key: 'pending-michael',
    email: 'michael.carter@example.com',
    name: 'Michael Carter',
    role: 'client',
    label: 'Tenant — awaiting approval (Donnell Street)',
    description: 'Signed up for Donnell Street; waiting for landlord approval',
    group: 'edge',
    journey: 'pending_approval',
  },
  {
    key: 'pending-olivia',
    email: 'olivia.davis@example.com',
    name: 'Olivia Davis',
    role: 'client',
    label: 'Tenant — awaiting approval (Ridge Avenue duplex)',
    description: 'Signed up for Ridge Avenue Unit A duplex; waiting for landlord approval',
    group: 'edge',
    journey: 'pending_approval',
  },
  {
    key: 'sample-emily',
    email: 'emily@rodriguezwellness.com',
    name: 'Emily Rodriguez',
    role: 'client',
    label: 'Tenant — Sent',
    description: 'Accepted; lease sent, waiting to sign',
    group: 'edge',
    journey: 'lease_sent',
  },
  {
    key: 'sample-james',
    email: 'james@chenarch.com',
    name: 'James Chen',
    role: 'client',
    label: 'Tenant — Active · overdue',
    description: 'Active lease (start passed) with July rent overdue',
    group: 'edge',
    journey: 'active_overdue',
  },
  {
    key: 'sample-jordan',
    email: 'jordan.kim@example.com',
    name: 'Jordan Kim',
    role: 'client',
    label: 'Tenant — Active · partial',
    description: 'Roommate share with $800 paid toward July ($400 remaining)',
    group: 'edge',
    journey: 'active_partial',
  },
  {
    key: 'sample-marcus',
    email: 'marcus@webblegal.com',
    name: 'Marcus Webb',
    role: 'client',
    label: 'Tenant — Signed · upcoming',
    description: 'Signed lease begins August 1; first month paid early',
    group: 'edge',
    journey: 'signed_upcoming',
  },
  {
    key: 'sample-lisa',
    email: 'lisa@parkphoto.com',
    name: 'Lisa Park',
    role: 'client',
    label: 'Tenant — Active · paid',
    description: 'Active lease with rent paid through July',
    group: 'edge',
    journey: 'active_paid',
  },
]

export const ALL_MOCK_USERS: AdminMockUser[] = [...CORE_MOCK_USERS, ...EDGE_MOCK_USERS]

/** First-time / signed-out entry points */
export const FIRST_TIME_SCENARIOS: AdminScenario[] = [
  {
    id: 'first-time-home',
    label: 'Role select (first visit)',
    description: 'Signed out — choose landlord or tenant',
    path: '/',
  },
  {
    id: 'first-time-tenant-register',
    label: 'Register as tenant',
    description: 'Select agency + property, fill tenant info, then Apply',
    path: '/register',
  },
  {
    id: 'first-time-landlord-register',
    label: 'Register as landlord',
    description: 'New landlord account creation',
    path: '/studio/register',
  },
  {
    id: 'first-time-tenant-login',
    label: 'Tenant login',
    description: 'Existing tenant sign-in screen',
    path: '/login',
  },
  {
    id: 'first-time-landlord-login',
    label: 'Landlord login',
    description: 'Existing landlord sign-in screen',
    path: '/studio/login',
  },
]

const landlordScenarios: AdminScenario[] = [
  {
    id: 'landlord-dashboard',
    label: 'Tenants and Waiting',
    description: 'Overview with pending registrations and tenants',
    email: 'landlord@leased.test',
    path: '/studio',
    reseed: true,
  },
  {
    id: 'landlord-registrations',
    label: 'Approve new tenants',
    description: 'Tenants and Waiting → Waiting to Connect (pending sign-ups)',
    email: 'landlord@leased.test',
    path: '/studio',
    reseed: true,
  },
  {
    id: 'landlord-tenants',
    label: 'Official Tenants',
    description: 'Tenants and Waiting → Official Tenants, Waiting to Connect, and Pending Tenants',
    email: 'landlord@leased.test',
    path: '/studio',
    reseed: true,
  },
  {
    id: 'landlord-contracts',
    label: 'Leases',
    description: 'Lease list and send flows',
    email: 'landlord@leased.test',
    path: '/studio/contracts',
    reseed: true,
  },
  {
    id: 'landlord-payments',
    label: 'Payments',
    description: 'Rent and deposit payment overview',
    email: 'landlord@leased.test',
    path: '/studio/payments',
    reseed: true,
  },
  {
    id: 'landlord-overdue',
    label: 'Overdue rent',
    description: 'Past-due tenants with Send Message to Tenant',
    email: 'landlord@leased.test',
    path: '/studio/payments?status=overdue',
    reseed: true,
  },
  {
    id: 'landlord-alerts',
    label: 'Tenant Alerts',
    description: 'Problem reports from tenants',
    email: 'landlord@leased.test',
    path: '/studio/alerts',
    reseed: true,
  },
  {
    id: 'landlord-openings',
    label: 'Upcoming openings',
    description: 'Vacant units and ending leases',
    email: 'landlord@leased.test',
    path: '/studio/properties',
    reseed: true,
  },
  {
    id: 'landlord-settings',
    label: 'Help and Settings',
    description: 'Business info, automation, lease defaults, and app style',
    email: 'landlord@leased.test',
    path: '/studio/settings?tab=business',
  },
]

const pendingScenarios: AdminScenario[] = [
  {
    id: 'pending-fresh-apply',
    label: 'Start application',
    description:
      'Portal: Start Application or invite code → Send → Application Submitted tip → Switch to Landlord (direct)',
    email: 'ava.mitchell@example.com',
    path: '/portal',
    reseed: true,
  },
  {
    id: 'pending-waiting',
    label: 'Waiting for approval',
    description: 'Portal home while unlinked from a lease',
    email: 'emma.johnson@example.com',
    path: '/portal',
    reseed: true,
  },
  {
    id: 'pending-timeline',
    label: 'Timeline (pre-approval)',
    description: 'Timeline before landlord accepts registration',
    email: 'emma.johnson@example.com',
    path: '/portal/timeline',
    reseed: true,
  },
  {
    id: 'pending-profile',
    label: 'Profile & password',
    description: 'Tenant profile while still pending',
    email: 'emma.johnson@example.com',
    path: '/portal/profile',
    reseed: true,
  },
]

const awaitingScenarios: AdminScenario[] = [
  {
    id: 'awaiting-sign',
    label: 'Review & sign lease',
    description: 'Portal home with a lease waiting for signature',
    email: 'awaiting@leased.test',
    path: '/portal',
    reseed: true,
  },
  {
    id: 'awaiting-timeline',
    label: 'Timeline (lease sent)',
    description: 'Milestones after lease has been sent',
    email: 'awaiting@leased.test',
    path: '/portal/timeline',
    reseed: true,
  },
  {
    id: 'awaiting-profile',
    label: 'Profile',
    description: 'Tenant profile while lease is unsigned',
    email: 'awaiting@leased.test',
    path: '/portal/profile',
  },
]

const activeScenarios: AdminScenario[] = [
  {
    id: 'active-dashboard',
    label: 'Active tenant dashboard',
    description: 'Signed lease, deposit paid, official tenant',
    email: 'active@leased.test',
    path: '/portal',
    reseed: true,
  },
  {
    id: 'active-timeline',
    label: 'Timeline (active)',
    description: 'Full timeline after signing',
    email: 'active@leased.test',
    path: '/portal/timeline',
    reseed: true,
  },
  {
    id: 'active-profile',
    label: 'Profile',
    description: 'Active tenant profile and theme',
    email: 'active@leased.test',
    path: '/portal/profile',
  },
]

const edgeScenariosByKey: Record<string, AdminScenario[]> = {
  'sample-emily': [
    {
      id: 'emily-portal',
      label: 'Lease-sent portal',
      description: 'Accepted tenant waiting to sign the lease',
      email: 'emily@rodriguezwellness.com',
      path: '/portal',
    },
    {
      id: 'emily-as-landlord',
      label: 'View as landlord',
      description: 'Open dashboard — Emily appears under Pending Tenants (Lease Sent)',
      email: 'landlord@leased.test',
      path: '/studio',
    },
  ],
  'sample-james': [
    {
      id: 'james-portal',
      label: 'Lease sent + overdue (tenant)',
      description: 'Tenant view of sent lease with overdue rent',
      email: 'james@chenarch.com',
      path: '/portal',
    },
    {
      id: 'james-overdue-landlord',
      label: 'Overdue rent (landlord)',
      description: 'Landlord Payments filtered to overdue, featuring James',
      email: 'landlord@leased.test',
      path: '/studio/payments?status=overdue',
    },
  ],
  'sample-marcus': [
    {
      id: 'marcus-portal',
      label: 'Paid / active portal',
      description: 'Fully paid tenant with project started',
      email: 'marcus@webblegal.com',
      path: '/portal',
    },
    {
      id: 'marcus-timeline',
      label: 'Timeline',
      description: 'Completed payment milestones',
      email: 'marcus@webblegal.com',
      path: '/portal/timeline',
    },
  ],
  'sample-lisa': [
    {
      id: 'lisa-portal',
      label: 'Paid (tenant)',
      description: 'Tenant portal with rent current through July',
      email: 'lisa@parkphoto.com',
      path: '/portal',
    },
    {
      id: 'lisa-payments-landlord',
      label: 'Paid (landlord)',
      description: 'Lisa appears under Official Tenants and Payments as Paid',
      email: 'landlord@leased.test',
      path: '/studio/payments',
    },
  ],
}

export function scenariosForMockUser(user: AdminMockUser): AdminScenario[] {
  switch (user.key) {
    case 'landlord':
      return landlordScenarios
    case 'pending':
    case 'pending-fresh':
      return pendingScenarios
    case 'awaiting':
      return awaitingScenarios
    case 'active':
      return activeScenarios
    default:
      return edgeScenariosByKey[user.key] ?? [
        {
          id: `${user.key}-enter`,
          label: 'Enter portal',
          description: user.description,
          email: user.email,
          path: user.role === 'admin' ? '/studio' : '/portal',
        },
      ]
  }
}

export function homePathForRole(role: AdminMockRole) {
  return role === 'admin' ? '/studio' : '/portal'
}

export async function reseedDemoData() {
  return apiFetch<{ ok: boolean }>('/api/dev/admin/reseed', { method: 'POST' })
}

export async function resetMockOnboarding(email: string) {
  return apiFetch<{ ok: boolean }>('/api/dev/admin/reset-onboarding', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function isAdminModeEnabled() {
  if (import.meta.env.VITE_ADMIN_MODE === 'false') return false
  if (isAdminUnlocked()) return true
  if (import.meta.env.VITE_ADMIN_MODE === 'true') return true
  return import.meta.env.DEV
}
