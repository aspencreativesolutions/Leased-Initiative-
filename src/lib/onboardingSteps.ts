export interface OnboardingStep {
  id: string
  target: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Optional route to navigate before showing this step */
  route?: string
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
      'This is your Leased tenant dashboard — everything about your lease lives here. Let us walk you through the key areas.',
    placement: 'bottom',
  },
  {
    id: 'registration-waiting',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Waiting for approval',
    description:
      'After you sign up, your landlord reviews your registration. Once approved, your lease will appear here.',
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
    title: 'Review and sign your lease',
    description:
      'When your landlord sends your lease, it appears here. Open it, review the terms, and sign electronically.',
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
    title: 'Report Issue',
    description:
      'Under the Lease active tag, tap Report Issue. Pick a household problem, describe it, and upload a required photo — your landlord is notified under Tenant Alerts.',
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
    title: 'Welcome to Leased',
    description:
      'Leased helps you manage tenants from sign-up through an active lease. This quick tour covers the essentials.',
    placement: 'bottom',
    route: '/studio',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="admin-users"]',
    title: 'New tenant sign-ups',
    description:
      'When tenants register, they appear in Users. Approve them to create a tenant profile and draft lease automatically.',
    placement: 'bottom',
    route: '/studio',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-clients"]',
    title: 'Manage tenants',
    description:
      'Each tenant profile has their timeline, lease, invoices, files, and notes. This is your command center for every lease.',
    placement: 'bottom',
    route: '/studio',
  },
  {
    id: 'contracts',
    target: '[data-onboarding="admin-contracts"]',
    title: 'Leases',
    description:
      'Build leases, generate PDFs, and send them to the tenant portal. Tenants sign electronically and become active.',
    placement: 'bottom',
    route: '/studio',
  },
  {
    id: 'payments',
    target: '[data-onboarding="admin-payments"]',
    title: 'Payments and overdue rent',
    description:
      'Track rent under Payments. On the Overdue Rent tab, open Send Message to Tenant — use a template or write your own. Done opens Messages on your phone so replies stay on your device.',
    placement: 'bottom',
    route: '/studio/payments/overdue',
  },
  {
    id: 'calendar',
    target: '[data-onboarding="admin-calendar"]',
    title: 'Deadlines and scheduling',
    description:
      'Track follow-ups, lease timelines, appointments, and meetings in one Calendar — prioritized by service tier.',
    placement: 'bottom',
    route: '/studio',
  },
  {
    id: 'notifications',
    target: '[data-onboarding="admin-notifications"]',
    title: 'Activity notifications',
    description:
      'Registrations, signed leases, payment activity, and tenant issue reports surface here. Dismiss when handled — tenants get their own automated updates.',
    placement: 'bottom',
    route: '/studio',
  },
  {
    id: 'tenant-alerts',
    target: '[data-onboarding="admin-tenant-alerts"]',
    title: 'Tenant Alerts',
    description:
      'When a tenant reports an issue with a photo or document, it appears under Tenant Alerts so you can assess the problem and dispatch maintenance.',
    placement: 'bottom',
    route: '/studio/alerts',
  },
  {
    id: 'automation',
    target: '[data-onboarding="admin-settings"]',
    title: 'Automation settings',
    description:
      'Configure automated tenant reminders, follow-ups, and status updates in Settings.',
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
