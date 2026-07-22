import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
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
  kind?: 'role' | 'feature' | 'tour' | 'ready'
}

const TENANT_FEATURE_SLIDES: WelcomeSlide[] = [
  {
    id: 'tenant-portal',
    kind: 'feature',
    icon: LayoutDashboard,
    title: 'Your tenant portal',
    description:
      'A clean dashboard centered on your next rent due date — with Pay Rent anytime, leases, and updates in one place.',
  },
  {
    id: 'tenant-contracts',
    kind: 'feature',
    icon: FileText,
    title: 'Review and sign leases',
    description:
      'When your landlord sends a lease, open it here, review the terms, and sign electronically.',
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
      'Upload files and notes for your landlord, and follow lease milestones on the Timeline page.',
  },
  {
    id: 'tenant-report-issue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Report Issue',
    description:
      'Under the Lease active tag, open Report Issue to pick a household problem, attach a photo, and notify your landlord for maintenance.',
  },
]

const LANDLORD_FEATURE_SLIDES: WelcomeSlide[] = [
  {
    id: 'landlord-dashboard',
    kind: 'feature',
    icon: LayoutDashboard,
    title: 'Your landlord workspace',
    description:
      'Manage tenants from sign-up through an active lease — registrations, leases, and deadlines in one place.',
  },
  {
    id: 'landlord-users',
    kind: 'feature',
    icon: Users,
    title: 'Approve new tenants',
    description:
      'New sign-ups appear under Users. Approve them to create a tenant profile and draft lease automatically.',
  },
  {
    id: 'landlord-contracts',
    kind: 'feature',
    icon: ClipboardList,
    title: 'Build and send leases',
    description:
      'Create leases, generate PDFs, and send them to the tenant portal for electronic signature.',
  },
  {
    id: 'landlord-overdue',
    kind: 'feature',
    icon: AlertTriangle,
    title: 'Overdue rent messaging',
    description:
      'See past-due tenants under Payments → Overdue Rent. Send a custom text or pick a template — replies stay on your phone.',
  },
  {
    id: 'landlord-calendar',
    kind: 'feature',
    icon: CalendarDays,
    title: 'Deadlines and rent confirmations',
    description:
      'Track follow-ups in Calendar. When tenants pay rent — including multiple months upfront — confirmations appear in your notification feed.',
  },
  {
    id: 'landlord-tenant-alerts',
    kind: 'feature',
    icon: Bell,
    title: 'Tenant Alerts',
    description:
      'When a tenant reports an issue with a photo or document, it lands in Tenant Alerts so you can assess and dispatch maintenance.',
  },
]

const TOUR_SLIDE: WelcomeSlide = {
  id: 'tour-anytime',
  kind: 'tour',
  icon: Compass,
  title: 'Revisit the tour anytime',
  description:
    'Once you are signed in, press the Tour button in the navigation bar to walk through every page and button again.',
}

const READY_SLIDE: WelcomeSlide = {
  id: 'ready',
  kind: 'ready',
  icon: CheckCircle2,
  title: 'You are ready to begin',
  description:
    'Create an account or sign in to open your workspace. A short guided tour will start automatically the first time.',
}

export const ROLE_SLIDE: WelcomeSlide = {
  id: 'role',
  kind: 'role',
  icon: Users,
  title: 'Who are you?',
  description: 'Choose how you will use Leased so we can show you the right features.',
}

export function getWelcomeSlides(role: WelcomeRole | null): WelcomeSlide[] {
  const features =
    role === 'tenant'
      ? TENANT_FEATURE_SLIDES
      : role === 'landlord'
        ? LANDLORD_FEATURE_SLIDES
        : []

  return [ROLE_SLIDE, ...features, ...(role ? [TOUR_SLIDE, READY_SLIDE] : [])]
}

export function loginPathForRole(role: WelcomeRole): string {
  return role === 'landlord' ? '/studio/login' : '/login'
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
