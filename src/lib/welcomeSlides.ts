import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
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
      'Open an invite link or code from your landlord to confirm your rental on a pre-filled form. Or Start Application in your portal: choose a landlord company, pick an available address (see furnished status, total rent, cost at full occupancy, and whether utilities are included), optionally choose student or standard renter, choose Solo or Couple (couples list the other person’s contact — only you are the official tenant), choose Entire Home or Open to Roommates — if open to roommates, say whether you have friends in mind, enter their phones, then Send to Group Chat or Send Solo. For furnished homes open the Furnished tag to pick an available bed or room. A solo applicant on a single queen bed shows as 1 of 1 occupancy. After approval and lease signing, your dashboard shows the project timeline, rent due dates, Pay Rent, leases, deposit invoices, and a Property details panel with housemates, payment statuses, and — when a bedroom is open — Extra Bedroom Available to text a registration invite that lowers your rent share.',
  },
  {
    id: 'tenant-contracts',
    kind: 'feature',
    icon: FileText,
    title: 'Review and sign lease agreements',
    description:
      'When your landlord accepts you and sends a lease agreement, open it here, review the terms, and sign by drawing your signature with a mouse or touchscreen. Your drawn signature is saved with your name to complete the agreement. After you sign, both you and your landlord are notified, and your deposit invoice appears automatically with a PayPal, Stripe, Square, or Zelle payment link.',
  },
  {
    id: 'tenant-payments',
    kind: 'feature',
    icon: Wallet,
    title: 'Pay rent anytime',
    description:
      'Your dashboard shows when rent is next due. Tap Pay Rent — or pay several consecutive months upfront when your lease allows — via PayPal, Stripe, Square, or Zelle. For Zelle, follow the portal pay steps in your bank app, then mark the payment as sent so your landlord can confirm.',
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
  {
    id: 'tenant-condition-report',
    kind: 'feature',
    icon: ClipboardCheck,
    title: 'Condition Report',
    description:
      'Complete a move-in inspection checklist within the landlord’s timeframe after lease start, and again before move-out — rate windows, blinds, utilities, and more, add notes or photos for issues, and submit electronically so both of you have a clear record of the property’s condition.',
  },
]

