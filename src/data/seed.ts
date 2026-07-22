import type { BusinessSettings, Client, ProfileReminder } from '@/types'
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
  defaultRevisionLimit: '2',
  defaultContractFooter:
    'This agreement constitutes the entire understanding between the parties. Any modifications must be in writing and signed by both parties.',
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

/** Maps outdated mock/sample addresses to realistic replacements. */
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
}

export function migrateSampleAddress(address?: string): string | undefined {
  if (!address) return address
  return SAMPLE_ADDRESS_MIGRATIONS[address.trim()] ?? address
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function firstOfMonthFromNow(monthsAhead: number): string {
  const d = new Date()
  const target = new Date(d.getFullYear(), d.getMonth() + monthsAhead, 1)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function seedClients(): Client[] {
  const now = new Date().toISOString()
  return [
    {
      id: generateId(),
      name: 'Sarah Mitchell',
      businessName: 'Bloom Botanicals',
      email: 'sarah@bloombotanicals.com',
      phone: '(212) 234-5678',
      website: 'https://bloombotanicals.com',
      projectType: 'House',
      projectName: '1847 North Whispering Pines Boulevard, Apartment 12B, Charlotte, NC 28202',
      projectDescription: 'Full redesign with e-commerce for plant shop.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Summit',
      leaseLengthMonths: 12,
      isOfficialClient: true,
      officialClientSince: now,
      followUpDate: daysFromNow(3),
      notes: [
        {
          id: generateId(),
          text: 'Client prefers email for async updates. Weekly check-in on Fridays.',
          createdAt: now,
          category: 'General',
        },
      ],
      deadlines: [
        {
          id: generateId(),
          type: 'project',
          date: daysFromNow(14),
          time: '17:00',
          label: 'Homepage mockup delivery',
          description:
            'First-round homepage mockups will be shared for review. Prepare consolidated feedback on layout, typography, and imagery so revisions can begin immediately.',
        },
        {
          id: generateId(),
          type: 'payment',
          date: firstOfMonthFromNow(1),
          label: 'Rent due',
          description: 'Monthly rent is due on the 1st.',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'James Chen',
      businessName: 'Chen Architecture',
      email: 'james@chenarch.com',
      phone: '(718) 876-5432',
      projectType: 'Apartment',
      projectName: '902 West Cedar Ridge Drive, Unit 4, Portland, OR 97205',
      projectStatus: 'Contract Sent',
      contractStatus: 'Sent',
      paymentStatus: 'Overdue',
      serviceTier: 'Studio',
      leaseLengthMonths: 12,
      isOfficialClient: false,
      notes: [],
      deadlines: [
        {
          id: generateId(),
          type: 'follow-up',
          date: daysFromNow(1),
          time: '10:30',
          meetingLink: 'https://meet.example.com/chen-architecture-followup',
          label: 'Lease review call',
          description:
            'Walk through the sent lease together — scope, timeline, deposit, and revision terms. Have any questions ready and confirm who will sign on your side.',
        },
        {
          id: generateId(),
          type: 'payment',
          date: daysFromNow(-14),
          label: 'First month rent due',
          description: 'Monthly rent of $2,100 is past due.',
        },
        {
          id: generateId(),
          type: 'contract',
          date: daysFromNow(5),
          label: 'Lease signature follow-up',
          description:
            'If the lease is still unsigned, follow up on outstanding questions and confirm whether any edits are needed before signing.',
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
      phone: '(201) 111-2222',
      projectType: 'Condo',
      projectName: '56 East Market Street #210, Philadelphia, PA 19107',
      projectStatus: 'Inquiry',
      contractStatus: 'Not Started',
      paymentStatus: 'Unpaid',
      isOfficialClient: false,
      followUpDate: daysFromNow(7),
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
          date: daysFromNow(7),
          time: '15:00',
          meetingLink: 'https://meet.example.com/rodriguez-wellness-discovery',
          label: 'Discovery call',
          description:
            'Introductory discovery session for the brand identity package. Discuss target audience, brand personality, deliverables (logo + social templates), and timeline. Please prepare inspiration references, competitor examples, and any existing brand assets.',
        },
      ],
      isSampleClient: true,
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
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Paid',
      serviceTier: 'Studio',
      isOfficialClient: true,
      officialClientSince: now,
      projectStartedAt: now,
      notes: [],
      deadlines: [
        {
          id: generateId(),
          type: 'project',
          date: daysFromNow(10),
          label: 'SEO audit delivery',
          description:
            'Initial local SEO audit and keyword recommendations will be shared for review before on-page optimization begins.',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
    {
      id: generateId(),
      name: 'Lisa Park',
      businessName: 'Park Photography',
      email: 'lisa@parkphoto.com',
      phone: '(415) 555-6666',
      projectType: 'Apartment',
      projectName: '7748 Highland Park Lane, Austin, TX 78745',
      projectStatus: 'Follow-Up Needed',
      contractStatus: 'Signed',
      paymentStatus: 'Overdue',
      serviceTier: 'Launch',
      leaseLengthMonths: 6,
      isOfficialClient: false,
      followUpDate: daysFromNow(4),
      notes: [
        {
          id: generateId(),
          text: 'Payment reminder sent. No response yet.',
          createdAt: now,
          category: 'Payment',
        },
      ],
      deadlines: [
        {
          id: generateId(),
          type: 'payment',
          date: daysFromNow(-45),
          label: 'Rent due — prior month',
          description: 'Monthly rent of $1,850 is past due.',
        },
        {
          id: generateId(),
          type: 'payment',
          date: daysFromNow(-14),
          label: 'Rent due',
          description:
            'Second month of rent is past due. Send the tenant a message from Overdue Rent.',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
  ]
}
