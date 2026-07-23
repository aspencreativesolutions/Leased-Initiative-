export type ProjectStatus =
  | 'Inquiry'
  | 'In Progress'
  | 'Contract Sent'
  | 'Contract Signed'
  | 'Completed'
  | 'Follow-Up Needed'

export type ContractStatus =
  | 'Not Started'
  | 'Draft in Progress'
  | 'Generated'
  | 'Sent'
  | 'Signed'
  | 'Completed'
  | 'Cancelled'

export type PaymentStatus =
  | 'Unpaid'
  | 'Pay Link Clicked'
  | 'Deposit Paid'
  | 'Partial'
  | 'Paid'
  | 'Overdue'

export type ProjectType =
  | 'Apartment'
  | 'House'
  | 'Condo'
  | 'Townhouse'
  | 'Duplex'

export type NoteCategory = 'General' | 'Payment' | 'Contract' | 'Project' | 'Follow-Up'

export type ServiceTier = 'Launch' | 'Studio' | 'Summit'

export type PaymentProvider = 'paypal' | 'stripe' | 'square'

/** How a tenant occupies a rental (shown on Tenant Details). */
export type OccupancyArrangement =
  | 'entire_home'
  | 'private_unit'
  | 'shared_home'
  | 'shared_apartment'
  | 'room_rental'

export type LeaseRenewalStatus =
  | 'renewal_offered'
  | 're_sign_pending'
  | 'not_renewing'

export interface SchedulerNote {
  id: string
  text: string
  createdAt: string
  weekStart?: string
}

export interface TimelineStepSkip {
  skippedAt: string
}

export interface Note {
  id: string
  text: string
  createdAt: string
  category?: NoteCategory
  /** Links note back to a timeline step (skip notes) */
  timelineStepId?: string
}

export interface Deadline {
  id: string
  type: 'follow-up' | 'project' | 'contract' | 'payment'
  date: string
  label: string
  /** Local time, e.g. "14:00" — shown for calls and scheduled meetings */
  time?: string
  /** Video or calendar link for discovery calls and follow-ups */
  meetingLink?: string
  /** What to discuss, deliver, or prepare — shown when the card is expanded */
  description?: string
  notes?: string
  completed?: boolean
  /** YYYY-MM-DD when rent was received (payment deadlines) */
  paidAt?: string
  /** Human-readable timeline event, e.g. "August rent paid early on July 22" */
  eventLabel?: string
}

/** Invoice tied to a client for PayPal or Stripe checkout */
export interface ClientInvoice {
  description: string
  amount: number
  currency: string
  paymentProvider?: PaymentProvider
  paypalOrderId?: string
  paypalCaptureId?: string
  stripeSessionId?: string
  stripePaymentIntentId?: string
  squarePaymentLinkId?: string
  squareOrderId?: string
  squarePaymentId?: string
  /** Hosted checkout URL (PayPal approve link, Stripe Checkout, or Square) */
  paymentLink?: string
  createdAt: string
  paidAt?: string
  /** When admin delivered the invoice link to the client portal */
  sentToPortalAt?: string
  /** When the client opened the PayPal payment link */
  paymentLinkClickedAt?: string
  invoiceType?: 'deposit' | 'final' | 'rent'
  /** Rent invoices: due dates covered by this payment */
  dueDates?: string[]
  monthCount?: number
}

export interface PortalInvoice {
  amount: number
  currency: string
  description: string
  paymentProvider?: PaymentProvider
  paymentLink?: string
  sentToPortalAt?: string
  paidAt?: string
  dueDate?: string
  invoiceType?: 'deposit' | 'final' | 'rent'
  dueDates?: string[]
  monthCount?: number
}

export type TimelineStepStatus = 'completed' | 'pending' | 'active'

export interface TimelineSubEvent {
  id: string
  label: string
  completedAt: string
  detail?: string
}

