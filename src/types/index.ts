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

/**
 * Applicant occupancy preference (Start Application + landlord pipeline tags).
 * Legacy stored values `full_rent` / `roommates` are normalized on read.
 */
export type PreferredOccupancyMode =
  | 'entire_home'
  | 'open_to_roommates'
  | 'private_room'
  | 'shared_room'
  | 'full_rent'
  | 'roommates'

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
  /** Preferred lease term in months (tenants choose at registration) */
  preferredLeaseMonths?: number
  /** Requested lease start (YYYY-MM-DD) from invite claim or registration */
  preferredLeaseStartDate?: string
  /** Official landlord / agency name chosen at tenant registration */
  preferredLandlordCompany?: string
  /** Exact property address the tenant is registering for */
  preferredPropertyAddress?: string
  /** Preferred checkout provider chosen on invite claim */
  preferredPaymentMethod?: PaymentProvider
  /**
   * Occupancy preference from Start Application.
   * Legacy aliases: `full_rent` → entire home, `roommates` → open to roommates.
   */
  preferredOccupancyMode?: PreferredOccupancyMode
  /** Specific bedroom the applicant selected (furnished placements) */
  preferredBedroomId?: string
  /** Specific bed the applicant selected (per-bed furnished placements) */
  preferredBedId?: string
  /** Phones invited as potential roommates at application */
  roommateInvitePhones?: string[]
  phone?: string
  /** Claimed via streamlined invite link (no password signup) */
  inviteClaimed?: boolean
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
   * Applicant preference preserved after acceptance (dashboard status tags).
   * Prefer this for tags when set; otherwise derive from occupancyArrangement.
   */
  preferredOccupancyMode?: PreferredOccupancyMode
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
  /** Drawn signature image (PNG data URL) from portal sign pad */
  clientSignatureImage?: string
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
  /**
   * Uploaded signed or custom lease that replaces the generated draft in
   * Lease Agreement Preview (and portal review when present).
   */
  replacementDocumentFileId?: string
  replacementDocumentName?: string
  replacementDocumentMimeType?: string
  /**
   * Active lease agreement template style (from Lease Agreement Templates library).
   * Restyling updates these fields only — tenant details and signatures are preserved.
   */
  leaseTemplateId?: string
  /** Display name of the applied template style */
  leaseStyleName?: string
  /** Monotonic lease version; increments when a sent lease is revised */
  leaseVersion?: number
  /** Prior delivered versions superseded by edits after send */
  versionHistory?: LeaseVersionSnapshot[]
}

/** Uploaded PDF/DOC that defines default lease visual style / format. */
export type LeaseAgreementTemplateStatus = 'pending_review' | 'active' | 'archived'

export interface LeaseAgreementTemplate {
  id: string
  name: string
  originalFileName: string
  mimeType: string
  /** Project-file style id under the templates upload bucket */
  fileId: string
  storedName: string
  size: number
  status: LeaseAgreementTemplateStatus
  createdAt: string
  confirmedAt?: string
  /** Short label shown on styled lease previews */
  styleLabel: string
}

