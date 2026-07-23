import type { BusinessSettings, Client, ProfileReminder, Property } from '@/types'
import { getDemoAsOfIso, getDemoAsOfYmd } from '@/lib/demoClock'
import { generateId } from '@/lib/storage'

/** June 9, 2026 + 90 days */
export const STRIPE_TOKEN_EXPIRY_DATE = '2026-09-07'

export const defaultProfileReminders: ProfileReminder[] = [
  {
    id: 'stripe-token-expiry',
    text: 'Stripe access token expires on September 7, 2026. Renew before this date to avoid payment interruptions.',
    dueDate: STRIPE_TOKEN_EXPIRY_DATE,
    createdAt: '2026-06-09T00:00:00.000Z',
  },
]

export const defaultSettings: BusinessSettings = {
  businessName: 'Your Studio',
  ownerName: 'Your Name',
  email: 'hello@yourstudio.com',
  phone: '(555) 000-0000',
  address: '401 Market Street, Suite 200, Steubenville, OH 43952',
  defaultPaymentTerms: 'Monthly rent due on the 1st of each month for the lease term.',
  defaultRevisionLimit: '3',
  defaultContractFooter:
    'This residential lease agreement constitutes the entire understanding between landlord and tenant regarding the premises. Local and state landlord-tenant laws may impose additional rights and obligations. Any modifications must be in writing and signed by both parties.',
  /** Seasonal Jan 1 / Aug 1 defaults unless the landlord enables custom calendar dates. */
  customDefaultLeaseDates: false,
  defaultLeaseStartDate: '',
  defaultLeaseEndDate: '',
  profileReminders: defaultProfileReminders,
  automation: {
    enabled: true,
    deadlineReminderDays: 3,
    sendEmailReminders: true,
    projectStatusUpdates: true,
    followUpReminders: true,
  },
  contractRegions: [],
}

/** Maps outdated mock/sample addresses (and old agency project titles) to realistic replacements. */
export const SAMPLE_ADDRESS_MIGRATIONS: Record<string, string> = {
  '123 Creative Lane, Your City, ST 00000':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '412 Oak Street, Suite 2, Brooklyn, NY 11201':
    '285 Bethany Pike, Wellsburg, WV 26070',
  '88 Harbor Ave, Unit 4B, Queens, NY 11101':
    '523 Juanita Street, Steubenville, OH 43952',
  '15 Pine Court #301, Hoboken, NJ 07030':
    '201 Heights Street, Weirton, WV 26062',
  '220 Maple Row, Miami, FL 33101': '77 Maryland Street, Wheeling, WV 26003',
  '9 River Road, Apt 12, San Francisco, CA 94107':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '100 Lease Lane, Unit 2B, Austin, TX 78701':
    '211 Donnell Street, Weirton, WV 26062',
  '100 Lease Lane, Unit 3C, Austin, TX 78701':
    '107 Broad Street, St. Clairsville, OH 43950',
  '100 Lease Lane, Demo City, ST 00000':
    '401 Market Street, Suite 200, Steubenville, OH 43952',
  '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205':
    '523 Juanita Street, Steubenville, OH 43952',
  '56 East Market Street #210, Philadelphia, PA 19107':
    '201 Heights Street, Weirton, WV 26062',
  '3315 South Magnolia Avenue, Tampa, FL 33609':
    '77 Maryland Street, Wheeling, WV 26003',
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
    '285 Bethany Pike, Wellsburg, WV 26070',
  '261 East Main Street, St. Clairsville, OH 43950':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  '150 Orchard Street, Wintersville, OH 43953':
    '430 Canton Road, Unit 11, Wintersville, OH 43953',
  '903 Logan Avenue, Mingo Junction, OH 43938':
    '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
  '4610A Scioto Drive, Steubenville, OH 43953':
    '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
  'Portfolio Website': '523 Juanita Street, Steubenville, OH 43952',
  'Brand Identity Package': '201 Heights Street, Weirton, WV 26062',
  'Local SEO Optimization': '77 Maryland Street, Wheeling, WV 26003',
}

export function migrateSampleAddress(address?: string): string | undefined {
  if (!address) return address
  return SAMPLE_ADDRESS_MIGRATIONS[address.trim()] ?? address
}