export interface ProjectTimelineStep {
  id: string
  label: string
  status: TimelineStepStatus
  completedAt?: string
  /** When the current active step started waiting (previous step completed) */
  waitingSince?: string
  detail?: string
  skipped?: boolean
  subEvents?: TimelineSubEvent[]
}

export type UserRole = 'admin' | 'client'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  clientId?: string | null
  phone?: string
  /** Preferred lease term in months (tenants choose at registration) */
  preferredLeaseMonths?: number
  /** Official landlord / agency name chosen at tenant registration */
  preferredLandlordCompany?: string
  /** Exact property address the tenant is registering for */
  preferredPropertyAddress?: string
  /** Hidden from new registration queue without deleting the account */
  registrationDismissed?: boolean
  /** Client portal style — persisted across sessions */
  portalThemeId?: string
  emailVerified?: boolean
  emailVerifiedAt?: string
  /** Guided tour progress for client or admin onboarding */
  onboardingProgress?: OnboardingProgress
  /** True when signed in via the public demo access code */
  publicDemo?: boolean
  /** Canonical leased demo / mock account */
  isLeasedDemoUser?: boolean
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface RegisterResponse {
  ok: true
  email: string
  requiresVerification: true
  message: string
}

export interface Client {
  id: string
  name: string
  businessName: string
  email: string
  phone: string
  website?: string
  socialLinks?: string
  projectType: ProjectType
  projectName: string
  projectDescription?: string
  projectStatus: ProjectStatus
  contractStatus: ContractStatus
  paymentStatus: PaymentStatus
  /** True after you confirm them post–signed contract */
  isOfficialClient: boolean
  officialClientSince?: string
  invoice?: ClientInvoice
  /** Remaining balance invoice — auto-generated when project is marked complete */
  finalInvoice?: ClientInvoice
  /** Tenant-generated rent checkout for one or more months */
  rentInvoice?: ClientInvoice
  /** Admin manually confirmed deposit after PayPal verification */
  depositPaymentConfirmedAt?: string
  /** When all deliverables are fulfilled */
  projectCompletedAt?: string
  followUpDate?: string
  notes: Note[]
  deadlines: Deadline[]
  profileNotes?: string
  /** Demo client from initial sample data */
  isSampleClient?: boolean
  /** Journey demo tenant (leased.test accounts) */
  isLeasedDemoClient?: boolean
  /** Payment + lease dates come from the shared Demo Mode fixtures */
  demoLeaseFixture?: boolean
  demoLeaseStartDate?: string
  /** Linked client portal account */
  accountUserId?: string
  /** Service tier for this project — syncs to contract; changing it requires contract resend */
  serviceTier?: ServiceTier
  /** Agreed / preferred lease length in months */
  leaseLengthMonths?: number
  /**
   * Optional custom monthly rent responsibility for this tenant.
   * When set, overrides equal split of the unit’s monthly rent.
   */
  rentShareAmount?: number
  /**
   * Amount already paid toward the current rent period (partial payments).
   * Used with unit rent / tenant share to compute remaining balance.
   */
  currentPeriodAmountPaid?: number
  /**
   * How this tenant occupies the property (entire home, shared apartment, etc.).
   * When omitted, Tenant Details derives a default from roommates + rental type.
   */
  occupancyArrangement?: OccupancyArrangement
  /**
   * Tenants with the same leaseGroupId share one lease agreement.
   * Distinct ids at the same address mean separate leases.
   */
  leaseGroupId?: string
  /** Room or unit label within the property (e.g. "Room 2", "Unit B") */
  unitOrRoomLabel?: string
  /** Linked portfolio rental (preferred over address match when set) */
  propertyId?: string
  /** Bedroom within property.bedroomsLayout */
  bedroomId?: string
  /** Specific bed within that bedroom */
  bedId?: string
  /** Renewal / re-sign outreach state when applicable */
  leaseRenewalStatus?: LeaseRenewalStatus
  /** Created via Company Profile “Import existing leases” */
  importedFromLeaseScan?: boolean
  /** Source document names from the import session */
  importSourceFiles?: string[]
  /** When the landlord confirmed the imported record */
  importedAt?: string
  /** Audit: who confirmed the import (email or display name) */
  importConfirmedBy?: string
  /** Invite delivery after import confirm */
  importInvite?: {
    method: 'email' | 'sms'
    sentAt: string
    status: 'pending' | 'opened' | 'accepted' | 'expired'
    destination?: string
  }
  /** Set when admin clicks Start Project — unlocks portal uploads */
  projectStartedAt?: string
  /** Admin-skipped timeline steps (step id → skip timestamp) */
  timelineStepSkips?: Record<string, TimelineStepSkip>
  /** Completed project checklist item ids for the client's current tier */
  projectChecklistCompleted?: string[]
  createdAt: string
}

