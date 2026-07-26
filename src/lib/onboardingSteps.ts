/** Key landlord areas shown in the in-tour section jump bar */
export type AdminTourSectionId =
  | 'dashboard'
  | 'rentals'
  | 'contracts'
  | 'payments'
  | 'alerts'
  | 'settings'

export const ADMIN_TOUR_SECTIONS: { id: AdminTourSectionId; label: string }[] = [
  { id: 'dashboard', label: 'Tenants and Waiting' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'contracts', label: 'Lease Agreements' },
  { id: 'payments', label: 'Payments' },
  { id: 'alerts', label: 'Tenant Alerts' },
  { id: 'settings', label: 'Settings' },
]

export interface OnboardingStep {
  id: string
  target: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Optional route to navigate before showing this step */
  route?: string
  /** Landlord tour section — used for top jump navigation */
  section?: AdminTourSectionId
  /** Centered wrap-up card — no spotlight; ends the tour when continued */
  completion?: boolean
  when?: (ctx: OnboardingContext) => boolean
}

export interface OnboardingContext {
  linked?: boolean
  projectStarted?: boolean
  hasContracts?: boolean
  hasInvoice?: boolean
}

/**
 * Tenant tour — walks the real portal features (application → lease → pay →
 * files → maintenance → timeline → menu). Linked-only UI is gated; everything
 * else stays available so unconnected demos still get a full feature tour.
 */
export const CLIENT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="portal-nav"]',
    title: 'Your tenant portal',
    description:
      'This is your home for applications, leases, rent, documents, and maintenance. Use Dashboard and Timeline in the top bar (or Menu on phones) to move around.',
    placement: 'bottom',
    route: '/portal',
  },
  {
    id: 'application',
    target: '[data-onboarding="portal-application"]',
    title: 'Start your application',
    description:
      'Choose a landlord company, pick an available address (furnished status, total rent, full-occupancy cost, and utilities), set entire-home or roommate preference, then Send. Or enter an invite code your landlord texted you.',
    placement: 'bottom',
    route: '/portal',
    when: (ctx) => ctx.linked !== true,
  },
  {
    id: 'dashboard-overview',
    target: '[data-onboarding="portal-dashboard-overview"]',
    title: 'Your lease dashboard',
    description:
      'After you’re connected, your dashboard opens with a greeting, rent due dates, and Pay Rent — including paying several months ahead when your lease allows.',
    placement: 'bottom',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'contracts',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Review and sign leases',
    description:
      'When your landlord accepts you and sends a lease, open it here, review the terms, and sign with your finger or mouse. After you sign, you and your landlord are notified and your deposit invoice appears.',
    placement: 'top',
    route: '/portal',
  },
  {
    id: 'pay-rent',
    target:
      '[data-onboarding="portal-pay-rent"], [data-onboarding="portal-payment-schedule"], [data-onboarding="portal-dashboard-overview"]',
    title: 'Pay rent anytime',
    description:
      'See what’s next due on your schedule, then tap Pay Rent — PayPal, Stripe, or Square. If rent is past due, your landlord may text a reminder; reply from your phone and pay here anytime.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'payment',
    target: '[data-onboarding="portal-invoice"]',
    title: 'Pay your deposit',
    description:
      'Your deposit invoice and payment link show up here after you sign. Pay from the link, then your landlord can confirm and move you toward move-in.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true && ctx.hasInvoice === true,
  },
  {
    id: 'files',
    target: '[data-onboarding="portal-files"]',
    title: 'Share documents',
    description:
      'Upload files and short notes for your landlord once the project is active. Shared Files stays on your dashboard so lease paperwork stays in one place.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'report-problem',
    target: '[data-onboarding="portal-report-problem"]',
    title: 'Request Maintenance',
    description:
      'Pick a household problem, attach a required photo, optionally add a note, and send. Your landlord sees it under Tenant Alerts so they can dispatch help.',
    placement: 'bottom',
    route: '/portal/report',
  },
  {
    id: 'timeline',
    target: '[data-onboarding="portal-timeline-page"]',
    title: 'Follow your timeline',
    description:
      'Track what’s done and what’s next on your lease — the same milestones also appear on your dashboard once you’re connected.',
    placement: 'bottom',
    route: '/portal/timeline',
  },
  {
    id: 'menu',
    target:
      '[data-onboarding="portal-mobile-menu"], [data-onboarding="portal-desktop-menu"]',
    title: 'Menu, profile, and style',
    description:
      'Open Menu for Dashboard, Timeline, Choose Style, My profile, Take the tour, and Sign out. Alerts also show on your dashboard and by email when something needs attention.',
    placement: 'bottom',
    route: '/portal',
  },
  {
    id: 'complete',
    target: '[data-onboarding="portal-nav"]',
    title: 'You’re ready',
    description:
      'Apply or join with an invite, sign your lease, pay deposit and rent, share files, request maintenance, and follow your timeline — all from this portal. Restart anytime from Menu → Take the tour.',
    placement: 'bottom',
    route: '/portal',
    completion: true,
  },
]

