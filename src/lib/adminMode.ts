import { apiFetch } from '@/lib/api'

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
    key: 'pending',
    email: 'pending@leased.test',
    name: 'Pat Pending',
    role: 'client',
    label: 'Tenant — awaiting approval',
    description: 'Signed up; waiting for landlord approval',
    group: 'core',
    journey: 'pending_approval',
  },
  {
    key: 'awaiting',
    email: 'awaiting@leased.test',
    name: 'Taylor Awaiting',
    role: 'client',
    label: 'Tenant — lease sent',
    description: 'Approved; lease sent, waiting to sign',
    group: 'core',
    journey: 'lease_sent',
  },
  {
    key: 'active',
    email: 'active@leased.test',
    name: 'Casey Active',
    role: 'client',
    label: 'Tenant — active',
    description: 'Lease signed; active tenant',
    group: 'core',
    journey: 'active',
  },
]

export const EDGE_MOCK_USERS: AdminMockUser[] = [
  {
    key: 'sample-emily',
    email: 'emily@rodriguezwellness.com',
    name: 'Emily Rodriguez',
    role: 'client',
    label: 'Tenant — early inquiry',
    description: 'Linked inquiry; lease not started',
    group: 'edge',
    journey: 'inquiry',
  },
  {
    key: 'sample-james',
    email: 'james@chenarch.com',
    name: 'James Chen',
    role: 'client',
    label: 'Tenant — lease sent + overdue',
    description: 'Lease sent with overdue rent',
    group: 'edge',
    journey: 'lease_sent_overdue',
  },
  {
    key: 'sample-sarah',
    email: 'sarah@bloombotanicals.com',
    name: 'Sarah Mitchell',
    role: 'client',
    label: 'Tenant — in progress',
    description: 'Signed, deposit paid, project in progress',
    group: 'edge',
    journey: 'in_progress',
  },
  {
    key: 'sample-marcus',
    email: 'marcus@webblegal.com',
    name: 'Marcus Webb',
    role: 'client',
    label: 'Tenant — paid / active',
    description: 'Signed, fully paid, project started',
    group: 'edge',
    journey: 'paid_active',
  },
  {
    key: 'sample-lisa',
    email: 'lisa@parkphoto.com',
    name: 'Lisa Park',
    role: 'client',
    label: 'Tenant — multi-overdue rent',
    description: 'Signed with multiple overdue rent payments',
    group: 'edge',
    journey: 'multi_overdue',
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
    description: 'New tenant account creation',
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
    label: 'Dashboard',
    description: 'Overview with pending registrations and deadlines',
    email: 'landlord@leased.test',
    path: '/studio',
    reseed: true,
  },
  {
    id: 'landlord-registrations',
    label: 'Approve new tenants',
    description: 'Users page — pending registrations queue',
    email: 'landlord@leased.test',
    path: '/studio/users',
    reseed: true,
  },
  {
    id: 'landlord-tenants',
    label: 'All tenants',
    description: 'Clients list across lease stages',
    email: 'landlord@leased.test',
    path: '/studio/clients',
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
    path: '/studio/payments/overdue',
    reseed: true,
  },
  {
    id: 'landlord-calendar',
    label: 'Calendar',
    description: 'Deadlines and rent schedule',
    email: 'landlord@leased.test',
    path: '/studio/calendar',
    reseed: true,
  },
  {
    id: 'landlord-settings',
    label: 'Settings',
    description: 'Business profile and preferences',
    email: 'landlord@leased.test',
    path: '/studio/settings',
  },
]

const pendingScenarios: AdminScenario[] = [
  {
    id: 'pending-waiting',
    label: 'Waiting for approval',
    description: 'Portal home while unlinked from a lease',
    email: 'pending@leased.test',
    path: '/portal',
    reseed: true,
  },
  {
    id: 'pending-timeline',
    label: 'Timeline (pre-approval)',
    description: 'Timeline before landlord accepts registration',
    email: 'pending@leased.test',
    path: '/portal/timeline',
    reseed: true,
  },
  {
    id: 'pending-profile',
    label: 'Profile & password',
    description: 'Tenant profile while still pending',
    email: 'pending@leased.test',
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
      label: 'Inquiry portal',
      description: 'Linked tenant before lease drafting',
      email: 'emily@rodriguezwellness.com',
      path: '/portal',
    },
    {
      id: 'emily-as-landlord',
      label: 'View as landlord',
      description: 'Open landlord clients list (Emily is an inquiry)',
      email: 'landlord@leased.test',
      path: '/studio/clients',
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
      description: 'Landlord overdue rent page featuring James',
      email: 'landlord@leased.test',
      path: '/studio/payments/overdue',
    },
  ],
  'sample-sarah': [
    {
      id: 'sarah-portal',
      label: 'In-progress portal',
      description: 'Active lease with project in progress',
      email: 'sarah@bloombotanicals.com',
      path: '/portal',
    },
    {
      id: 'sarah-timeline',
      label: 'Timeline',
      description: 'Mid-lease timeline milestones',
      email: 'sarah@bloombotanicals.com',
      path: '/portal/timeline',
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
      label: 'Multi-overdue (tenant)',
      description: 'Tenant portal with multiple past-due rent items',
      email: 'lisa@parkphoto.com',
      path: '/portal',
    },
    {
      id: 'lisa-overdue-landlord',
      label: 'Multi-overdue (landlord)',
      description: 'Landlord overdue view for Lisa’s rents',
      email: 'landlord@leased.test',
      path: '/studio/payments/overdue',
    },
  ],
}

export function scenariosForMockUser(user: AdminMockUser): AdminScenario[] {
  switch (user.key) {
    case 'landlord':
      return landlordScenarios
    case 'pending':
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
  if (import.meta.env.VITE_ADMIN_MODE === 'true') return true
  return import.meta.env.DEV
}