export interface ContractData {
  id: string
  clientId: string
  clientName: string
  businessName: string
  email: string
  phone: string
  clientAddress?: string
  /** Service tier — drives weekly scheduler priority */
  serviceTier: ServiceTier
  projectTitle: string
  projectScope: string
  servicesIncluded: string
  servicesNotIncluded: string
  deliverables: string
  startDate: string
  completionDate: string
  totalCost: string
  depositAmount: string
  remainingBalance: string
  paymentSchedule: string
  /** Checkout provider for deposit, rent, and final invoices */
  paymentProvider?: PaymentProvider
  /** When true (default), tenants may pay multiple consecutive months upfront */
  allowPrepaidRent?: boolean
  paymentMethods: string
  latePaymentPolicy: string
  revisionCount: string
  extraRevisionFee: string
  revisionLimits: string
  clientResponsibilities: string
  communicationMethod: string
  responseTime: string
  meetingExpectations: string
  ownershipTerms: string
  portfolioRights: string
  terminationTerms: string
  clientSignature?: string
  designerSignature?: string
  clientSignDate?: string
  designerSignDate?: string
  createdAt: string
  pdfGenerated?: boolean
  /** Sent to client portal */
  sentAt?: string
  /** Set when a previously sent lease is sent again */
  resentAt?: string
  viewedAt?: string
  signedAt?: string
  confirmedByClient?: boolean
  /** Fingerprint of terms the client signed */
  signedContentFingerprint?: string
  /** Updated when admin changes contract terms */
  contentUpdatedAt?: string
  /** Auto-generated contract still using placeholder sections */
  isPlaceholderDraft?: boolean
  /** Residential lease template generation lifecycle */
  leaseGenerationStatus?: 'generating' | 'ready'
  leaseGenerationStartedAt?: string
  leaseGenerationCompletedAt?: string
  /** Monotonic lease version; increments when a sent lease is revised */
  leaseVersion?: number
  /** Prior delivered versions superseded by edits after send */
  versionHistory?: LeaseVersionSnapshot[]
}

export interface LeaseVersionSnapshot {
  version: number
  supersededAt: string
  sentAt?: string
  contentFingerprint?: string
}

export type PortalContractClientStatus = 'Pending Review' | 'Viewed' | 'Accepted'

export interface PortalContractSummary {
  id: string
  projectTitle: string
  /** Property address shown in the Leases list */
  address?: string
  totalCost: string
  sentAt?: string
  signedAt?: string
  viewedAt?: string
  confirmedByClient: boolean
  pdfGenerated: boolean
  portalStatus: PortalContractClientStatus
}

export interface PendingRegistration {
  id: string
  name: string
  email: string
  createdAt: string
  /** Preferred lease term chosen at registration */
  preferredLeaseMonths?: number
  /** Landlord / agency the tenant selected at registration */
  preferredLandlordCompany?: string
  /** Property address the tenant entered at registration */
  preferredPropertyAddress?: string
}

