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
  address: '123 Creative Lane, Your City, ST 00000',
  defaultPaymentTerms: '50% deposit due upon signing. Remaining balance due upon project completion.',
  defaultRevisionLimit: '2',
  defaultContractFooter:
    'This agreement constitutes the entire understanding between the parties. Any modifications must be in writing and signed by both parties.',
  profileReminders: defaultProfileReminders,
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function seedClients(): Client[] {
  const now = new Date().toISOString()
  return [
    {
      id: generateId(),
      name: 'Sarah Mitchell',
      businessName: 'Bloom Botanicals',
      email: 'sarah@bloombotanicals.com',
      phone: '(555) 234-5678',
      website: 'https://bloombotanicals.com',
      projectType: 'Website Redesign',
      projectName: 'Bloom Botanicals Redesign',
      projectDescription: 'Full redesign with e-commerce for plant shop.',
      projectStatus: 'In Progress',
      contractStatus: 'Signed',
      paymentStatus: 'Deposit Paid',
      serviceTier: 'Summit',
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
          date: daysFromNow(30),
          label: 'Final payment due',
          description:
            'Remaining project balance is due upon delivery approval. Confirm your PayPal details are ready and review the final invoice before this date.',
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
          date: daysFromNow(1),
          time: '10:30',
          meetingLink: 'https://meet.example.com/chen-architecture-followup',
          label: 'Contract review call',
          description:
            'Walk through the sent contract together — scope, timeline, deposit, and revision terms. Have any questions ready and confirm who will sign on your side.',
        },
        {
          id: generateId(),
          type: 'contract',
          date: daysFromNow(5),
          label: 'Contract signature follow-up',
          description:
            'If the contract is still unsigned, follow up on outstanding questions and confirm whether any edits are needed before signing.',
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
      phone: '(555) 333-4444',
      projectType: 'SEO',
      projectName: 'Local SEO Optimization',
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
      phone: '(555) 555-6666',
      projectType: 'Maintenance',
      projectName: 'Monthly Site Maintenance',
      projectStatus: 'Follow-Up Needed',
      contractStatus: 'Signed',
      paymentStatus: 'Unpaid',
      serviceTier: 'Launch',
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
          date: daysFromNow(12),
          label: 'Monthly maintenance invoice',
          description:
            'Monthly maintenance retainer payment is past due. Send a reminder with the invoice link and confirm whether any site updates are needed once payment is received.',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
  ]
}
