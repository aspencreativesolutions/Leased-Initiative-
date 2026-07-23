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
  address: '4821 Westheimer Road, Suite 210, Houston, TX 77056',
  defaultPaymentTerms: 'Monthly rent due on the 1st of each month for the lease term.',
  defaultRevisionLimit: '3',
  defaultContractFooter:
    'This residential lease agreement constitutes the entire understanding between landlord and tenant regarding the premises. Local and state landlord-tenant laws may impose additional rights and obligations. Any modifications must be in writing and signed by both parties.',
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
    '4821 Westheimer Road, Suite 210, Houston, TX 77056',
  '412 Oak Street, Suite 2, Brooklyn, NY 11201':
    '1847 North Whispering Pines Boulevard, Apartment 12B, Charlotte, NC 28202',
  '88 Harbor Ave, Unit 4B, Queens, NY 11101':
    '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205',
  '15 Pine Court #301, Hoboken, NJ 07030':
    '56 East Market Street #210, Philadelphia, PA 19107',
  '220 Maple Row, Miami, FL 33101': '3315 South Magnolia Avenue, Tampa, FL 33609',
  '9 River Road, Apt 12, San Francisco, CA 94107':
    '7748 Highland Park Lane, Austin, TX 78745',
  '100 Lease Lane, Unit 2B, Austin, TX 78701':
    '2140 Barton Springs Road, Unit 2B, Austin, TX 78704',
  '100 Lease Lane, Unit 3C, Austin, TX 78701':
    '8901 North Lamar Boulevard, Unit 3C, Austin, TX 78753',
  '100 Lease Lane, Demo City, ST 00000':
    '1200 Congress Avenue, Suite 400, Austin, TX 78701',
  'Portfolio Website': '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205',
  'Brand Identity Package': '56 East Market Street #210, Philadelphia, PA 19107',
  'Local SEO Optimization': '3315 South Magnolia Avenue, Tampa, FL 33609',
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
 * Curated landlord portfolio. Some properties have vacant units; Portland Unit 4
 * is shared by two sample tenants (roommates).
 */
export function seedProperties(): Property[] {
  const now = getDemoAsOfIso()
  return [
    {
      id: generateId(),
      address: '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205',
      propertyType: 'Apartment',
      unitCount: 1,
      bedrooms: 2,
      maxTenants: 2,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '902 West Cedar Ridge Drive, Unit 4',
        city: 'Portland',
        state: 'OR',
        zip: '97205',
      },
    },
    {
      id: generateId(),
      address: '56 East Market Street #210, Philadelphia, PA 19107',
      propertyType: 'Apartment',
      unitCount: 3,
      bedrooms: 1,
      maxTenants: 3,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '56 East Market Street #210',
        city: 'Philadelphia',
        state: 'PA',
        zip: '19107',
      },
    },
    {
      id: generateId(),
      address: '3315 South Magnolia Avenue, Tampa, FL 33609',
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 3,
      maxTenants: 4,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '3315 South Magnolia Avenue',
        city: 'Tampa',
        state: 'FL',
        zip: '33609',
      },
    },
    {
      id: generateId(),
      address: '7748 Highland Park Lane, Austin, TX 78745',
      propertyType: 'Townhouse',
      unitCount: 1,
      bedrooms: 2,
      maxTenants: 3,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '7748 Highland Park Lane',
        city: 'Austin',
        state: 'TX',
        zip: '78745',
      },
    },
    {
      id: generateId(),
      address: '2140 Barton Springs Road, Unit 2B, Austin, TX 78704',
      propertyType: 'Multi-Family Building',
      unitCount: 4,
      bedrooms: 2,
      maxTenants: 6,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '2140 Barton Springs Road, Unit 2B',
        city: 'Austin',
        state: 'TX',
        zip: '78704',
      },
    },
    {
      id: generateId(),
      address: '8901 North Lamar Boulevard, Unit 3C, Austin, TX 78753',
      propertyType: 'Condominium (Condo)',
      unitCount: 1,
      bedrooms: 3,
      maxTenants: 4,
      createdAt: now,
      addressConfirmed: true,
      addressDetails: {
        street: '8901 North Lamar Boulevard, Unit 3C',
        city: 'Austin',
        state: 'TX',
        zip: '78753',
      },
    },
  ]
}

/**
 * Seed clients use Jan 1 / Aug 1 lease starts (6 or 12 months only). Full payment
 * histories are applied server-side by applyDemoLeaseFixturesToStore so landlord
 * and tenant stay in sync. James Chen and Lisa Park share Portland Unit 4 (roommates).
 * Official Tenants only lists leases currently in term as of demo today (July 22).
 */
export function seedClients(): Client[] {
  const now = getDemoAsOfIso()
  const sharedPortland = '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205'
  return [
    {
      id: generateId(),
      name: 'James Chen',
      businessName: 'Chen Architecture',
      email: 'james@chenarch.com',
      phone: '(718) 876-5432',
      projectType: 'Apartment',
      projectName: sharedPortland,
      projectDescription:
        'January 1, 2026–January 1, 2027 lease — shares Unit 4 with Lisa Park; July rent currently past due.',
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
      name: 'Emily Rodriguez',
      businessName: 'Rodriguez Wellness',
      email: 'emily@rodriguezwellness.com',
      phone: '(201) 111-2222',
      projectType: 'Condo',
      projectName: '56 East Market Street #210, Philadelphia, PA 19107',
      projectDescription:
        'Accepted tenant — lease sent for August 1, 2026 start; awaiting signature.',
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
      projectType: 'Townhouse',
      projectName: '3315 South Magnolia Avenue, Tampa, FL 33609',
      projectDescription:
        'Signed 12-month lease begins August 1, 2026 (upcoming — not active before that date); first month already paid early.',
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
      projectType: 'Apartment',
      projectName: sharedPortland,
      projectDescription:
        'Six-month lease (January 1–July 1, 2026) sharing Unit 4 with James Chen — term ended; re-sign outreach due.',
      projectStatus: 'Follow-Up Needed',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Launch',
      leaseLengthMonths: 6,
      // Completed lease — not listed under Official Tenants
      isOfficialClient: false,
      followUpDate: demoRelativeDate(4),
      notes: [
        {
          id: generateId(),
          text: 'Six-month lease ended — discuss re-sign or move-out with roommate James Chen.',
          createdAt: now,
          category: 'Contract',
        },
      ],
      deadlines: [],
      isSampleClient: true,
      demoLeaseStartDate: '2026-01-01',
      createdAt: now,
    },
  ]
}