export interface PortalUserAccepted {
  userId: string
  name: string
  email: string
  registeredAt: string
  clientId: string
  clientName: string
  projectName: string
  /** Property address (from registration or lease) */
  propertyAddress?: string
  contractStatus?: ContractStatus
  /** True when a filled-in lease agreement exists for this tenant (not a blank placeholder) */
  hasLeaseAgreement?: boolean
  /** Recommended landlord action for pending / prospective tenants */
  leaseAction?: 'draft' | 'send' | 'view' | 'generating'
  leaseGenerationStatus?: 'generating' | 'ready'
  isOfficialClient: boolean
  timelineStageId: string
  timelineStageLabel: string
  acceptedAt: string
  handlerName: string
  handlerEmail: string
}

export interface PortalUsersOverview {
  handlerName: string
  handlerEmail: string
  pending: PendingRegistration[]
  accepted: PortalUserAccepted[]
  pendingCount: number
  acceptedCount: number
}

export type AdminNotificationType =
  | 'registration'
  | 'contract_signed'
  | 'contract_needs_detail'
  | 'invoice_sent'
  | 'payment_link_clicked'
  | 'problem_report'
  | 'rent_payment'

export interface AdminNotification {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  userId?: string
  clientId?: string
  contractId?: string
  /** Attached file from a tenant issue report, when present */
  fileId?: string
  /** Original filename of the attached issue report file */
  fileName?: string
  problemType?: string
  /** Tenant's description of the issue (problem reports) */
  note?: string
  /** Snapshot of tenant name at report time */
  tenantName?: string
  /** Snapshot of property address at report time */
  address?: string
}

export type AdminAuditEntryType = 'contract_deleted'

export interface AdminAuditEntry {
  id: string
  type: AdminAuditEntryType
  contractId: string
  clientId: string
  clientName: string
  businessName?: string
  projectTitle: string
  deletedByUserId: string
  deletedByEmail: string
  deletedAt: string
  summary: string
  contractSnapshot?: {
    projectTitle: string
    clientName: string
    businessName: string
    serviceTier?: string
    sentAt: string | null
    signedAt: string | null
    pdfGenerated: boolean
    createdAt: string
  }
}

export interface ProjectFileNote {
  id: string
  text: string
  createdAt: string
  authorName: string
  authorRole: 'admin' | 'client'
}

export interface ProjectFile {
  id: string
  clientId: string
  projectName: string
  originalName: string
  storedName: string
  mimeType: string
  size: number
  uploadedBy: 'admin' | 'client'
  uploadedByName: string
  createdAt: string
  notes?: ProjectFileNote[]
}

export interface PortalSupportContact {
  businessName: string
  ownerName: string
  email: string
  phone: string
}

export type PortalRentPaymentStatus =
  | 'paid'
  | 'paid_early'
  | 'paid_late'
  | 'due'
  | 'upcoming'
  | 'overdue'

export interface PortalRentPayment {
  dueDate: string
  label: string
  status: PortalRentPaymentStatus
  /** YYYY-MM-DD when rent was received */
  paidAt?: string
  /** e.g. "August rent paid early on July 22" */
  eventLabel?: string
}

export interface PortalLeaseSchedule {
  leaseLengthMonths: number | null
  leaseStartDate: string | null
  leaseEndDate: string | null
  nextDueDate: string | null
  daysUntilNextDue: number | null
  payments: PortalRentPayment[]
}

export interface PortalRentUnpaidMonth {
  dueDate: string
  label: string
  status: PortalRentPaymentStatus
}

/** Tenant dashboard rent CTA — pay anytime while unpaid months remain */
export interface PortalRentPaymentInfo {
  nextDueDate: string | null
  daysUntilNextDue: number | null
  monthlyRent: number | null
  currency: string
  allowPrepaid: boolean
  maxMonths: number
  canPay: boolean
  unpaidMonths: PortalRentUnpaidMonth[]
  paymentProvider?: PaymentProvider
  pendingInvoice?: PortalInvoice | null
}

