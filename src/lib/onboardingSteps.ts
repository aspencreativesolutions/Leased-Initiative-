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
      'This is your Leased Initiative tenant dashboard — everything about your lease lives here. Let us walk you through the key areas.',
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
      'Important updates, reminders, and deadline alerts appear here. You will also receive email reminders when deadlines approach.',
    placement: 'bottom',
  },
]

export const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="admin-dashboard"]',
    title: 'Welcome to Leased Initiative',
    description:
      'Leased Initiative helps you manage tenants from sign-up through an active lease. This quick tour covers the essentials — use the section bar at the top to jump ahead anytime.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="tenants-waiting-connect"]',
    title: 'Waiting to Connect',
    description:
      'When tenants register (or use your invite link) with your agency and property, they appear under Waiting to Connect. Accept them into Pending Tenants — or use Add Tenant to generate a lease with January or August start dates and a lease duration. Draft and send a lease (Lease Status: Lease Sent), then once they sign they move to Official Tenants.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-official-tenants"]',
    title: 'Manage tenants',
    description:
      'Official Tenants (active or soon-to-start signed leases) sit at the top of the dashboard. Waiting to Connect and Pending Tenants sit below — with timelines, lease agreements, invoices, and notes on each official profile.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'properties',
    target: '[data-onboarding="admin-properties"]',
    title: 'Rentals',
    description:
      'Open Rentals to view your portfolio, track Upcoming Openings, and use + Add Rental for address, rental type, bedrooms, max tenants, and units — monthly rent is assigned per rentable unit. Tiles show rent, occupancy, and per-tenant share when a unit is shared; color shifts from dark red (more open units) to green when fully occupied. In Display Settings, switch Tile or Spreadsheet View (Monthly Rent, Occupancy, Tenant Share), resize tiles, and open Filter By to show Duplex, Apartment, Single-Family Home, Townhouse, or other types (All Rentals clears the filter), or filter by state and group (including map radius). New rentals feed openings, tenant signup, and Payments.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'upcoming-openings',
    target: '[data-onboarding="admin-upcoming-openings"]',
    title: 'Upcoming Openings',
    description:
      'On the Rentals page, vacant units and leases ending soon appear under Upcoming Openings. Each row offers Send Re-sign Message for current tenants or Generate Invite Code for a new tenant at that address.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'contracts',
    target: '[data-onboarding="admin-contracts"]',
    title: 'Lease Agreements',
    description:
      'Draft and send lease agreements, then track term progress. Tiles are the default — Sent, Signed, or Active sits under each tenant name (Signed until the start date; Active once it has passed; hover for that date). Active leases show Month X of Y with a progress bar (hover for the lease start date). In Display Settings, Tile and Spreadsheet View stay available; open Filter and click Lease Status to cycle Any → Signed → Sent → Active (Any shows all agreements), or filter by property state, area code, or group (Edit Groups sits beside Group). Resize tiles as needed. Click an address on a tile to open a map.',
    placement: 'bottom',
    route: '/studio/contracts',
    section: 'contracts',
  },
  {
    id: 'payments',
    target: '[data-onboarding="admin-payments"]',
    title: 'Payments and overdue rent',
    description:
      'Track all rent under Payments — each tile ties to the tenant’s assigned unit rent and calculated share (including roommate splits). Use Display Settings to filter Overdue Rent, Paid Early, or Payment Method. With Overdue Rent on, open Send Message to Tenant — Done opens Messages on your phone so replies stay on your device.',
    placement: 'bottom',
    route: '/studio/payments?status=overdue',
    section: 'payments',
  },
  {
    id: 'tenant-alerts',
    target: '[data-onboarding="admin-tenant-alerts"]',
    title: 'Tenant Alerts',
    description:
      'When a tenant logs a repair or concern with a required photo, it appears under Tenant Alerts in the top navigation so you can assess the problem and dispatch maintenance.',
    placement: 'bottom',
    route: '/studio/alerts',
    section: 'alerts',
  },
  {
    id: 'notifications',
    target: '[data-tenant-actions]',
    title: 'Tenant shortcuts',
    description:
      'Use the compact icons next to Tenant Alerts to Send Invite or Add Tenant. Add Tenant creates a Pending Tenant with a generated lease awaiting signature. View New Registers appears only when a new sign-up is waiting for review — then you can accept them into Pending Tenants.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'company-details',
    target: '[data-onboarding="admin-company-details"]',
    title: 'Company Profile',
    description:
      'Review your registered company name, then tap rental-type counts under Rentals or Official / Pending / Waiting counts under All Renters to explore each group. Filter lists by lease duration. Add and manage rentals from the Rentals page.',
    placement: 'bottom',
    route: '/studio/profile',
  },
  {
    id: 'lease-upload',
    target: '[data-onboarding="admin-lease-upload"]',
    title: 'Import existing leases',
    description:
      'Queue lease PDFs, images, or spreadsheets, then click Scan Files. Watch tenant records appear live, review every field, confirm what looks right, and send an invite link by email or text.',
    placement: 'bottom',
    route: '/studio/profile',
  },
  {
    id: 'automation',
    target: '[data-onboarding="admin-settings"]',
    title: 'Settings',
    description:
      'Configure lease calendar defaults (January / August seasons or custom dates), automated tenant reminders, follow-ups, and status updates in Settings. Restart this tour anytime with the Tour button; use Bug Report next to Settings to flag issues for Aspen Creative Solutions.',
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
