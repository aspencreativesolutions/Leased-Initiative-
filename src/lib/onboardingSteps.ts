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
  { id: 'settings', label: 'Help and Settings' },
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
  /**
   * How to bring the target into view before revealing the tip.
   * `top` scrolls the window to y=0 (and aligns the target to the top).
   */
  scrollAlign?: 'nearest' | 'start' | 'top'
  /**
   * Temporarily shrink the spotlight target so the tip can sit beside it.
   * Cleared when leaving the step or ending the tour.
   */
  zoomOut?: boolean
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
      'Your home for applications, leases, rent, documents, and maintenance. Use the left and right arrow keys (or the buttons below) to move through the tour. Use Dashboard and Timeline in the top bar — or Menu on phones — to move around.',
    placement: 'bottom',
    route: '/portal',
  },
  {
    id: 'application',
    target: '[data-onboarding="portal-application"]',
    title: 'Start your application',
    description:
      'Choose a landlord, pick an available address, select Solo or Couple, choose Entire Home or Open to Roommates (and invite friends via Group Chat or Solo if you have numbers), then Send — or enter an invite code your landlord texted you.',
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
    id: 'property-details',
    target: '[data-onboarding="portal-property-details"]',
    title: 'Property details & roommates',
    description:
      'See everyone in the home and their payment statuses. If a bedroom is open, tap Extra Bedroom Available to text a registration invite — adding a roommate lowers your rent share. Their lease runs until yours ends; then you all renew together.',
    placement: 'left',
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
      'See what’s next due, then tap Pay Rent — PayPal, Stripe, Square, or Zelle. For Zelle, follow the portal steps in your bank app and mark the payment as sent. If rent is past due, your landlord may text a reminder; reply from your phone and pay here anytime.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'payment',
    target: '[data-onboarding="portal-invoice"]',
    title: 'Pay your deposit',
    description:
      'Your deposit invoice and payment link appear here after you sign. Pay from the link (or Zelle pay page) so your landlord can confirm and move you toward move-in.',
    placement: 'top',
    route: '/portal',
    when: (ctx) => ctx.linked === true && ctx.hasInvoice === true,
  },
  {
    id: 'files',
    target: '[data-onboarding="portal-files"]',
    title: 'Share documents',
    description:
      'Upload files and short notes for your landlord. Shared Files stays on your dashboard so lease paperwork stays in one place. If your landlord requires a tenant photo, upload a clear JPG, PNG, or WEBP image here before move-in.',
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
    id: 'condition-report',
    target:
      '[data-onboarding="portal-condition-report"], [data-onboarding="portal-condition-report-page"]',
    title: 'Condition Report',
    description:
      'Complete your move-in and move-out inspection checklist — rate windows, blinds, utilities, and more, add notes or photos, and submit electronically. When required, finish within the landlord’s timeframe so they can review before finalizing.',
    placement: 'bottom',
    route: '/portal/inspection',
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
      'Apply or join with an invite, sign your lease, pay deposit and rent, share files, complete condition reports, request maintenance, and follow your timeline — all from here. Restart anytime from Menu → Take the tour.',
    placement: 'bottom',
    route: '/portal',
    completion: true,
  },
]