export interface PortalDashboard {
  linked: boolean
  isOfficialClient: boolean
  client: {
    id: string
    name: string
    businessName: string
    projectName: string
    /** Property / unit address for “Tenant at …” */
    address: string
    projectStatus: ProjectStatus
    contractStatus: ContractStatus
    paymentStatus?: PaymentStatus
    portalContractStatus: PortalContractClientStatus | null
    serviceTier: ServiceTier
    leaseLengthMonths?: number
    projectChecklistCompleted?: string[]
  } | null
  contracts: PortalContractSummary[]
  invoice?: PortalInvoice | null
  finalInvoice?: PortalInvoice | null
  /** Remaining balance after deposit — due at project completion */
  remainingBalance?: PortalInvoice | null
  /** Monthly rent due dates for the active lease term */
  leaseSchedule?: PortalLeaseSchedule | null
  /** Centered Pay Rent CTA data */
  rentPayment?: PortalRentPaymentInfo | null
  projectStarted: boolean
  projectStartedAt?: string
  supportContact?: PortalSupportContact
  message?: string
}

export interface ProfileReminder {
  id: string
  text: string
  dueDate?: string
  createdAt: string
}

export interface OnboardingProgress {
  completedSteps: string[]
  completedAt?: string
  dismissedAt?: string
}

export type ClientNotificationType =
  | 'registration_accepted'
  | 'contract_sent'
  | 'invoice_sent'
  | 'final_invoice_sent'
  | 'project_started'
  | 'status_update'
  | 'deadline_reminder'
  | 'follow_up'

export interface ClientNotification {
  id: string
  userId: string
  clientId?: string
  type: ClientNotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  relatedId?: string
}

export interface AutomationSettings {
  enabled: boolean
  deadlineReminderDays: number
  sendEmailReminders: boolean
  projectStatusUpdates: boolean
  followUpReminders: boolean
}

/** Map circle used to filter rentals / leases by distance from a center point. */
export interface ContractRegionRadius {
  /** Center latitude (WGS84) */
  lat: number
  /** Center longitude (WGS84) */
  lng: number
  /** Radius in miles */
  miles: number
  /** Optional label for the center (e.g. place name or address) */
  label?: string
}

/**
 * Reusable rental group for filtering by any combination of area codes, states,
 * and/or map radius. Persisted on `BusinessSettings.contractRegions`.
 */
export interface ContractRegion {
  id: string
  name: string
  /** US phone area codes (e.g. "212", "718") */
  areaCodes: string[]
  /** US state abbreviations (e.g. "NY", "NJ") */
  states: string[]
  /** Optional map radius — matches rentals with coordinates inside the circle */
  radius?: ContractRegionRadius
}

/** Housing / rental category for a landlord portfolio rental. */
export type PropertyHousingType =
  | 'Apartment'
  | 'Condominium (Condo)'
  | 'Single-Family Home'
  | 'Townhouse'
  | 'Duplex'
  | 'Triplex'
  | 'Fourplex'
  | 'Multi-Family Building'
  | 'Studio Apartment'
  | 'Loft'
  | 'Basement Apartment / Accessory Dwelling Unit'
  | 'Vacation Rental'

export const PROPERTY_HOUSING_TYPES: PropertyHousingType[] = [
  'Apartment',
  'Condominium (Condo)',
  'Single-Family Home',
  'Townhouse',
  'Duplex',
  'Triplex',
  'Fourplex',
  'Multi-Family Building',
  'Studio Apartment',
  'Loft',
  'Basement Apartment / Accessory Dwelling Unit',
  'Vacation Rental',
]

/** Structured address fields from Google Places (or equivalent). */
export interface PropertyAddressDetails {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  lat?: number
  lng?: number
  placeId?: string
}

/**
 * Optional per-unit records for multi-unit rentals.
 * Reserved for future unit-level occupancy; open units currently derive from unitCount.
 */
export interface PropertyUnit {
  id: string
  label?: string
  /** When set, matches a tenant address or unit designation */
  addressSuffix?: string
  /** Monthly rent for this specific rentable unit (source of truth when set) */
  monthlyRent?: number
}

/** Physical bed size — drives sleeping capacity, not rent price. */
export type BedSize = 'twin' | 'full' | 'queen' | 'king'