export const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="admin-dashboard"]',
    title: 'Welcome to Leased Initiative',
    description:
      'Tenants and Waiting is your home for managing tenants from sign-up through an active lease. This quick tour highlights each key area — use the section bar at the top to jump ahead anytime.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="tenants-waiting-connect"]',
    title: 'Waiting to Connect',
    description:
      'This section shows people who claimed an invite or registered but are not yet connected. Review their property, requested lease start, and any friends they invited to share, then Accept & Draft Lease to generate a draft (not sent yet) — or dismiss them.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'pending-tenants',
    target: '[data-onboarding="dashboard-pending-tenants-list"]',
    title: 'Pending Tenants',
    description:
      'After you accept someone from Waiting to Connect — or add a tenant yourself — they appear here until their lease is signed. Status starts as Lease Drafted and Lease Agreement Preview opens so you can Download the draft, Upload Replacement (signed or custom), then Send from the preview banner when ready. Automatic sending is optional via the Automatically send drafted leases toggle. After the tenant signs electronically they move to Official Tenants as Awaiting Deposit (deposit invoice is auto-sent); Confirm Payment Complete moves them to Upcoming until the lease start date.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-official-tenants"]',
    title: 'Official Tenants',
    description:
      'Tenants with signed leases that are active or starting soon appear here. Click a name to open Tenant Details — rental, lease, household, and payment history. After signing they show Awaiting Deposit under each name (hover for Confirm Payment, or use Confirm Payment Complete in the row); once you confirm, status becomes Upcoming until the lease starts, then Active. Payment tags (On Time / Overdue / Deposit Paid / Awaiting Deposit) stay right-aligned. On mobile they appear as scrollable tiles (two per row by default). On larger screens, Spreadsheet View opens by default in Display Settings — switch to Tile View to use the Tenant tile size slider, Edit Columns in Spreadsheet View to rearrange fields, or turn on Show Occupancy Status for optional tags under each name.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'properties',
    target: '[data-onboarding="admin-properties"]',
    title: 'Rentals',
    description:
      'Your rental portfolio lives here. Add addresses by choosing furnished or not, pricing by room/person (or by bed when furnished), optional deposit, whether utilities are included, entire-home-only when needed, bedrooms with private/shared privacy, and bed sizes (occupancy is calculated from beds); total rent, cost at full occupancy, utilities, deposit, and max occupancy are stored for applications. Each tile has an occupancy box (people count) you can expand to see occupants and open Tenant Details; edit any rental with the pencil icon. On mobile, rentals are scrollable tiles (two per row by default). On larger screens, switch Tile or Spreadsheet View in Display Settings (use the Rental tile size slider in Tile View, and Edit Columns to rearrange, hide, or restore spreadsheet fields). Filter by State, Town, and Group to find openings quickly.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'upcoming-openings',
    target: '[data-onboarding="admin-upcoming-openings"]',
    title: 'Upcoming Openings',
    description:
      'Vacant units and leases ending soon appear here. From each row you can Send Re-sign Message to current tenants or Generate Invite Code for a new tenant at that address.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'contracts',
    target: '[data-onboarding="admin-contracts"]',
    title: 'Lease Agreements',
    description:
      'Draft, send, and track every lease agreement. Tiles show Sent or Signed status and progress through the term. On mobile, leases appear as scrollable tiles (two per row by default). On larger screens, use Display Settings for Tile or Spreadsheet View (Lease tile size slider in Tile View; Edit Columns to rearrange, hide, or restore fields), and filters for Lease Status, Lease Progress (Not Started / Ongoing / Ending Soon), State, area code, or group.',
    placement: 'bottom',
    route: '/studio/contracts',
    section: 'contracts',
  },
  {
    id: 'payments',
    target: '[data-onboarding="admin-payments"]',
    title: 'Payments and overdue rent',
    description:
      'Track rent for every tenant — unit rent, share, balance, and due dates. Use the Payment tile size slider in Display Settings to enlarge or shrink tiles. Filter for Overdue Rent, Paid Early, or payment method, then Send Message to Tenant when someone is past due — the message panel opens below the payment summary so replies stay on your phone.',
    placement: 'bottom',
    route: '/studio/payments?status=overdue',
    section: 'payments',
  },
  {
    id: 'tenant-alerts',
    target: '[data-onboarding="admin-tenant-alerts"]',
    title: 'Tenant Alerts',
    description:
      'When a tenant submits a maintenance request with a required photo, it appears here so you can assess the problem and dispatch maintenance.',
    placement: 'bottom',
    route: '/studio/alerts',
    section: 'alerts',
  },
  {
    id: 'notifications',
    target: '[data-tenant-actions]',
    title: 'Tenant shortcuts',
    description:
      'Use Link to text a one-time invite with property, future lease start, duration, and optional custom code. Use Add to create a tenant yourself. On phones, these live in the Waiting to Connect header; on larger screens they stay in the top navigation. New Registers appears in the top bar only when someone is waiting.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'company-details',
    target: '[data-onboarding="admin-company-details"]',
    title: 'Company Profile',
    description:
      'Review your registered company name and browse rental-type or renter counts. Tap a count to explore that group, and filter lists by lease duration when needed.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'lease-upload',
    target: '[data-onboarding="admin-lease-upload"]',
    title: 'Import existing leases',
    description:
      'Queue lease PDFs, images, or spreadsheets, then click Scan Files. Review the records that appear, confirm what looks right, and send invite links by email or text.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'settings-hub',
    target: '[data-onboarding="admin-settings-tabs"]',
    title: 'Settings',
    description:
      'Open Settings anytime from Menu in the top bar. Switch between Business Information, Client Automation, Lease Defaults, and App Style using these tabs.',
    placement: 'bottom',
    route: '/studio/settings',
    section: 'settings',
  },
  {
    id: 'settings-business',
    target: '[data-onboarding="admin-settings-business"]',
    title: 'Business Information',
    description:
      'Company name, contact details, and address used in lease headers and signatures live here. Choose Public Discovery (tenants can find you by name) or Invite-Only (tenants need a connection link or code). Keep these current so generated agreements stay accurate.',
    placement: 'bottom',
    route: '/studio/settings?tab=business',
    section: 'settings',
  },
  {
    id: 'settings-automation',
    target: '[data-onboarding="admin-settings-automation"]',
    title: 'Client Automation',
    description:
      'Turn on reminders, follow-ups, and status updates so overdue rent and lease milestones nudge tenants without you chasing every message.',
    placement: 'bottom',
    route: '/studio/settings?tab=automation',
    section: 'settings',
  },
  {
    id: 'settings-lease',
    target: '[data-onboarding="admin-settings-lease"]',
    title: 'Lease Defaults',
    description:
      'Set seasonal start and end dates, payment terms, revision limits, and contract footers that prefill when you draft a new lease.',
    placement: 'bottom',
    route: '/studio/settings?tab=lease',
    section: 'settings',
  },
  {
    id: 'settings-style',
    target: '[data-onboarding="admin-settings-style"]',
    title: 'App Style',
    description:
      'Pick a visual finish for the landlord studio — previews apply instantly.',
    placement: 'bottom',
    route: '/studio/settings?tab=style',
    section: 'settings',
  },
  {
    id: 'tour-complete',
    target: '[data-onboarding="admin-settings-style"]',
    title: 'Tour complete',
    description:
      "You're ready to manage tenants, rentals, leases, and payments on your own. Restart this walkthrough anytime from Menu → Take the tour.",
    placement: 'bottom',
    route: '/studio/settings?tab=style',
    section: 'settings',
    completion: true,
  },
]

export function filterOnboardingSteps(
  steps: OnboardingStep[],
  ctx: OnboardingContext,
  completedSteps: string[]
) {
  return steps.filter((step) => {
    if (completedSteps.includes(step.id)) return false
    if (step.when && !step.when(ctx)) return false
    return true
  })
}

export function isOnboardingComplete(
  steps: OnboardingStep[],
  completedSteps: string[],
  dismissedAt?: string
) {
  if (dismissedAt) return true
  const required = steps.filter((s) => !s.when)
  return required.every((s) => completedSteps.includes(s.id))
}