export const LANDLORD_FEATURE_SLIDES: WelcomeSlide[] = [
  {
    id: 'landlord-dashboard',
    kind: 'feature',
    icon: LayoutDashboard,
    title: 'Your landlord workspace',
    description:
      'Manage tenants from sign-up through an active lease — registrations, Official Tenants (check or clock beside each name — tap for Active or Upcoming; Lease Status shows duration and dates on one line; Payment Status shows Deposit Paid with the payment method logo (Stripe, PayPal, Square, or Zelle) and other statuses in full — no hover needed; an Overdue tag opens Payments overdue for that tenant; Confirm Payment Complete in the row when awaiting deposit; on mobile, scrollable tiles two-across by default with Waiting to Connect / Pending Clients jump buttons beside the title; on larger screens, Spreadsheet View by default in Display Settings — switch to Tile View with a boxed Tenant tile size slider to the right of Show Arrangements, Edit Columns in Spreadsheet View, Show Arrangements for an Arrangement column beside Tenant — Sole Tenant or Co-Tenant as the title, with Entire Home or roommate count below (and * Open to Roommates when that preference applies) (expand bedroom count for numbered rooms with occupants or Vacant, green/red rent status dots, and clickable names to Tenant Details), or Filter by Lease Progress (including Finished), Tenant Type, and Building Type (cycle Any → Apartment → Single-Family Home → Townhouse → Duplex, with Reset Filters beside each control); when a lease ends, a red Lease Complete tag appears under the tenant name — hover for Request Key Return to notify the tenant to return keys within your grace period or face the fine; Remove Tenant — Archive to Past Tenants in Company Profile & Preferences (labeled Archived) or Delete; click a name for Tenant Details with processor logos and a clickable Overdue status), lease agreements with Sent / Signed status and term progress (mobile tiles by default; Tile or Spreadsheet View in Display Settings on larger screens with a Lease tile size slider in Tile View; Edit Columns in Spreadsheet View; cycle Lease Status through Any, Signed, or Sent; cycle Lease Progress through Any, Not Started, Ongoing, Ending Soon, or Finished; filter by State like Rentals, plus area code or group), and deadlines in one place. Track vacant units and renewals under Rentals → Upcoming Openings.',
  },
  {
    id: 'landlord-properties',
    kind: 'feature',
    icon: Building2,
    title: 'Rentals and lease import',
    description:
      'Open Rentals to add addresses — first choose Student Housing or Standard Rental, then furnished or not, then pricing by room or person (and by bed when furnished), optional deposit, whether utilities are included, whether the unit is entire-home only or allows rooms/roommates, bedrooms with single/shared room privacy, bed sizes, and total monthly rent (cost at full occupancy is calculated from max occupancy). Maximum occupancy is calculated from beds; a Queen can sleep two only for a couple registration — a solo claim fills that bed (1 of 1). Tiles show a Student Housing / Standard Rental tag in the top-right, rental type with a Furnished / Unfurnished tag, monthly rent, bed availability, and an occupancy box (people count); hover for “Click to see occupants,” expand the list, and open Tenant Details from a name. Color-code by open beds (dark red when more beds are open, green when full). Use Take Off Market beside Open to gray out a unit — optional reason appears on the overlay — while it stays in the list; View Off-Market Rentals (next to Map) filters to those grayed tiles. Off-market rentals stay in your portfolio but are closed to new applications. Assign tenants to a bedroom and bed in Tenant Details. On mobile, rentals appear as scrollable tiles (two per row by default; switch to one if you prefer). On larger screens, use Display Settings for Tile or Spreadsheet View (boxed Rental tile size slider in Tile View; Edit Columns to rearrange, hide, or restore spreadsheet fields) and Filter by State and Town (counts above each control, default Any) and Group | Edit Groups (including map radius) — each with Reset Filters. Use Map beside Add Rental for a U.S.-wide portfolio view, then Define Group by clicking pins or setting a radius; in Spreadsheet View, Sort By: Distance From lives in the Address column — Student Housing / Standard Rental tags sit under rental type without a new column. In Company Profile & Preferences, set automatic key return notifications, edit grace-period lease wording, Require Tenant Photo (clause preview included), and Require Condition Report (move-in / move-out inspection with due windows — override per rental when editing a property); browse Rentals by type and All Renters (including Past Tenants for archived leases), then import existing leases: queue files, Scan Files — editable drafts include your key return wording and tenant photo clause — select one or more proposed tenants, and Add to Official Tenants — you land on Official Tenants with those rows highlighted (use Highlight last import anytime to spot them again). Or Confirm to Pending and send invite links by email or text.',
  },
  {
    id: 'landlord-users',
    kind: 'feature',
    icon: Users,
    title: 'Approve new tenants',
    description:
      'Tenants find you by agency name when Public Discovery is on, or join with a one-time invite link/code when you set Invite-Only in Help and Settings → Business Information. Use Send Invite Link to pick a property, future lease start, duration, optional Student Housing / Standard Rental type, and custom code — the link is texted to their phone. They confirm details (or Start Application in their portal — including optional student/standard renter category and Solo or Couple) and appear under Waiting to Connect — including occupancy preference tags, Solo/Couple tags, Student/Standard renter tags, and how many friends they invited to share. Accept & Draft Lease moves them to Pending Tenants with Lease Drafted status and opens Lease Agreement Preview — Download the draft, Upload Replacement for a signed or custom lease (creates an editable copy that includes your key return wording and tenant photo clause from Preferences), then Send from the preview banner when ready (optional: turn on Auto-send in the Pending Tenants header). From Pending Tenants, Replace Template opens Help and Settings → Lease Defaults → Lease Agreement Templates — upload a PDF or DOC, View sample with a pending tenant, Confirm as default, then Apply to all pending tenants or Apply to all official tenants while keeping rent, personal info, and signatures — no re-sign required. After they sign they move to Official Tenants as Awaiting Deposit (deposit invoice auto-sent with a payment link); Confirm Payment Complete moves them to Upcoming until the lease starts. Click any official tenant’s name for Tenant Details — lease, household, and payment history.',
  },
  {
    id: 'landlord-openings',
    kind: 'feature',
    icon: CalendarDays,
    title: 'Upcoming openings',
    description:
      'On Rentals → Upcoming Openings, each row offers Send Re-sign Message for current tenants or Generate Invite Code for a new tenant at that address. Official tenants can also text a registration invite from their portal Property details panel when a bedroom is vacant — filling rooms and lowering each person’s rent share until the current lease ends.',
  },
  {
    id: 'landlord-overdue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Overdue rent messaging',
    description:
      'On Payments, each tile shows unit rent, the tenant’s monthly share (equal split for roommates, or a custom amount), paid vs remaining balance, next due date, and status. Use Display Settings for Tile or Spreadsheet View (boxed Payment tile size slider in Tile View on larger screens; two tiles per row by default on mobile; Edit Columns in Spreadsheet View), then open Filter to cycle Payment Status (Any, Paid Rent, Overdue Rent, Paid Early, On Time) and Payment Method (Any, Stripe, PayPal, Square, Zelle) — each with Reset Filters. Send Message to Tenant opens a compact composer panel under the payment summary — pick a template or write your own; replies stay on your phone. Connect your Zelle email or phone in Company Profile & Preferences → Receive Zelle so tenants who prefer Zelle can pay from guided portal instructions; confirm when funds arrive.',
  },
  {
    id: 'landlord-tenant-alerts',
    kind: 'feature',
    icon: Bell,
    title: 'Tenant Alerts',
    description:
      'When a tenant submits a maintenance request with a required photo, or a move-in / move-out condition report, it lands in Tenant Alerts (top navigation on desktop, or Menu on mobile) so you can assess repairs and approve or request changes on inspection checklists before finalizing.',
  },
  {
    id: 'landlord-condition-report',
    kind: 'feature',
    icon: ClipboardCheck,
    title: 'Condition reports',
    description:
      'In Company Profile & Preferences, choose whether move-in / move-out inspection checklists are required or optional, and set due windows (days after move-in / before move-out). Override per rental when editing a property. Tenants submit electronically; you review under Tenant Alerts so problems are reported early and both parties share a clear record.',
  },
]

