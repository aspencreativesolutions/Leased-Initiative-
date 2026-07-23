import type { AdminMockUser } from '@/lib/adminMode'
import { ALL_MOCK_USERS } from '@/lib/adminMode'

/**
 * Rich POV cards for Demo Mode tenant switching.
 * Keep addresses / lease dates aligned with seed + demoLeaseFixtures.
 */
export type DemoTenantPovOption = {
  key: string
  email: string
  name: string
  /** Short scenario title shown as the primary badge */
  scenario: string
  /** One-line summary of what this POV demonstrates */
  summary: string
  address: string
  leaseStart: string
  leaseTerm: string
  monthlyRent: string | null
  paymentMethod: string
  paymentStatus: string
  /** Extra facts shown in the card body */
  details: string[]
}

const TENANT_POV_BY_KEY: Record<string, Omit<DemoTenantPovOption, 'key' | 'email' | 'name'>> = {
  pending: {
    scenario: 'Awaiting approval',
    summary: 'Just registered — waiting for the landlord to accept the application.',
    address: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
    leaseStart: 'Prefers August 1, 2026',
    leaseTerm: '12 months (preferred)',
    monthlyRent: null,
    paymentMethod: 'Not set yet',
    paymentStatus: 'No lease yet',
    details: [
      'Appears under Waiting to Connect for the landlord',
      'Portal shows pending-approval messaging',
    ],
  },
  'pending-michael': {
    scenario: 'Awaiting approval',
    summary: 'Registered for Donnell Street; still in the landlord’s approval queue.',
    address: '211 Donnell Street, Weirton, WV 26062',
    leaseStart: 'Prefers August 1, 2026',
    leaseTerm: '12 months (preferred)',
    monthlyRent: null,
    paymentMethod: 'Not set yet',
    paymentStatus: 'No lease yet',
    details: ['Second Waiting to Connect applicant for multi-signup demos'],
  },
  'pending-olivia': {
    scenario: 'Awaiting approval',
    summary: 'Registered for a duplex unit; prefers a shorter lease term.',
    address: '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
    leaseStart: 'Prefers August 1, 2026',
    leaseTerm: '6 months (preferred)',
    monthlyRent: null,
    paymentMethod: 'Not set yet',
    paymentStatus: 'No lease yet',
    details: ['Useful for testing shorter preferred lease lengths'],
  },
  awaiting: {
    scenario: 'Sent',
    summary: 'Approved tenant with a lease in the portal — waiting to review and sign.',
    address: '430 Canton Road, Unit 11, Wintersville, OH 43953',
    leaseStart: 'August 1, 2026',
    leaseTerm: '12 months',
    monthlyRent: '$1,450 / month',
    paymentMethod: 'PayPal (portal checkout)',
    paymentStatus: 'First month paid early · lease unsigned',
    details: [
      'Lease Agreements badge: Sent',
      'Move-in has not started yet',
      'Sign the lease to become an Official Tenant',
    ],
  },
  active: {
    scenario: 'Active',
    summary: 'Signed lease whose start date has passed — current tenant near term end.',
    address: '107 Broad Street, St. Clairsville, OH 43950',
    leaseStart: 'August 1, 2025',
    leaseTerm: '12 months (Month 11 of 12 · final rent due August 1)',
    monthlyRent: '$3,200 / month',
    paymentMethod: 'Stripe (portal checkout)',
    paymentStatus: 'Current · last paid July 1 on time · final due August 1',
    details: [
      'Lease Agreements badge: Active',
      'Listed under Official Tenants',
      'Good POV for paying rent, timeline, and profile',
    ],
  },
  'sample-emily': {
    scenario: 'Sent',
    summary: 'Accepted pending tenant — lease sent for an upcoming August start.',
    address: '201 Heights Street, Weirton, WV 26062',
    leaseStart: 'August 1, 2026',
    leaseTerm: '12 months',
    monthlyRent: '$2,150 / month',
    paymentMethod: 'PayPal (portal checkout)',
    paymentStatus: 'Unpaid · awaiting signature',
    details: [
      'Lease Agreements badge: Sent',
      'Shows under Pending Tenants for the landlord',
      'No rent schedule issued until the lease is signed',
    ],
  },
  'sample-james': {
    scenario: 'Active · overdue rent',
    summary:
      'Active lease sharing a $2,400 home ($1,200 share) with July rent past due.',
    address: '523 Juanita Street, Steubenville, OH 43952',
    leaseStart: 'January 1, 2026',
    leaseTerm: '12 months',
    monthlyRent: '$1,200 / month (share of $2,400)',
    paymentMethod: 'PayPal (portal checkout)',
    paymentStatus: 'July rent overdue',
    details: [
      'Lease Agreements badge: Active',
      'Shares the home with roommate Jordan Kim',
      'Landlord Payments → Overdue features this tenant',
    ],
  },
  'sample-jordan': {
    scenario: 'Active · partial payment',
    summary:
      'Roommate at Juanita — $1,200 share with $800 paid toward July ($400 remaining).',
    address: '523 Juanita Street, Steubenville, OH 43952',
    leaseStart: 'January 1, 2026',
    leaseTerm: '12 months',
    monthlyRent: '$1,200 / month (share of $2,400)',
    paymentMethod: 'PayPal (portal checkout)',
    paymentStatus: 'Partial · $400 remaining',
    details: [
      'Lease Agreements badge: Active',
      'Demonstrates equal rent split + partial balance',
    ],
  },
  'sample-marcus': {
    scenario: 'Signed · upcoming start',
    summary: 'Lease signed and first month paid early; term begins August 1 (not Active yet).',
    address: '77 Maryland Street, Wheeling, WV 26003',
    leaseStart: 'August 1, 2026',
    leaseTerm: '12 months',
    monthlyRent: '$2,200 / month',
    paymentMethod: 'Square (portal checkout)',
    paymentStatus: 'Deposit paid · August rent paid early',
    details: [
      'Lease Agreements badge: Signed (start date still ahead)',
      'Official tenant before move-in date',
      'Useful for upcoming-lease and early-payment demos',
    ],
  },
  'sample-lisa': {
    scenario: 'Active · rent current',
    summary: 'Active 12-month lease with rent paid through July; next due August 1.',
    address: '285 Bethany Pike, Wellsburg, WV 26070',
    leaseStart: 'January 1, 2026',
    leaseTerm: '12 months',
    monthlyRent: '$1,850 / month',
    paymentMethod: 'Stripe (portal checkout)',
    paymentStatus: 'Paid through July',
    details: [
      'Lease Agreements badge: Active',
      'Listed under Official Tenants and Payments',
      'Single-tenant home — share equals full unit rent',
    ],
  },
}

