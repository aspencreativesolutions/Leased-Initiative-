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
      'Open an invite link or code from your landlord to confirm your rental on a pre-filled form. Or Start Application in your portal: choose a landlord company, pick an available address (see furnished status, total rent, cost at full occupancy, and whether utilities are included), choose Renting the entire home or Open to roommates, and for furnished homes open the Furnished tag to pick an available bed or room. After approval and lease signing, your dashboard shows the project timeline, rent due dates, Pay Rent, leases, and deposit invoices.',
  },
  {
    id: 'tenant-contracts',
    kind: 'feature',
    icon: FileText,
    title: 'Review and sign lease agreements',
    description:
      'When your landlord accepts you and sends a lease agreement, open it here, review the terms, and sign by drawing your signature with a mouse or touchscreen. Your drawn signature is saved with your name to complete the agreement. After you sign, both you and your landlord are notified, and your deposit invoice appears automatically with a PayPal, Stripe, or Square payment link.',
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
      'Upload files and notes for your landlord, and follow lease milestones on the project timeline built into your dashboard (also available on the Timeline page). If your landlord imports an existing lease, you may receive an invite link by email or text to join their portal.',
  },
  {
    id: 'tenant-report-issue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Request Maintenance',
    description:
      'From your dashboard, open Request Maintenance to pick a household problem, attach a required photo, optionally add a note, and notify your landlord under Tenant Alerts.',
  },
]

export const LANDLORD_FEATURE_SLIDES: WelcomeSlide[] = [
  {
    id: 'landlord-dashboard',
    kind: 'feature',
    icon: LayoutDashboard,
    title: 'Your landlord workspace',
    description:
      'Manage tenants from sign-up through an active lease — registrations, Official Tenants (Awaiting Deposit after signing until you confirm payment, then Upcoming / Active under each name; On Time / Overdue / Deposit Paid / Awaiting Deposit payment tags right-aligned in Spreadsheet View; hover Awaiting Deposit for Confirm Payment, or use Confirm Payment Complete in the row; on mobile, scrollable tiles two-across by default; on larger screens, Spreadsheet View by default in Display Settings — switch to Tile View with a Tenant tile size slider like Lease Agreements, Edit Columns in Spreadsheet View, or Show Occupancy Status for optional tags under each name; click a name for Tenant Details), lease agreements with Sent / Signed status and term progress (mobile tiles by default; Tile or Spreadsheet View in Display Settings on larger screens with a Lease tile size slider in Tile View; Edit Columns in Spreadsheet View; cycle Lease Status through Any, Signed, or Sent; cycle Lease Progress through Any, Not Started, Ongoing, or Ending Soon; filter by State like Rentals, plus area code or group), and deadlines in one place. Track vacant units and renewals under Rentals → Upcoming Openings.',
  },
  {
    id: 'landlord-properties',
    kind: 'feature',
    icon: Building2,
    title: 'Rentals and lease import',
    description:
      'Open Rentals to add addresses — first choose furnished or not, then pricing by room or person (and by bed when furnished), optional deposit, whether utilities are included, whether the home is entire-home only, bedrooms with private/shared privacy, bed sizes, and total monthly rent (cost at full occupancy is calculated from max occupancy). Maximum occupancy is calculated from beds; total rent, utilities, deposit, and occupancy are stored for tenant applications. They feed tenant signup, invitations, Upcoming Openings, and Payments. Tiles show monthly rent, bed availability, and an occupancy box (people count); hover for “Click to see occupants,” expand the list, and open Tenant Details from a name. Color-code by open beds (dark red when more beds are open, green when full). Assign tenants to a bedroom and bed in Tenant Details. On mobile, rentals appear as scrollable tiles (two per row by default; switch to one if you prefer). On larger screens, use Display Settings for Tile or Spreadsheet View (Rental tile size slider in Tile View; Edit Columns to rearrange, hide, or restore spreadsheet fields) and Filter by State, Town, and Group | Edit Groups (including map radius). In Company Profile, browse Rentals by type and All Renters, then import existing leases: queue files, Scan Files, confirm records, and send invite links by email or text.',
  },
  {
    id: 'landlord-users',
    kind: 'feature',
    icon: Users,
    title: 'Approve new tenants',
    description:
      'Tenants find you by agency name when Public Discovery is on, or join with a one-time invite link/code when you set Invite-Only in Settings. Use Send Invite Link to pick a property, future lease start, duration, and custom code — the link is texted to their phone. They confirm details (or Start Application in their portal) and appear under Waiting to Connect — including occupancy preference tags (Renting Entire Home, Open to Roommates, Private Room, Shared Room) and how many friends they invited to share. Accept & Draft Lease moves them to Pending Tenants with Lease Drafted status and opens Lease Agreement Preview — Download the draft, Upload Replacement for a signed or custom lease, then Send from the preview banner when ready (optional: turn on Automatically send drafted leases on each Pending Tenants row). From Pending Tenants, Change Lease Style opens Settings → Lease Agreement Templates — upload a PDF or DOC, View sample with a pending tenant, Confirm as default, then Apply to All (or select leases) to restyle pending agreements while keeping rent, personal info, and signatures — no re-sign required. After they sign they move to Official Tenants as Awaiting Deposit (deposit invoice auto-sent with a payment link); Confirm Payment Complete moves them to Upcoming until the lease starts. Click any official tenant’s name for Tenant Details — lease, household, and payment history.',
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
      'On Payments, each tile shows unit rent, the tenant’s monthly share (equal split for roommates, or a custom amount), paid vs remaining balance, next due date, and status. Use Display Settings to resize payment tiles, or filter → Overdue Rent to focus past-due tiles. Send Message to Tenant opens a compact composer panel under the payment summary — pick a template or write your own; replies stay on your phone. Filter by Paid Early or Payment Method (Stripe, PayPal, Square) the same way.',
  },
  {
    id: 'landlord-tenant-alerts',
    kind: 'feature',
    icon: Bell,
    title: 'Tenant Alerts',
    description:
      'When a tenant submits a maintenance request with a required photo, it lands in Tenant Alerts (top navigation on desktop, or Menu on mobile) so you can assess and dispatch maintenance.',
  },
]