/** Banner prompt after a new default lease style is confirmed. */
export interface LeaseStyleReplacePrompt {
  templateId: string
  templateName: string
  confirmedAt: string
  /** When landlord dismisses the animated replace tag without applying */
  dismissedAt?: string
  /** Surfaces that still need the prompt (cleared individually) */
  showOnPending?: boolean
  showOnContracts?: boolean
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
  /** When the tenant submitted Start Application / invite claim (sort key for Waiting to Connect) */
  applicationSubmittedAt?: string
  /** Preferred lease term chosen at registration */
  preferredLeaseMonths?: number
  /** Requested lease start date (YYYY-MM-DD) */
  preferredLeaseStartDate?: string
  /** Landlord / agency the tenant selected at registration */
  preferredLandlordCompany?: string
  /** Property address the tenant entered at registration */
  preferredPropertyAddress?: string
  preferredPaymentMethod?: PaymentProvider
  phone?: string
  /** Occupancy preference from Start Application */
  preferredOccupancyMode?: PreferredOccupancyMode
  /** Specific bedroom selected on a furnished application */
  preferredBedroomId?: string
  /** Specific bed selected on a furnished application */
  preferredBedId?: string
  /** Friend phones the applicant invited to share the rental */
  roommateInvitePhones?: string[]
  /** Count of roommate invite phones with digits (friends invited) */
  roommateInviteCount?: number
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
  preferredOccupancyMode?: PreferredOccupancyMode
  preferredBedroomId?: string
  preferredBedId?: string
  occupancyArrangement?: OccupancyArrangement
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
  /** Unlinked tenants: true after agency + property application is submitted */
  applicationSubmitted?: boolean
  /** Submitted application details (unlinked + applied only) */
  application?: {
    name: string
    email: string
    preferredLandlordCompany: string | null
    preferredPropertyAddress: string | null
    preferredLeaseMonths: number | null
    preferredLeaseStartDate: string | null
    preferredPaymentMethod?: PaymentProvider | null
    preferredOccupancyMode?: PreferredOccupancyMode | null
    preferredBedroomId?: string | null
    preferredBedId?: string | null
    roommateInvitePhones?: string[]
  } | null
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
  | 'contract_signed'
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

/** Whether a bedroom is offered as a private room or shared among tenants. */
export type BedroomPrivacy = 'private' | 'shared'

/** One bedroom with one or more physical beds. */
export interface PropertyBedroom {
  id: string
  /** Display label, e.g. "Bedroom 1" */
  label: string
  /**
   * Landlord-set privacy for this room.
   * Defaults to `shared` when omitted (multiple placements / roommates possible).
   */
  privacy?: BedroomPrivacy
  beds: PropertyBed[]
}

/**
 * How total monthly rent is allocated for a rental.
 * Room and person are always available; bed is only offered when furnished.
 */
export type PropertyPricingStructure = 'room' | 'person' | 'bed'

export const PROPERTY_PRICING_STRUCTURES: PropertyPricingStructure[] = [
  'room',
  'person',
  'bed',
]

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
  /** Whether the rental includes furniture (asked first when setting up). */
  furnished?: boolean
  /**
   * Pricing structure chosen at setup: by room, by person, or by bed (furnished only).
   */
  pricingStructure?: PropertyPricingStructure
  /** Security deposit amount when the landlord requires one (omit when none). */
  depositAmount?: number
  /**
   * Whether utilities are included in the total monthly rent.
   * Shown to tenants in the address dropdown (and noted when not included).
   */
  utilitiesIncluded?: boolean
  /**
   * When true, this rental is offered only as an entire-home placement
   * (no roommate / per-bed / per-room applicant selection).
   */
  entireHomeOnly?: boolean
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
  /**
   * Default lease calendar option for this rental (`seasonal-12`, custom era id, etc.).
   * Used when adding tenants / generating leases for this address.
   */
  defaultLeaseOptionId?: string
}

export type TenantDiscoveryMode = 'public' | 'invite_only'

/** Landlord-defined custom lease start/end window (a “lease era”). */
export interface CustomLeaseEra {
  id: string
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD */
  endDate: string
  /** Optional display label; otherwise derived from dates */
  label?: string
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
   * Optional convenience: when true, newly generated lease drafts are sent to the
   * tenant automatically once generation finishes. Default is false — landlords
   * review via Review & Send Lease before delivery.
   */
  autoSendLeaseDrafts?: boolean
  /**
   * @deprecated Prefer customLeaseEras. When true without eras, newly generated leases
   * use defaultLeaseStartDate / defaultLeaseEndDate instead of seasonal defaults.
   */
  customDefaultLeaseDates?: boolean
  /** @deprecated Prefer customLeaseEras — YYYY-MM-DD legacy single custom start */
  defaultLeaseStartDate?: string
  /** @deprecated Prefer customLeaseEras — YYYY-MM-DD legacy single custom end */
  defaultLeaseEndDate?: string
  /**
   * Landlord-defined lease eras (custom start/end windows) offered alongside
   * seasonal Jan 1 / Aug 1 length options in Settings and rental/tenant pickers.
   */
  customLeaseEras?: CustomLeaseEra[]
  profileReminders?: ProfileReminder[]
  automation?: AutomationSettings
  /** Named rental groups used to filter leases and rentals by location */
  contractRegions?: ContractRegion[]
  /**
   * How tenants find this landlord:
   * - public: searchable by agency name at signup
   * - invite_only: tenants must use a connection link or code
   */
  tenantDiscoveryMode?: TenantDiscoveryMode
  /** Default lease agreement template from the Lease Agreement Templates library */
  defaultLeaseTemplateId?: string
  /** Display name of the active default template */
  defaultLeaseTemplateName?: string
  /** After confirming a new template — drives animated replace tags until dismissed/applied */
  leaseStyleReplacePrompt?: LeaseStyleReplacePrompt | null
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
