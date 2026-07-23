import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  PlayCircle,
  Users,
  Wallet,
} from 'lucide-react'

export type WelcomeRole = 'landlord' | 'tenant'

export interface WelcomeSlide {
  id: string
  title: string
  description: string
  icon: LucideIcon
  /** Role-selection slide — interactive, no Next until a role is chosen */
  kind?: 'role' | 'feature' | 'tour' | 'demo' | 'ready'
}

export const TENANT_FEATURE_SLIDES: WelcomeSlide[] = [
  {
    id: 'tenant-portal',
    kind: 'feature',
    icon: LayoutDashboard,
    title: 'Your tenant portal',
    description:
      'Sign up by selecting your agency and property, then wait for landlord approval. Your dashboard centers on the next rent due date — with Pay Rent, leases, and updates in one place.',
  },
  {
    id: 'tenant-contracts',
    kind: 'feature',
    icon: FileText,
    title: 'Review and sign lease agreements',
    description:
      'When your landlord sends a lease agreement, open it here, review the terms, and sign electronically.',
  },
  {
    id: 'tenant-payments',
    kind: 'feature',
    icon: Wallet,
    title: 'Pay rent anytime',
    description:
      'Your dashboard shows when rent is next due. Tap Pay Rent — or pay several consecutive months upfront when your lease allows — via PayPal, Stripe, or Square.',
  },
  {
    id: 'tenant-reminders',
    kind: 'feature',
    icon: MessageSquare,
    title: 'Stay on top of rent',
    description:
      'If rent is past due, your landlord may text you a reminder. Reply from your phone, and pay anytime from your portal.',
  },
  {
    id: 'tenant-files',
    kind: 'feature',
    icon: FolderOpen,
    title: 'Share documents',
    description:
      'Upload files and notes for your landlord, and follow lease milestones on the Timeline page. If your landlord imports an existing lease, you may receive an invite link by email or text to join their portal.',
  },
  {
    id: 'tenant-report-issue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Log Repairs or Concerns',
    description:
      'From your dashboard, open Log Repairs to pick a household problem, attach a required photo, optionally add a note, and notify your landlord under Tenant Alerts.',
  },
]

export const LANDLORD_FEATURE_SLIDES: WelcomeSlide[] = [
  {
    id: 'landlord-dashboard',
    kind: 'feature',
    icon: LayoutDashboard,
    title: 'Your landlord workspace',
    description:
      'Manage tenants from sign-up through an active lease — registrations, lease agreements, and deadlines in one place. Track vacant units and renewals under Rentals → Upcoming Openings.',
  },
  {
    id: 'landlord-properties',
    kind: 'feature',
    icon: Building2,
    title: 'Rentals and lease import',
    description:
      'Open Rentals to add addresses with rental type, bedrooms, max tenants, and units — they feed tenant signup, invitations, and Upcoming Openings on the same page. In Company Profile, review your company name and import existing leases: queue files, Scan Files, confirm records, then send invite links by email or text.',
  },
  {
    id: 'landlord-users',
    kind: 'feature',
    icon: Users,
    title: 'Approve new tenants',
    description:
      'Tenants pick your agency and a rental when they register — or join via your Send Invite link. New sign-ups appear under Waiting to Connect on the Dashboard. Accept them into Pending Tenants, draft and send a lease (Lease Status shows Lease Sent), then once they sign they move to Official Tenants.',
  },
  {
    id: 'landlord-openings',
    kind: 'feature',
    icon: CalendarDays,
    title: 'Upcoming openings',
    description:
      'On Rentals → Upcoming Openings, select a vacant unit or ending lease to send a re-sign message to current tenants or generate an invite code for a new tenant at that address.',
  },
  {
    id: 'landlord-overdue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Overdue rent messaging',
    description:
      'See past-due tenants under Payments → Overdue Rent. Send a custom text or pick a template — replies stay on your phone.',
  },
  {
    id: 'landlord-tenant-alerts',
    kind: 'feature',
    icon: Bell,
    title: 'Tenant Alerts',
    description:
      'When a tenant logs a repair or concern with a required photo, it lands in Tenant Alerts in the top navigation so you can assess and dispatch maintenance.',
  },
]

const TOUR_SLIDE: WelcomeSlide = {
  id: 'tour-anytime',
  kind: 'tour',
  icon: Compass,
  title: 'Revisit the tour anytime',
  description:
    'Once you are signed in, press the Tour button in the navigation bar to walk through every page and button again.',
}

const DEMO_SLIDE: WelcomeSlide = {
  id: 'try-demo',
  kind: 'demo',
  icon: PlayCircle,
  title: 'Try the full product demo',
  description:
    'Have an access code or a company demo link from your host? On the homepage, open Quick Access (key icon, top right) and enter a code — or open the invite link they sent. Confirm Start Demo, choose landlord or tenant, then explore that dashboard. Switch roles anytime from the demo controls at the bottom right — nothing you change is saved.',
}

const READY_SLIDE: WelcomeSlide = {
  id: 'ready',
  kind: 'ready',
  icon: CheckCircle2,
  title: 'You are ready to begin',
  description:
    'Create an account to get started, or explore with a host access code or company demo link — changes in the demo are not saved.',
}

export const ROLE_SLIDE: WelcomeSlide = {
  id: 'role',
  kind: 'role',
  icon: Users,
  title: 'Who are you?',
  description: 'Choose how you will use Leased Initiative so we can show you the right features.',
}

export function getWelcomeSlides(role: WelcomeRole | null): WelcomeSlide[] {
  const features =
    role === 'tenant'
      ? TENANT_FEATURE_SLIDES
      : role === 'landlord'
        ? LANDLORD_FEATURE_SLIDES
        : []

  return [
    ROLE_SLIDE,
    ...features,
    ...(role ? [TOUR_SLIDE, DEMO_SLIDE, READY_SLIDE] : []),
  ]
}

export function loginPathForRole(role: WelcomeRole): string {
  return role === 'landlord' ? '/studio/login' : '/login'
}

export function registerPathForRole(role: WelcomeRole): string {
  return role === 'landlord' ? '/studio/register' : '/register'
}

export const WELCOME_CAROUSEL_STORAGE_KEY = 'leased-welcome-carousel-done'

/** Dispatched after Admin Mode clears first-time prefs so open auth screens can re-sync */
export const FIRST_TIME_RESTART_EVENT = 'leased-first-time-restart'

export function clearWelcomeCarouselDone(): void {
  try {
    localStorage.removeItem(WELCOME_CAROUSEL_STORAGE_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

export function notifyFirstTimeRestart(): void {
  window.dispatchEvent(new Event(FIRST_TIME_RESTART_EVENT))
}
