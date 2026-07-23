import { BRAND_NAME } from '@/lib/brand'

export interface TermsSection {
  id: string
  title: string
  paragraphs: string[]
}

/** Effective date shown on the Terms of Service surfaces. */
export const TERMS_EFFECTIVE_DATE = 'July 23, 2026'

/**
 * Product Terms of Service for landlords and tenants using Leased Initiative.
 * Shared by the public modal, `/terms` page, and profile Legal sections.
 */
export const TERMS_OF_SERVICE_SECTIONS: TermsSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    paragraphs: [
      `By accessing or using ${BRAND_NAME} (the “Service”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, do not create an account or use the Service.`,
      'These Terms apply to landlords (studio accounts), tenants (portal accounts), and anyone who explores the public introduction, demo, or onboarding experiences.',
    ],
  },
  {
    id: 'description',
    title: '2. Description of the Service',
    paragraphs: [
      `${BRAND_NAME} provides software tools for residential lease management, including tenant onboarding, lease drafting and sharing, payment scheduling, reminders, property records, and related workflow features.`,
      'The Service is a technology platform. It does not itself create a landlord–tenant relationship, act as a property manager, law firm, or escrow agent, or replace professional legal, tax, or financial advice.',
    ],
  },
  {
    id: 'accounts',
    title: '3. Accounts and Eligibility',
    paragraphs: [
      'You must provide accurate registration information and keep your credentials confidential. You are responsible for activity under your account.',
      'You must be legally able to enter into contracts in your jurisdiction. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.',
    ],
  },
  {
    id: 'usage',
    title: '4. Acceptable Use',
    paragraphs: [
      'You may use the Service only for lawful lease and property-management purposes. You agree not to misuse the platform, including by uploading unlawful content, attempting unauthorized access, interfering with other users, scraping or reverse engineering the Service beyond what the law permits, or using the Service to harass or defraud others.',
      'Landlords are solely responsible for the accuracy of property details, lease terms, rent amounts, notices, and communications they send. Tenants are responsible for the accuracy of information they submit and for complying with their lease obligations outside this platform.',
    ],
  },
  {
    id: 'responsibilities',
    title: '5. User Responsibilities',
    paragraphs: [
      'You retain ownership of content you upload (such as lease templates, property data, and messages). You grant us a limited license to host, process, and display that content solely to operate and improve the Service for you and the parties you invite.',
      'You are responsible for complying with applicable housing, privacy, electronic-signature, and consumer-protection laws in your jurisdiction when you use the Service to prepare or send leases or collect payments.',
      'Payment processing, where available, may be provided by third-party providers (such as Stripe or PayPal). Their terms and fees apply to those transactions in addition to these Terms.',
    ],
  },
  {
    id: 'privacy',
    title: '6. Privacy and Data',
    paragraphs: [
      `We collect and process account, property, lease, and usage information needed to provide ${BRAND_NAME}. We use that information to authenticate users, deliver features you request, send operational notices, secure the Service, and improve product quality.`,
      'We do not sell your personal information. We may share data with service providers who help us host, email, or process payments, and when required by law or to protect rights and safety.',
      'You control who you invite into your workspace. Landlords should only invite tenants and collaborators who have a legitimate need to access lease or property information.',
    ],
  },
  {
    id: 'availability',
    title: '7. Service Availability and Changes',
    paragraphs: [
      'We strive for reliable availability but do not guarantee uninterrupted or error-free operation. Features may change as we improve the product. We may suspend access temporarily for maintenance, security, or legal reasons.',
      'Demo and preview environments are provided for evaluation and may contain sample data that does not reflect a live tenancy.',
    ],
  },
  {
    id: 'disclaimers',
    title: '8. Disclaimers and Limitation of Liability',
    paragraphs: [
      `THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${BRAND_NAME.toUpperCase()} DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
      'Lease documents generated or stored in the Service are tools to support your workflow; you remain responsible for reviewing final agreements and obtaining counsel when needed.',
      'To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or lost-profit damages, or for disputes arising solely between landlords and tenants about rent, habitability, or lease performance.',
    ],
  },
  {
    id: 'termination',
    title: '9. Termination',
    paragraphs: [
      'You may stop using the Service at any time. We may suspend or terminate accounts that violate these Terms, create security risk, or remain inactive for an extended period.',
      'Upon termination, your right to access the Service ends. We may retain limited records as required for legal compliance, dispute resolution, or legitimate business needs, then delete or anonymize data according to our retention practices.',
      'Provisions that by nature should survive (including ownership, disclaimers, limitations of liability, and termination effects) continue after your access ends.',
    ],
  },
  {
    id: 'changes',
    title: '10. Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. When we do, we will revise the effective date and, where appropriate, provide notice in the product or by email. Continued use after changes become effective constitutes acceptance of the updated Terms.',
    ],
  },
  {
    id: 'contact',
    title: '11. Contact',
    paragraphs: [
      `Questions about these Terms may be directed through your account support channels or the contact options published on the ${BRAND_NAME} website.`,
    ],
  },
]
