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
      'This is your Client Craft dashboard — everything about your project lives here. Let us walk you through the key areas.',
    placement: 'bottom',
  },
  {
    id: 'registration-waiting',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Waiting for acceptance',
    description:
      'After you sign up, your designer reviews your registration. Once accepted, your contract and project details will appear here.',
    placement: 'top',
    when: (ctx) => ctx.linked === false,
  },
  {
    id: 'status',
    target: '[data-onboarding="portal-status"]',
    title: 'Project status at a glance',
    description:
      'Track your contract, payment, and project progress in one place. Status updates automatically as your project moves forward.',
    placement: 'bottom',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'contracts',
    target: '[data-onboarding="portal-contracts"]',
    title: 'Review and sign contracts',
    description:
      'When your designer sends your agreement, it appears here. Open it, review the terms, and sign electronically.',
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
    title: 'Share project files',
    description:
      'Once your project starts, upload logos, copy, images, and other assets here. Add notes to each file so your designer knows what you are sending.',
    placement: 'top',
    when: (ctx) => ctx.linked === true,
  },
  {
    id: 'timeline',
    target: '[data-onboarding="portal-timeline-nav"]',
    title: 'Follow your project timeline',
    description:
      'The Timeline page shows every milestone — contract, payment, project start, and completion — so you always know what is next.',
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
    title: 'Welcome to StudiOS',
    description:
      'Client Craft helps you manage clients from first inquiry through project completion. This quick tour covers the essentials.',
    placement: 'bottom',
    route: '/',
  },
  {
    id: 'registrations',
    target: '[data-onboarding="admin-users"]',
    title: 'New client sign-ups',
    description:
      'When clients register at the portal, they appear in Users. Accept them to create a client profile and draft contract automatically.',
    placement: 'bottom',
    route: '/',
  },
  {
    id: 'clients',
    target: '[data-onboarding="admin-clients"]',
    title: 'Manage clients',
    description:
      'Each client profile has their timeline, contract, invoices, files, and notes. This is your command center for every project.',
    placement: 'bottom',
    route: '/',
  },
  {
    id: 'contracts',
    target: '[data-onboarding="admin-contracts"]',
    title: 'Contracts workflow',
    description:
      'Build contracts, generate PDFs, and send them to the client portal. Clients sign electronically and become official clients.',
    placement: 'bottom',
    route: '/',
  },
  {
    id: 'calendar',
    target: '[data-onboarding="admin-calendar"]',
    title: 'Deadlines and scheduling',
    description:
      'Track follow-ups, project deadlines, and meetings on the Calendar. The Scheduler auto-prioritizes work by service tier.',
    placement: 'bottom',
    route: '/',
  },
  {
    id: 'notifications',
    target: '[data-onboarding="admin-notifications"]',
    title: 'Activity notifications',
    description:
      'Registrations, signed contracts, and payment activity surface here. Dismiss when handled — clients get their own automated updates.',
    placement: 'bottom',
    route: '/',
  },
  {
    id: 'automation',
    target: '[data-onboarding="admin-settings"]',
    title: 'Automation settings',
    description:
      'Configure automated client reminders, follow-ups, and status updates in Settings. Future team members can manage this without extra setup.',
    placement: 'bottom',
    route: '/',
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
