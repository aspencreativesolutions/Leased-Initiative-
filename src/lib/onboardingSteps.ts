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
      'Your home for applications, leases, rent, documents, and maintenance. Use Dashboard and Timeline in the top bar — or Menu on phones — to move around.',
    placement: 'bottom',
    route: '/portal',
  },
  {
    id: 'application',
    target: '[data-onboarding="portal-application"]',
    title: 'Start your application',
    description:
      'Choose a landlord, pick an available address, set entire-home or roommate preference, then Send — or enter an invite code your landlord texted you.',
    placement: 'bottom',
    route: '/portal',
    when: (ctx) => ctx.linked !== true,
  },
  {
    id: 'dashboard-overview',
    target: '[data-onboarding="portal-dashboard-overview"]',
    title: 'Your lease dashboard',
    description:
      'Once connected, see your greeting, rent due dates, and Pay Rent — including paying several months ahead when your lease allows.',
    placement: 'bottom',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'contracts',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Review and sign leases',
    description:
      'When a lease is sent, open it here, review the terms, and sign. After you sign, you’re notified and your deposit invoice appears.',
    placement: 'top',
    route: '/portal',
  },
  {
    id: 'pay-rent',
    target:
      '[data-onboarding="portal-pay-rent"], [data-onboarding="portal-payment-schedule"], [data-onboarding="portal-dashboard-overview"]',
    title: 'Pay rent anytime',
    description:
      'See what’s next due, then tap Pay Rent — PayPal, Stripe, or Square. If rent is past due, your landlord may text a reminder; reply from your phone and pay here anytime.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'payment',
    target: '[data-onboarding="portal-invoice"]',
    title: 'Pay your deposit',
    description:
      'Your deposit invoice and payment link appear here after you sign. Pay from the link so your landlord can confirm and move you toward move-in.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true && ctx.hasInvoice === true,
  },
  {
    id: 'files',
    target: '[data-onboarding="portal-files"]',
    title: 'Share documents',
    description:
      'Upload files and short notes for your landlord. Shared Files stays on your dashboard so lease paperwork stays in one place.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'report-problem',
    target: '[data-onboarding="portal-report-problem"]',
    title: 'Request Maintenance',
    description:
      'Pick a problem, attach a required photo, optionally add a note, and send. Your landlord sees it under Tenant Alerts.',
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
      'Open Menu for Dashboard, Timeline, Choose Style, My profile, Take the tour, and Sign out. Alerts also show on your dashboard and by email.',
    placement: 'bottom',
    route: '/portal',
  },
  {
    id: 'complete',
    target: '[data-onboarding="portal-nav"]',
    title: 'You’re ready',
    description:
      'Apply or join with an invite, sign your lease, pay deposit and rent, share files, request maintenance, and follow your timeline — all from here. Restart anytime from Menu → Take the tour.',
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
      'Tenants and Waiting is your home for managing tenants from sign-up through an active lease. Use the section bar at the top to jump ahead anytime.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="tenants-waiting-connect"]',
    title: 'Waiting to Connect',
    description:
      'People who claimed an invite or registered but aren’t connected yet. Review their property and lease start, then Accept & Draft Lease — or dismiss them.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'pending-tenants',
    target: '[data-onboarding="dashboard-pending-tenants-list"]',
    title: 'Pending Tenants',
    description:
      'Accepted or manually added tenants stay here until their lease is signed. Status starts as Lease Drafted — preview to download, upload a replacement, or send when ready. Use Auto-send in the header, or Change Lease Style to open Templates and apply to pending or official tenants. After e-sign they move to Official Tenants as Awaiting Deposit; confirm payment to mark them Upcoming until the lease starts.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-official-tenants"]',
    title: 'Official Tenants',
    description:
      'Signed leases that are active or starting soon appear here. A check or clock icon sits beside each name. Lease Status shows duration and dates; Payment Status shows Deposit Paid with the payment method (and other statuses in full — no hover needed). Click a name for Tenant Details. Confirm payment to move Awaiting Deposit to Upcoming, then Active when the lease starts.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'properties',
    target: '[data-onboarding="admin-properties"]',
    title: 'Rentals',
    description:
      'Your rental portfolio. Add addresses with furnished status, pricing, beds, deposit, and utilities — occupancy is calculated from beds. Expand a tile to see who’s there or open Tenant Details. On mobile, use scrollable tiles; on larger screens, switch Tile or Spreadsheet View in Display Settings. Filter by State, Town, and Group.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'upcoming-openings',
    target: '[data-onboarding="admin-upcoming-openings"]',
    title: 'Upcoming Openings',
    description:
      'Vacant units and leases ending soon. From each row, Send Re-sign Message to current tenants or Generate Invite Code for a new tenant.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'contracts',
    target: '[data-onboarding="admin-contracts"]',
    title: 'Lease Agreements',
    description:
      'Draft, send, and track every lease. Tiles show Sent or Signed status and progress through the term. After you confirm a new template in Settings, restyle all or selected agreements without clearing signatures. On mobile, use scrollable tiles; on larger screens, switch layouts and filters in Display Settings.',
    placement: 'bottom',
    route: '/studio/contracts',
    section: 'contracts',
  },
  {
    id: 'payments',
    target: '[data-onboarding="admin-payments"]',
    title: 'Payments and overdue rent',
    description:
      'Track rent for every tenant — unit rent, share, balance, and due dates. Filter for Overdue Rent or Paid Early, then Send Message to Tenant when someone is past due. Replies stay on your phone.',
    placement: 'bottom',
    route: '/studio/payments?status=overdue',
    section: 'payments',
  },
  {
    id: 'tenant-alerts',
    target: '[data-onboarding="admin-tenant-alerts"]',
    title: 'Tenant Alerts',
    description:
      'Maintenance requests with photos appear here so you can assess the problem and dispatch help.',
    placement: 'bottom',
    route: '/studio/alerts',
    section: 'alerts',
  },
  {
    id: 'notifications',
    target: '[data-tenant-actions]',
    title: 'Tenant shortcuts',
    description:
      'Use Link to text a one-time invite, or Add to create a tenant yourself. New Registers appears in the top bar only when someone is waiting.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'company-details',
    target: '[data-onboarding="admin-company-details"]',
    title: 'Company Profile',
    description:
      'Review your company name and rental or renter counts. Tap a count to explore that group, and filter by lease duration when needed.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'lease-upload',
    target: '[data-onboarding="admin-lease-upload"]',
    title: 'Import existing leases',
    description:
      'Queue lease PDFs, images, or spreadsheets, then Scan Files. Review the records, confirm what looks right, and send invite links by email or text.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'settings-hub',
    target: '[data-onboarding="admin-settings-tabs"]',
    title: 'Settings',
    description:
      'Open Settings from Menu anytime. Switch between Business Information, Client Automation, Lease Defaults, and App Style with these tabs.',
    placement: 'bottom',
    route: '/studio/settings',
    section: 'settings',
  },
  {
    id: 'settings-business',
    target: '[data-onboarding="admin-settings-business"]',
    title: 'Business Information',
    description:
      'Company name, contact details, and address used in lease headers. Choose Public Discovery or Invite-Only so tenants find you the way you want.',
    placement: 'bottom',
    route: '/studio/settings?tab=business',
    section: 'settings',
  },
  {
    id: 'settings-automation',
    target: '[data-onboarding="admin-settings-automation"]',
    title: 'Client Automation',
    description:
      'Turn on reminders and status updates so overdue rent and lease milestones nudge tenants without you chasing every message.',
    placement: 'bottom',
    route: '/studio/settings?tab=automation',
    section: 'settings',
  },
  {
    id: 'settings-lease',
    target: '[data-onboarding="admin-settings-lease"]',
    title: 'Lease Defaults',
    description:
      'Upload a PDF or Word file to set your default lease style. Set seasonal options, custom lease eras, payment terms, and footers that prefill when you draft. Restyling never clears tenant details or signatures.',
    placement: 'bottom',
    route: '/studio/settings?tab=lease',
    section: 'settings',
  },
  {
    id: 'settings-lease-templates',
    target: '[data-onboarding="admin-lease-agreement-templates"]',
    title: 'Lease Agreement Templates',
    description:
      'Upload a sample lease to create a style, Confirm as default, then Apply to all pending tenants or Apply to all official tenants. Personal info, rent, and signatures stay intact.',
    placement: 'bottom',
    route: '/studio/settings?tab=lease#lease-agreement-templates',
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
      "You're ready to manage tenants, rentals, leases, and payments. Restart anytime from Menu → Take the tour.",
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