const LANDLORD_TOUR_SLIDE: WelcomeSlide = {
  id: 'tour-anytime',
  kind: 'tour',
  icon: Compass,
  title: 'Revisit the tour anytime',
  description:
    'Once you are signed in, open Menu in the top bar for Company Profile & Preferences, Take the tour, Help and Settings (Business Information, Client Automation, Lease Defaults, and App Style), Bug Report, and Sign out. The tour starts on important preferences (automatic key return notifications, required tenant photos, and move-in / move-out condition reports), then walks through the dashboard, rentals, lease agreements, payments, tenant alerts, company profile, lease import, and Help and Settings — including seasonal lease options, custom lease eras, and app style. Jump to any section from the bar at the top of the tour. Use Bug Report under Menu to flag unexpected behavior to Aspen Creative Solutions.',
 }

const TENANT_TOUR_SLIDE: WelcomeSlide = {
  id: 'tour-anytime',
  kind: 'tour',
  icon: Compass,
  title: 'Revisit the tour anytime',
  description:
    'Once you are signed in, open Menu for Take the tour, Choose Style, My profile, and Sign out. The tour walks through your tenant portal — starting an application or invite, reviewing and signing leases, paying rent and deposits, sharing files, completing condition reports, requesting maintenance, and following your timeline. Restart anytime from Menu → Take the tour.',
}

const DEMO_SLIDE: WelcomeSlide = {
  id: 'try-demo',
  kind: 'demo',
  icon: PlayCircle,
  title: 'Try the full product demo',
  description:
    'Have an access code or a company demo link from your host? On the homepage, open Quick Access (key icon, top right) and enter a code — optionally add your first name to personalize mock messages — or open the invite link they sent. Confirm Start Demo, then choose landlord or a specific tenant scenario. In tenant mode, Switch POV offers Exit Demo, Switch to Landlord, or Switch to Different Tenant (skips the role screen). After a tenant application (try Ava Mitchell), an “Application Submitted—Switch to Landlord POV” tip appears, then collapses — Switch to Landlord opens Waiting to Connect directly. Nothing you change is saved.',
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
