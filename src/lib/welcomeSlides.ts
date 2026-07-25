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
      'Manage tenants from sign-up through an active lease — registrations, Official Tenants (Active / Upcoming lease status under each name; on mobile, scrollable tiles two-across by default; Edit Columns on larger screens; click a name for Tenant Details), lease agreements with Sent / Signed status and term progress (mobile tiles by default; Tile or Spreadsheet View in Display Settings on larger screens; Edit Columns in Spreadsheet View; cycle Lease Status through Any, Signed, or Sent, plus state, area code, or group), and deadlines in one place. Track vacant units and renewals under Rentals → Upcoming Openings.',
  },
  {
    id: 'landlord-properties',
    kind: 'feature',
    icon: Building2,
    title: 'Rentals and lease import',
    description:
      'Open Rentals to add addresses with rental type, bedrooms, bed sizes per bedroom, and total monthly rent — maximum occupancy is calculated from beds. They feed tenant signup, invitations, Upcoming Openings, and Payments. Tiles show monthly rent, people occupancy, and bed availability (a bed with at least one tenant is taken); color-code by open beds (dark red when more beds are open, green when full). Assign tenants to a bedroom and bed in Tenant Details. On mobile, rentals appear as scrollable tiles (two per row by default; switch to one if you prefer). On larger screens, use Display Settings for Tile or Spreadsheet View (Edit Columns to rearrange, hide, or restore spreadsheet fields) and Filter by State, Town, and Group | Edit Groups (including map radius). In Company Profile, browse Rentals by type and All Renters, then import existing leases: queue files, Scan Files, confirm records, and send invite links by email or text.',
  },
  {
    id: 'landlord-users',
    kind: 'feature',
    icon: Users,
    title: 'Approve new tenants',
    description:
      'Tenants pick your agency and a rental when they register — or join via your Send Invite link. New sign-ups appear under Waiting to Connect on the Dashboard. Accept them into Pending Tenants, or use Add Tenant to enter name, email, property, and January/August lease dates and generate a lease agreement. Lease Status shows Lease Sent once you send it; after they sign they move to Official Tenants. Click any official tenant’s name for Tenant Details — lease, household, and payment history.',
  },
  {
    id: 'landlord-openings',
    kind: 'feature',
    icon: CalendarDays,
    title: 'Upcoming openings',
    description:
      'On Rentals → Upcoming Openings, each row offers Send Re-sign Message for current tenants or Generate Invite Code for a new tenant at that address.',
  },
  {
    id: 'landlord-overdue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Overdue rent messaging',
    description:
      'On Payments, each tile shows unit rent, the tenant’s monthly share (equal split for roommates, or a custom amount), paid vs remaining balance, next due date, and status. Use Display Settings → Overdue Rent to focus past-due tiles. Send a custom text or pick a template — replies stay on your phone. Filter by Paid Early or Payment Method (Stripe, PayPal, Square) the same way.',
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
    'Once you are signed in, use the Tour button in the top toolbar to walk through the dashboard, rentals, lease agreements, payments, tenant alerts, and Settings (company profile, lease import, business info, automation, lease defaults, and app style). Jump to any section from the bar at the top of the tour. Use Bug Report beside Settings to flag unexpected behavior to Aspen Creative Solutions.',
}

const DEMO_SLIDE: WelcomeSlide = {
  id: 'try-demo',
  kind: 'demo',
  icon: PlayCircle,
  title: 'Try the full product demo',
  description:
    'Have an access code or a company demo link from your host? On the homepage, open Quick Access (key icon, top right) and enter a code — or open the invite link they sent. Confirm Start Demo, then choose landlord or a specific tenant scenario. Switch POV anytime from the bottom-right controls to try another mock user or return to the landlord — nothing you change is saved.',
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