/** Follow-ups relative to Demo Mode “today” (July 22). */
function demoRelativeDate(daysFromDemoToday: number): string {
  const [y, m, d] = getDemoAsOfYmd().split('-').map(Number)
  const date = new Date(y, m - 1, d + daysFromDemoToday)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * Curated landlord portfolio — real addresses within ~40 miles of Steubenville, OH.
 * Types and bedrooms match the actual properties. Duplex units include unit letters.
 * Each mock tenant is assigned a distinct property.
 */
export function seedProperties(): Property[] {
  const now = getDemoAsOfIso()
  return [
    {
      id: generateId(),
      address: '523 Juanita Street, Steubenville, OH 43952',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 3,
      bathrooms: 2,
      maxTenants: 4,
      monthlyRent: 2400,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '523 Juanita Street',
        city: 'Steubenville',
        state: 'OH',
        zip: '43952',
      },
    },
    {
      id: generateId(),
      address: '201 Heights Street, Weirton, WV 26062',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 3,
      bathrooms: 2,
      maxTenants: 4,
      monthlyRent: 2150,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '201 Heights Street',
        city: 'Weirton',
        state: 'WV',
        zip: '26062',
      },
    },
    {
      id: generateId(),
      address: '77 Maryland Street, Wheeling, WV 26003',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 3,
      bathrooms: 2,
      maxTenants: 4,
      monthlyRent: 2200,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '77 Maryland Street',
        city: 'Wheeling',
        state: 'WV',
        zip: '26003',
      },
    },
    {
      id: generateId(),
      address: '211 Donnell Street, Weirton, WV 26062',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 4,
      bathrooms: 2.5,
      maxTenants: 5,
      monthlyRent: 2850,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '211 Donnell Street',
        city: 'Weirton',
        state: 'WV',
        zip: '26062',
      },
    },
    {
      id: generateId(),
      address: '107 Broad Street, St. Clairsville, OH 43950',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 5,
      bathrooms: 3,
      maxTenants: 6,
      monthlyRent: 3200,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '107 Broad Street',
        city: 'St. Clairsville',
        state: 'OH',
        zip: '43950',
      },
    },
    {
      id: generateId(),
      address: '285 Bethany Pike, Wellsburg, WV 26070',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 2,
      bathrooms: 1.5,
      maxTenants: 3,
      monthlyRent: 1850,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '285 Bethany Pike',
        city: 'Wellsburg',
        state: 'WV',
        zip: '26070',
      },
    },
    {
      id: generateId(),
      address: '4610 Scioto Drive, Unit A, Steubenville, OH 43953',
      propertyType: 'Townhouse',
      unitCount: 1,
      bedrooms: 2,
      bathrooms: 1.5,
      maxTenants: 3,
      monthlyRent: 1750,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '4610 Scioto Drive, Unit A',
        city: 'Steubenville',
        state: 'OH',
        zip: '43953',
      },
    },
    {
      id: generateId(),
      address: '430 Canton Road, Unit 11, Wintersville, OH 43953',
      propertyType: 'Apartment',
      unitCount: 1,
      bedrooms: 2,
      bathrooms: 1,
      maxTenants: 3,
      monthlyRent: 1450,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '430 Canton Road, Unit 11',
        city: 'Wintersville',
        state: 'OH',
        zip: '43953',
      },
    },
    {
      id: generateId(),
      address: '1430 Ridge Avenue, Unit A, Steubenville, OH 43952',
      propertyType: 'Duplex',
      unitCount: 1,
      bedrooms: 1,
      bathrooms: 1,
      maxTenants: 2,
      monthlyRent: 1350,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '1430 Ridge Avenue, Unit A',
        city: 'Steubenville',
        state: 'OH',
        zip: '43952',
      },
    },
    {
      id: generateId(),
      address: '1430 Ridge Avenue, Unit B, Steubenville, OH 43952',
      propertyType: 'Duplex',
      unitCount: 1,
      bedrooms: 1,
      bathrooms: 1,
      maxTenants: 2,
      monthlyRent: 1400,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '1430 Ridge Avenue, Unit B',
        city: 'Steubenville',
        state: 'OH',
        zip: '43952',
      },
    },
  ]
}

/**
 * Seed clients use Jan 1 / Aug 1 lease starts (6 or 12 months only). Full payment
 * histories are applied server-side by applyDemoLeaseFixturesToStore so landlord
 * and tenant stay in sync. Each sample tenant has a distinct Steubenville-area
 * property. Official Tenants (and Payments) list signed leases that are upcoming
 * or currently in term as of demo today (July 22).
 */
export function seedClients(): Client[] {
  const now = getDemoAsOfIso()
  return [
    {
      id: generateId(),
      name: 'James Chen',
      businessName: 'Chen Architecture',
      email: 'james@chenarch.com',
      phone: '(718) 876-5432',
      projectType: 'House',
      projectName: '523 Juanita Street, Steubenville, OH 43952',
      projectDescription:
        'January 1, 2026–January 1, 2027 lease — Active; shares $2,400 home with roommate (July rent past due).',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Overdue',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      notes: [],
      deadlines: [
        {
          id: generateId(),
          type: 'follow-up',
          date: demoRelativeDate(2),
          time: '10:30',
          meetingLink: 'https://meet.example.com/chen-architecture-followup',
          label: 'Overdue rent follow-up call',
          description: 'Confirm July rent status and payment plan if needed.',
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
        'Roommate at Juanita — $1,200 share of $2,400; $800 paid toward July (partial balance).',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Unpaid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      currentPeriodAmountPaid: 800,
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
      phone: '(201) 111-2222',
      projectType: 'House',
      projectName: '201 Heights Street, Weirton, WV 26062',
      projectDescription:
        'Accepted tenant — lease Sent for August 1, 2026 start; awaiting signature.',
      projectStatus: 'Contract Sent',
      contractStatus: 'Sent',
      paymentStatus: 'Unpaid',
      leaseLengthMonths: 12,
      isOfficialClient: false,
      followUpDate: demoRelativeDate(9),
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
          date: demoRelativeDate(9),
          time: '15:00',
          meetingLink: 'https://meet.example.com/rodriguez-wellness-discovery',
          label: 'Lease signature follow-up',
          description:
            'Confirm Emily received the lease and answer any move-in questions.',
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
      phone: '(305) 333-4444',
      projectType: 'House',
      projectName: '77 Maryland Street, Wheeling, WV 26003',
      projectDescription:
        'Signed 12-month lease begins August 1, 2026 — badge stays Signed until that date (not Active yet); first month already paid early.',
      projectStatus: 'Contract Signed',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
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
      phone: '(415) 555-6666',
      projectType: 'House',
      projectName: '285 Bethany Pike, Wellsburg, WV 26070',
      projectDescription:
        'January 1, 2026–January 1, 2027 lease — Active; rent paid through July.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      followUpDate: demoRelativeDate(4),
      notes: [],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
  ]
}