const LANDLORD_TOUR_SLIDE: WelcomeSlide = {
  id: 'tour-anytime',
  kind: 'tour',
  icon: Compass,
  title: 'Revisit the tour anytime',
  description:
    'Once you are signed in, open Menu in the top bar for Company Profile, Take the tour, Settings, Bug Report, and Sign out. The tour walks through the dashboard, rentals, lease agreements, payments, tenant alerts, and Settings (company profile, lease import, business info, automation, lease defaults with seasonal options and custom lease eras, and app style). Jump to any section from the bar at the top of the tour. Use Bug Report under Menu to flag unexpected behavior to Aspen Creative Solutions.',
 }

const TENANT_TOUR_SLIDE: WelcomeSlide = {
  id: 'tour-anytime',
  kind: 'tour',
  icon: Compass,
  title: 'Revisit the tour anytime',
  description:
    'Once you are signed in, open Menu for Take the tour, Choose Style, My profile, and Sign out. The tour walks through your tenant portal — starting an application or invite, reviewing and signing leases, paying rent and deposits, sharing files, requesting maintenance, and following your timeline. Restart anytime from Menu → Take the tour.',
}

const DEMO_SLIDE: WelcomeSlide = {
  id: 'try-demo',
  kind: 'demo',
  icon: PlayCircle,
  title: 'Try the full product demo',
  description:
    'Have an access code or a company demo link from your host? On the homepage, open Quick Access (key icon, top right) and enter a code — optionally add your first name to personalize mock messages — or open the invite link they sent. Confirm Start Demo, then choose landlord or a specific tenant scenario. After a tenant application (try Ava Mitchell), Switch to Landlord POV goes straight to Waiting to Connect — no second role prompt. Switch POV anytime from the bottom-right controls to try another mock user — nothing you change is saved.',
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
  const tourSlide = role === 'tenant' ? TENANT_TOUR_SLIDE : LANDLORD_TOUR_SLIDE

  return [
    ROLE_SLIDE,
    ...features,
    ...(role ? [tourSlide, DEMO_SLIDE, READY_SLIDE] : []),
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