export const BED_SIZES: BedSize[] = ['twin', 'full', 'queen', 'king']

/** One physical bed inside a bedroom. */
export interface PropertyBed {
  id: string
  /** Display label, e.g. "Bed 1" */
  label?: string
  size: BedSize
  /** Sleeping capacity derived from size (Twin=1, Full/Queen/King=2) */
  capacity: 1 | 2
  /** Optional monthly rent for this bed space (else equal split of property rent) */
  monthlyRent?: number
}

/** One bedroom with one or more physical beds. */
export interface PropertyBedroom {
  id: string
  /** Display label, e.g. "Bedroom 1" */
  label: string
  beds: PropertyBed[]
}

/** Landlord-owned rental (building or single address). */
export interface Property {
  id: string
  /** Full street address used for matching tenants and invites */
  address: string
  /** Housing category (apartment, single-family, etc.) — shown as Rental Type in UI */
  propertyType: PropertyHousingType
  /** How many leasable units this rental has (used for open units / openings vacancy) */
  unitCount: number
  /** Bedroom count (= bedroomsLayout.length when layout is set) */
  bedrooms: number
  /**
   * Maximum people allowed — derived cache from sum of bed capacities when
   * bedroomsLayout is present.
   */
  maxTenants: number
  /**
   * Stable monthly rent for this rentable property/unit.
   * For duplex/apartment sides stored as separate properties, this is that unit’s rent.
   * Shared source of truth for Rentals and Payments (do not regenerate on reload).
   * Independent of bed sizes — changing Twin→Queen does not rewrite this.
   */
  monthlyRent?: number
  /**
   * Bedroom → bed inventory. Required for new/edited rentals.
   * Sleeping capacity and rentable bed spaces derive from this layout.
   */
  bedroomsLayout?: PropertyBedroom[]
  /** Optional bathroom count used when generating realistic rent */
  bathrooms?: number
  /** Optional interior size (sq ft) used when generating realistic rent */
  squareFeet?: number
  createdAt: string
  /** Added automatically while confirming an imported lease */
  importedFromLeaseScan?: boolean
  /** Parsed / Places-confirmed address components */
  addressDetails?: PropertyAddressDetails
  /** True when the landlord selected or confirmed a validated address */
  addressConfirmed?: boolean
  /** Future: individual unit records within a multi-unit rental */
  units?: PropertyUnit[]
}

export interface BusinessSettings {
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  logoUrl?: string
  defaultPaymentTerms: string
  defaultRevisionLimit: string
  defaultContractFooter: string
  /**
   * When true, newly generated leases use defaultLeaseStartDate / defaultLeaseEndDate
   * instead of the seasonal January 1 / August 1 calendar defaults.
   */
  customDefaultLeaseDates?: boolean
  /** YYYY-MM-DD — applied only when customDefaultLeaseDates is enabled */
  defaultLeaseStartDate?: string
  /** YYYY-MM-DD — applied only when customDefaultLeaseDates is enabled */
  defaultLeaseEndDate?: string
  profileReminders?: ProfileReminder[]
  automation?: AutomationSettings
  /** Named rental groups used to filter leases and rentals by location */
  contractRegions?: ContractRegion[]
}

export interface EmailDraft {
  to: string
  subject: string
  body: string
}

export interface PayPalCreateOrderResponse {
  orderId: string
  approvalUrl?: string
}

export interface PayPalCaptureResponse {
  orderId: string
  captureId: string
  clientId: string
  amount: string
  currency: string
  status: string
}

export type ScheduleBlockType = 'work' | 'lunch' | 'buffer'

export interface ScheduleBlock {
  id: string
  blockType: ScheduleBlockType
  dayIndex: number
  startTime: string
  endTime: string
  clientId?: string
  clientName?: string
  businessName?: string
  serviceTier?: ServiceTier
  label?: string
  deadlineDate?: string
}

export interface WeekSchedule {
  weekStart: string
  blocks: ScheduleBlock[]
  generatedAt: string
}