export const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="admin-key-return-preferences"]',
    title: 'Important preferences',
    description:
      'You can skip this tour at any time, but these are important preferences for you: automatic key return notifications, required tenant photos, and move-in / move-out condition reports (required or optional, with due windows). You can continue to the manual demo, but these settings are always adjustable in preferences — and you can override required vs optional per rental.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="tenants-waiting-connect"]',
    title: 'Waiting to Connect',
    description:
      'People who claimed an invite or registered but aren’t connected yet. Review Solo/Couple tags, property, and lease start, then Accept & Draft Lease — or dismiss them.',
    placement: 'top',
    route: '/studio',
    section: 'dashboard',
    scrollAlign: 'start',
  },
  {
    id: 'pending-tenants',
    target: '[data-onboarding="dashboard-pending-tenants-list"]',
    title: 'Pending Tenants',
    description:
      'Accepted or manually added tenants stay here until their lease is signed. Status starts as Lease Drafted — preview to download, upload a replacement, or send when ready. Use Auto-send in the header, or Replace Template to open Templates and apply to pending or official tenants. After e-sign they move to Official Tenants as Awaiting Deposit; confirm payment to mark them Upcoming until the lease starts.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-official-tenants"]',
    title: 'Official Tenants',
    description: [
      'Active and upcoming tenants appear here, including tenants added from Lease Import.',
      'A check or clock beside each name shows whether the lease is active or starting soon.',
      'Each row clearly displays:\n• **Lease Status** (lease dates and duration)\n• **Payment Status** (full status, payment method logo, and deposit details)\n• **Overdue payments** (click Overdue to open that tenant in Payments)',
      'Newly imported tenants briefly flash—select Highlight Last Import to find them again.',
      'Click a tenant’s name to open Tenant Details, including payment processor information and any clickable overdue balance.',
      'When a deposit is confirmed: Awaiting Deposit → Upcoming → Active.',
      'When the lease ends, a red Lease Complete tag appears under the tenant name (and beside the Arrangement column when Show Arrangements is on). Hover it to Request Key Return — that notifies the tenant to return keys within your grace period to avoid the fine. You can then:\n• **Archive** (move them to Past Tenants in Company Profile & Preferences)\n• **Delete** (permanently remove them)',
      'Use Display Settings to:\n• **Show Arrangements** — adds an **Arrangement** column immediately to the right of Tenant (and a labeled Arrangement block on tiles): **Sole Tenant** (subtitle **Entire Home**, pays full rent) or **Co-Tenant** (subtitle shows roommate count, e.g. **2 roommates**); * **Open to Roommates** appears when that preference applies; expand the bedroom count to see numbered rooms (1, 2, 3…) with occupants or Vacant, a green/red rent status dot (paid on the 1st or not), and click a name to open Tenant Details\n• **Filter** by **Lease Progress** (4 options: Not Started, Ongoing, Ending Soon, Finished), **Tenant Type** (2 options: Sole Tenant, Co-Tenant), and **Building Type** (4 options: Apartment, Single-Family Home, Townhouse, Duplex) — counts appear inline beside each label; each filter has **Reset Filters**\n• In **Tile View**, a boxed **Tenant tile size** slider sits to the right of Show Arrangements\nOn phones, jump to Waiting to Connect or Pending Clients from buttons beside the Official Tenants title.',
    ].join('\n\n'),
    placement: 'left',
    route: '/studio',
    section: 'dashboard',
    scrollAlign: 'top',
    zoomOut: true,
  },
  {
    id: 'properties',
    target: '[data-onboarding="admin-properties"]',
    title: 'Rentals',
    description:
      'Your rental portfolio. Add addresses with Student Housing or Standard Rental, furnished status, pricing, beds, deposit, utilities, and whether the move-in / move-out condition report is required or optional for that rental (or use your account default from Preferences). Occupancy is calculated from beds (solo on a queen shows 1 of 1). Each tile shows a Student Housing / Standard Rental tag in the top-right and Furnished or Unfurnished under the rental type; Queen and other bed-size names appear only on furnished rentals. Expand a tile to see who’s there or open Tenant Details. Take Off Market (left of Open) grays out a unit with an optional reason; it stays in the list and under View Off-Market Rentals beside Map, but tenants cannot apply. On mobile, use scrollable tiles; on larger screens, switch Tile or Spreadsheet View in Display Settings (boxed Rental tile size slider in Tile View, with Sort by distance from beside it). Use Map beside Add Rental to see all properties nationwide and Define Group by clicking pins or setting a radius. In Spreadsheet View, Sort By: Distance From in the Address column — category tags sit under rental type. Filter by State and Town (counts above each control, default Any) and Groups (default Any; pen icon beside the label opens Edit Groups) — one Reset Filters clears all.',
    placement: 'bottom',
    route: '/studio/properties',
    section: 'rentals',
  },
  {
    id: 'rentals-map',
    target: '[data-onboarding="rentals-map"]',
    title: 'Portfolio map',
    description:
      'Open Map to see every rental across the U.S., then Define Group by clicking individual properties or drawing a radius around a point. Saved groups appear in Display Settings → Filter → Groups (pen icon to edit). Next to Map, View Off-Market Rentals filters to grayed-out units taken off market.',
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
      'Draft, send, and track every lease. Tiles show Sent or Signed status and progress through the term. After you confirm a new template in Help and Settings → Lease Defaults, restyle all or selected agreements without clearing signatures. On mobile, use scrollable tiles; on larger screens, switch layouts and filters in Display Settings.',
    placement: 'bottom',
    route: '/studio/contracts',
    section: 'contracts',
  },
  {
    id: 'payments',
    target: '[data-onboarding="admin-payments"]',
    title: 'Payments and overdue rent',
    description:
      'Track rent for every tenant — unit rent, share, balance, and due dates. Switch Tile or Spreadsheet View in Display Settings (boxed Payment tile size slider in Tile View). Open Filter to cycle Payment Status (Any, Paid Rent, Overdue Rent, Paid Early, On Time) and Payment Method (Any, Stripe, PayPal, Square, Zelle) — each with Reset Filters. Confirm Zelle transfers when tenants mark them sent. Connect your Zelle handle in Company Profile & Preferences. Replies to overdue messages stay on your phone.',
    placement: 'bottom',
    route: '/studio/payments?status=overdue',
    section: 'payments',
  },
  {
    id: 'tenant-alerts',
    target: '[data-onboarding="admin-tenant-alerts"]',
    title: 'Tenant Alerts',
    description:
      'Maintenance requests with photos and submitted move-in / move-out condition reports appear here so you can assess repairs and approve (or request changes on) inspection checklists before finalizing.',
    placement: 'bottom',
    route: '/studio/alerts',
    section: 'alerts',
  },
  {
    id: 'notifications',
    target: '[data-tenant-actions]',
    title: 'Tenant shortcuts',
    description:
      'Beside the Official Tenants title: use Link to text a one-time invite, or Add Tenant Manually to create a tenant yourself. New Registers appears only when someone is waiting.',
    placement: 'bottom',
    route: '/studio',
    section: 'dashboard',
  },
  {
    id: 'company-details',
    target: '[data-onboarding="admin-company-details"]',
    title: 'Company Profile & Preferences',
    description:
      'Review your company name and rental or renter counts — including Past Tenants (archived, labeled Archived). Set preferences for automatic key return notices, editable grace-period lease wording, required tenant photos, and move-in / move-out condition reports (required or optional with due windows). Tap a count to explore that group, and filter by lease duration when needed.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'key-return-preferences',
    target: '[data-onboarding="admin-key-return-preferences"]',
    title: 'Key return, photos & condition reports',
    description:
      'Turn automatic key return notifications on or off (on by default). Edit the grace period wording and save it as the lease clause. Require Tenant Photo (on by default) adds a matching lease clause. Require Condition Report (on by default) sets move-in and move-out inspection deadlines and lease wording — tenants submit checklists electronically for your review under Tenant Alerts. Override required vs optional per rental when editing a property. All stay editable here anytime.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'lease-upload',
    target: '[data-onboarding="admin-lease-upload"]',
    title: 'Import existing leases',
    description:
      'Queue lease PDFs, images, or spreadsheets, then Scan Files. Imported and uploaded leases create editable drafts that include your key return wording, tenant photo clause, and condition report clause from Preferences. Select one or more proposed tenants and Add to Official Tenants to jump to the dashboard with them highlighted — or Confirm to Pending and send invite links by email or text.',
    placement: 'bottom',
    route: '/studio/profile',
    section: 'settings',
  },
  {
    id: 'settings-hub',
    target: '[data-onboarding="admin-settings-business"]',
    title: 'Help and Settings',
    description:
      'Open Menu → Help and Settings anytime for Business Information, Client Automation, Lease Defaults, and App Style — each opens its own page from the menu.',
    placement: 'bottom',
    route: '/studio/settings?tab=business',
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
      'Pick a visual finish for the landlord studio — previews apply instantly. Change it anytime from Menu → Help and Settings → App Style.',
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