/** All mock tenants available as Demo Mode POV options (excludes landlord). */
export const DEMO_TENANT_POV_OPTIONS: DemoTenantPovOption[] = ALL_MOCK_USERS.filter(
  (user): user is AdminMockUser & { role: 'client' } => user.role === 'client'
).map((user) => {
  const details = TENANT_POV_BY_KEY[user.key]
  if (!details) {
    return {
      key: user.key,
      email: user.email,
      name: user.name,
      scenario: user.label.replace(/^Tenant — /i, ''),
      summary: user.description,
      address: '—',
      leaseStart: '—',
      leaseTerm: '—',
      monthlyRent: null,
      paymentMethod: '—',
      paymentStatus: '—',
      details: [],
    }
  }
  return {
    key: user.key,
    email: user.email,
    name: user.name,
    ...details,
  }
})

export function findDemoTenantPov(email: string | null | undefined): DemoTenantPovOption | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return DEMO_TENANT_POV_OPTIONS.find((o) => o.email.toLowerCase() === normalized) ?? null
}

/** Grouped for scannable picker sections. */
export const DEMO_TENANT_POV_SECTIONS: { title: string; keys: string[] }[] = [
  {
    title: 'Waiting to Connect',
    keys: ['pending', 'pending-michael', 'pending-olivia'],
  },
  {
    title: 'Lease stages (Sent → Signed → Active)',
    keys: ['awaiting', 'sample-emily', 'sample-marcus', 'active'],
  },
  {
    title: 'Payments & edge cases',
    keys: ['sample-james', 'sample-jordan', 'sample-lisa'],
  },
]
