/** Key landlord areas shown in the in-tour section jump bar */
export type AdminTourSectionId =
  | 'dashboard'
  | 'rentals'
  | 'contracts'
  | 'payments'
  | 'alerts'

export const ADMIN_TOUR_SECTIONS: { id: AdminTourSectionId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'contracts', label: 'Lease Agreements' },
  { id: 'payments', label: 'Payments' },
  { id: 'alerts', label: 'Tenant Alerts' },
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
  when?: (ctx: OnboardingContext) => boolean
}

export interface OnboardingContext {
  linked?: boolean
  projectStarted?: boolean
  hasContracts?: boolean
  hasInvoice?: boolean
}

export const CLIENT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="portal-nav"]',
    title: 'Welcome to your portal',
    description:
      'This is your Leased Initiative tenant dashboard — everything about your lease lives here. Use the areas below to pay rent, review your agreement, share files, and stay on top of updates.',
    placement: 'bottom',
  },
  {
    id: 'registration-waiting',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Waiting for approval',
    description:
      'After you sign up with your agency and property (or via an invite link), your landlord reviews your registration under Waiting to Connect. Once approved, your lease agreement will appear here.',
    placement: 'top',
    when: (ctx) => ctx.linked === false,
  },
  {
    id: 'pay-rent',
    target: '[data-onboarding="portal-pay-rent"]',
    title: 'Pay rent anytime',
    description:
      'See when your next payment is due and tap Pay Rent. If your lease allows, choose consecutive months to pay upfront via PayPal, Stripe, or Square.',
    placement: 'top',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'contracts',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Review and sign your lease agreement',
    description:
      'When your landlord sends your lease agreement, it appears under Lease Agreements. Open it, review the terms, and sign electronically.',
    placement: 'top',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'payment',
    target: '[data-onboarding="portal-invoice"]',
    title: 'Pay your deposit',
    description:
      'After signing, your deposit invoice appears here. Click the payment link to pay securely via PayPal, Stripe, or Square.',
    placement: 'top',
    when: (ctx) => ctx.linked === true && ctx.hasInvoice === true,
  },
  {
    id: 'files',
    target: '[data-onboarding="portal-files"]',
    title: 'Share documents',
    description:
      'Once you are active, upload documents and other files here. Add notes so your landlord knows what you are sending.',
    placement: 'top',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'report-problem',
    target: '[data-onboarding="portal-report-problem"]',
    title: 'Log Repairs or Concerns',
    description:
      'Beside Lease Active on your dashboard, tap Log Repairs. Pick a household problem, upload a required photo, and optionally add a note — your landlord is notified under Tenant Alerts.',
    placement: 'bottom',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'timeline',
    target: '[data-onboarding="portal-timeline-nav"]',
    title: 'Follow your lease timeline',
    description:
      'The Timeline page shows every milestone — approval, lease signing, payment, and more — so you always know what is next.',
    placement: 'bottom',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'notifications',
    target: '[data-onboarding="portal-notifications"]',
    title: 'Stay informed automatically',
    description:
      'Important updates, reminders, and deadline alerts appear here. You will also receive email reminders when deadlines approach. You have finished the tour — press the forward arrow or Enter to close it.',
    placement: 'bottom',
  },
]

export const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="admin-dashboard"]',
    title: 'Welcome to Leased Initiative',
    description:
      'This is your landlord dashboard for managing tenants from sign-up through an active lease. This quick tour highlights each key area — use the section bar at the top to jump ahead anytime.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="tenants-waiting-connect"]',
    title: 'Waiting to Connect',
    description:
      'This section shows prospective tenants who have registered but are not yet connected to a rental. Review their requested properties, confirm availability, and complete the connection process from here.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'pending-tenants',
    target: '[data-onboarding="dashboard-pending-tenants-list"]',
    title: 'Pending Tenants',
    description:
      'After you accept someone from Waiting to Connect — or add a tenant yourself — they appear here until their lease is signed. Draft, review, and send lease agreements from this list.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-official-tenants"]',
    title: 'Official Tenants',
    description:
      'Tenants with signed leases that are active or starting soon appear here. Click a name to open Tenant Details — rental, lease, household, and payment history. Active or Upcoming lease status sits under each name. On mobile they appear as scrollable tiles (two per row by default). On larger screens, use Edit Columns to rearrange, hide, or restore table fields.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'properties',
    target: '[data-onboarding="admin-properties"]',
    title: 'Rentals',
    description:
      'Your rental portfolio lives here. Add addresses with type, bedrooms, and bed sizes (occupancy is calculated from beds); track people and bed availability on each tile; edit any rental with the pencil icon. On mobile, rentals are scrollable tiles (two per row by default). On larger screens, switch Tile or Spreadsheet View in Display Settings (use Edit Columns to rearrange, hide, or restore spreadsheet fields). Filter by State, Town, and Group to find openings quickly.',
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
      'Draft, send, and track every lease agreement. Tiles show Sent or Signed status and progress through the term. On mobile, leases appear as scrollable tiles (two per row by default). On larger screens, use Display Settings for Tile or Spreadsheet View, Edit Columns (rearrange, hide, or restore fields), and filters for lease status, property location, or group.',
    placement: 'bottom',
    route: '/studio/contracts',
    section: 'contracts',
  },
  {
    id: 'payments',
    target: '[data-onboarding="admin-payments"]',
    title: 'Payments and overdue rent',
    description:
      'Track rent for every tenant — unit rent, share, balance, and due dates. Filter for Overdue Rent, Paid Early, or payment method, then Send Message to Tenant when someone is past due (replies stay on your phone).',
    placement: 'bottom',
    route: '/studio/payments?status=overdue',
    section: 'payments',
  },
  {
    id: 'tenant-alerts',
    target: '[data-onboarding="admin-tenant-alerts"]',
    title: 'Tenant Alerts',
    description:
      'When a tenant logs a repair or concern with a required photo, it appears here so you can assess the problem and dispatch maintenance.',
    placement: 'bottom',
    route: '/studio/alerts',
    section: 'alerts',
  },
  {
    id: 'notifications',
    target: '[data-tenant-actions]',
    title: 'Tenant shortcuts',
    description:
      'These compact icons let you Send Invite or Add Tenant without leaving the page. View New Registers appears only when a new sign-up is waiting under Waiting to Connect.',
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
  },
  {
    id: 'lease-upload',
    target: '[data-onboarding="admin-lease-upload"]',
    title: 'Import existing leases',
    description:
      'Queue lease PDFs, images, or spreadsheets, then click Scan Files. Review the records that appear, confirm what looks right, and send invite links by email or text.',
    placement: 'bottom',
    route: '/studio/profile',
  },
  {
    id: 'automation',
    target: '[data-onboarding="admin-settings"]',
    title: 'Tour complete — Settings',
    description:
      'Configure lease calendar defaults, automated reminders, and status updates here. Restart this tour anytime with the Tour button beside Settings. You have finished the tour — press the forward arrow or Enter to close it.',
    placement: 'bottom',
    route: '/studio',
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
