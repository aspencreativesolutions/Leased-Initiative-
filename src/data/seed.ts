import type { BusinessSettings, Client } from '@/types'
import { generateId } from '@/lib/storage'

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
          label: 'Homepage mockup delivery',
        },
        {
          id: generateId(),
          type: 'payment',
          date: daysFromNow(30),
          label: 'Final payment due',
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
      isOfficialClient: false,
      followUpDate: daysFromNow(1),
      notes: [],
      deadlines: [
        {
          id: generateId(),
          type: 'contract',
          date: daysFromNow(5),
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
          label: 'Discovery call',
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
      projectStatus: 'Completed',
      contractStatus: 'Completed',
      paymentStatus: 'Paid',
      isOfficialClient: false,
      notes: [],
      deadlines: [],
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
      paymentStatus: 'Overdue',
      isOfficialClient: false,
      followUpDate: daysFromNow(-2),
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
          date: daysFromNow(-2),
          label: 'Monthly maintenance invoice',
        },
      ],
      isSampleClient: true,
      createdAt: now,
    },
  ]
}
