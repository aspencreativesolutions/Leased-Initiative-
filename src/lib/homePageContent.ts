/**
 * Homepage marketing content for Leased Initiative.
 *
 * This module is intentionally flexible: Cursor (or a human) can gather more
 * product detail from welcome slides, onboarding steps, and routes, then fold
 * it into `gatherHomePageContent()` without rewriting the page layout.
 *
 * Extension points
 * ────────────────
 * - `HOME_PURPOSE` / `HOME_TAGLINE` — hero copy
 * - `HOME_ACTION_TILES` — centered feature grid tiles (title + hover description)
 * - `gatherHomePageContent()` — merge point for any future dynamic sources
 */
import type { LucideIcon } from 'lucide-react'
import { Building2, KeyRound, Shield } from 'lucide-react'
import { BRAND_NAME } from '@/lib/brand'

/** Feature-tile icon artwork under `public/images/TILEICONS/` (1–9, tile order). */
export const HOME_TILE_ICON_SRC = {
  verifyAcceptTenants: '/images/TILEICONS/1.png',
  draftFinalizeLeases: '/images/TILEICONS/2.png',
  shareLeaseDashboard: '/images/TILEICONS/3.png',
  schedulePayments: '/images/TILEICONS/4.png',
  rentReminderNotifications: '/images/TILEICONS/5.png',
  logRepairsConcerns: '/images/TILEICONS/6.png',
  importPropertyRecords: '/images/TILEICONS/7.png',
  trackRentalsAvailability: '/images/TILEICONS/8.png',
  inviteConnectTenants: '/images/TILEICONS/9.png',
} as const

export interface HomeFeatureHighlight {
  id: string
  title: string
  description: string
  /** Public path to the tile’s primary icon artwork (PNG). */
  iconSrc: string
  /** Where this capability lives in the product */
  surfaces?: string[]
}

export interface HomePageContent {
  brand: string
  tagline: string
  purpose: string
  audienceLine: string
  features: HomeFeatureHighlight[]
  demoBlurb: string
  flows: {
    id: string
    title: string
    description: string
    icon: LucideIcon
  }[]
}

/** Short hero lines — keep welcoming and plain. */
export const HOME_BRAND = BRAND_NAME
export const HOME_TAGLINE = 'Landlord and tenant management.'
export const HOME_PURPOSE =
  'Run the full lease lifecycle — from sign-up and approvals to signed leases, rent, and maintenance.'

export const HOME_AUDIENCE_LINE =
  'Built for landlords who manage properties and tenants who need a clear portal for leases, rent, and updates.'

/**
 * Core action tiles on the homepage feature grid (3×3).
 * Icon stays as a subtle animated backdrop; description lifts forward on hover / focus / tap.
 */
export const HOME_ACTION_TILES: HomeFeatureHighlight[] = [
  {
    id: 'verify-accept-tenants',
    title: 'Verify and Accept Tenants',
    description:
      'Review sign-ups, verify applicants, and accept tenants into an active lease.',
    iconSrc: HOME_TILE_ICON_SRC.verifyAcceptTenants,
    surfaces: ['/studio', '/studio/profile'],
  },
  {
    id: 'draft-finalize-leases',
    title: 'Draft and Finalize Lease Agreements',
    description:
      'Build lease terms, generate documents, and finalize agreements for tenants.',
    iconSrc: HOME_TILE_ICON_SRC.draftFinalizeLeases,
    surfaces: ['/studio/contracts'],
  },
  {
    id: 'share-lease-dashboard',
    title: 'Unified Tenant Dashboard',
    description:
      'Track applicants and official tenants, lease status, and rent in one view.',
    iconSrc: HOME_TILE_ICON_SRC.shareLeaseDashboard,
    surfaces: ['/studio/contracts', '/portal'],
  },
  {
    id: 'schedule-payments',
    title: 'Schedule Payments',
    description:
      'Track due dates, overdue rent, paid early, and payment methods in one Payments view.',
    iconSrc: HOME_TILE_ICON_SRC.schedulePayments,
    surfaces: ['/studio/payments'],
  },
  {
    id: 'rent-reminder-notifications',
    title: 'Smart Tenant Messaging',
    description:
      'Filter Overdue Rent on Payments, then send one-time messages — replies stay on your phone.',
    iconSrc: HOME_TILE_ICON_SRC.rentReminderNotifications,
    surfaces: ['/studio/payments'],
  },
  {
    id: 'report-household-issues',
    title: 'Log Repairs or Concerns',
    description:
      'Tenants submit repairs or concerns with a photo; landlords review in Alerts.',
    iconSrc: HOME_TILE_ICON_SRC.logRepairsConcerns,
    surfaces: ['/portal/report', '/studio/alerts'],
  },
  {
    id: 'import-property-records',
    title: 'Import Property Records',
    description:
      'Upload leases, extract rental and tenant details, then review and confirm.',
    iconSrc: HOME_TILE_ICON_SRC.importPropertyRecords,
    surfaces: ['/studio/profile'],
  },
  {
    id: 'track-rentals-availability',
    title: 'Track Rentals and Availability',
    description:
      'Organize rentals, monitor occupancy, and track units becoming available.',
    iconSrc: HOME_TILE_ICON_SRC.trackRentalsAvailability,
    surfaces: ['/studio/properties'],
  },
  {
    id: 'invite-connect-tenants',
    title: 'Invite and Connect Tenants',
    description:
      'Generate invitation links that connect applicants to your company and rentals.',
    iconSrc: HOME_TILE_ICON_SRC.inviteConnectTenants,
    surfaces: ['/studio', '/studio/properties'],
  },
]

/**
 * Gather homepage content from product surfaces.
 * Add new collectors here when you want Cursor to pull in more structure
 * (onboarding steps, nav labels, demo accounts, etc.).
 */
export function gatherHomePageContent(): HomePageContent {
  return {
    brand: HOME_BRAND,
    tagline: HOME_TAGLINE,
    purpose: HOME_PURPOSE,
    audienceLine: HOME_AUDIENCE_LINE,
    features: HOME_ACTION_TILES,
    demoBlurb:
      'Open Quick Access (key icon, top right) and enter a host access code, or use a company demo link your host sent. Confirm Start Demo when prompted, then choose landlord or a specific tenant scenario (address, lease dates, payment status, and more). Switch POV anytime from the bottom-right controls to try another mock user or return to the landlord. Changes are not saved.',
    flows: [
      {
        id: 'landlord',
        title: 'Landlord',
        description: 'Approve tenants, send leases, track rent, and handle alerts.',
        icon: Building2,
      },
      {
        id: 'tenant',
        title: 'Tenant',
        description: 'Sign leases, pay rent, share files, and report issues.',
        icon: KeyRound,
      },
      {
        id: 'demo',
        title: 'Demo mode',
        description: 'Use a demo code or company invite link to tour sample accounts without creating one.',
        icon: Shield,
      },
    ],
  }
}
