/**
 * One-shot product overview PDF for Leased Initiative.
 * Run: node scripts/generate-product-overview-pdf.mjs
 */
import { jsPDF } from 'jspdf'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'docs', 'Leased-Initiative-Product-Overview.pdf')

const ink = [17, 17, 17]
const muted = [90, 90, 90]
const faint = [130, 130, 130]
const rule = [200, 200, 200]
const brand = [45, 95, 75]

const doc = new jsPDF({ unit: 'pt', format: 'letter' })
const pageW = doc.internal.pageSize.getWidth()
const pageH = doc.internal.pageSize.getHeight()
const marginX = 54
const contentW = pageW - marginX * 2
const bottomSafe = 52
let y = 0
let pageNum = 1

function footer() {
  doc.setDrawColor(...rule)
  doc.setLineWidth(0.6)
  doc.line(marginX, pageH - 36, pageW - marginX, pageH - 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...faint)
  doc.text('Leased Initiative — Product Overview', marginX, pageH - 22)
  doc.text(String(pageNum), pageW - marginX, pageH - 22, { align: 'right' })
}

function newPage() {
  footer()
  doc.addPage()
  pageNum += 1
  y = 56
}

function ensureSpace(needed) {
  if (y + needed > pageH - bottomSafe) newPage()
}

function wrap(text, fontSize, fontStyle = 'normal', maxW = contentW) {
  doc.setFont('helvetica', fontStyle)
  doc.setFontSize(fontSize)
  return doc.splitTextToSize(text, maxW)
}

function addParagraph(text, { size = 10.5, style = 'normal', color = muted, leading = 14, gapAfter = 10 } = {}) {
  const lines = wrap(text, size, style)
  ensureSpace(lines.length * leading + gapAfter)
  doc.setFont('helvetica', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
  doc.text(lines, marginX, y)
  y += lines.length * leading + gapAfter
}

function addHeading(text, { size = 16, gapBefore = 18, gapAfter = 8 } = {}) {
  ensureSpace(size + gapBefore + gapAfter + 8)
  y += gapBefore
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  doc.setTextColor(...ink)
  doc.text(text, marginX, y)
  y += size * 0.35 + gapAfter
  doc.setDrawColor(...brand)
  doc.setLineWidth(1.5)
  doc.line(marginX, y, marginX + 36, y)
  y += 12
}

function addSubheading(text) {
  ensureSpace(28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...ink)
  doc.text(text, marginX, y)
  y += 16
}

function addBullet(title, body) {
  const titleLines = wrap(title, 10.5, 'bold', contentW - 16)
  const bodyLines = wrap(body, 10, 'normal', contentW - 16)
  const blockH = titleLines.length * 13 + bodyLines.length * 13 + 10
  ensureSpace(blockH)
  doc.setFillColor(...brand)
  doc.circle(marginX + 3, y - 3, 2.2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...ink)
  doc.text(titleLines, marginX + 14, y)
  y += titleLines.length * 13
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...muted)
  doc.text(bodyLines, marginX + 14, y)
  y += bodyLines.length * 13 + 10
}

function addFlowStep(n, text) {
  const lines = wrap(text, 10, 'normal', contentW - 28)
  ensureSpace(lines.length * 13 + 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...brand)
  doc.text(`${n}.`, marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...muted)
  doc.text(lines, marginX + 18, y)
  y += lines.length * 13 + 8
}

// ── Cover / intro ─────────────────────────────────────────────
y = 72
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...brand)
doc.text('PRODUCT OVERVIEW', marginX, y)
y += 28

doc.setFont('helvetica', 'bold')
doc.setFontSize(28)
doc.setTextColor(...ink)
doc.text('Leased Initiative', marginX, y)
y += 28

doc.setFont('helvetica', 'normal')
doc.setFontSize(13)
doc.setTextColor(...muted)
const tagline = wrap(
  'Landlord and tenant management for the full lease lifecycle — from sign-up and approvals to signed leases, rent, and maintenance.',
  13
)
doc.text(tagline, marginX, y)
y += tagline.length * 18 + 18

doc.setDrawColor(...rule)
doc.setLineWidth(0.8)
doc.line(marginX, y, pageW - marginX, y)
y += 22

addParagraph(
  'Leased Initiative is a dual-sided rental operations app. Landlords run properties, applicants, lease agreements, payments, and maintenance alerts from a studio workspace. Tenants use a portal to apply, sign leases, pay rent and deposits, share files, request maintenance, and follow their timeline.',
  { size: 11, color: ink, leading: 15, gapAfter: 14 }
)

addParagraph(
  'This document describes exactly what the product does today, based on the live product surfaces: welcome carousel, onboarding tour, and in-app workflows.',
  { size: 10, gapAfter: 6 }
)

// ── Who it’s for ──────────────────────────────────────────────
addHeading('Who it serves')
addBullet(
  'Landlords / property managers',
  'Manage rentals, invite or discover tenants, draft and finalize leases, track official tenants and payment status, message overdue renters, and review maintenance alerts.'
)
addBullet(
  'Tenants',
  'Apply to a landlord (by invite or public discovery), review and sign leases, pay deposits and rent through PayPal, Stripe, or Square, upload documents, request maintenance, and track due dates and milestones.'
)

// ── Core lifecycle ────────────────────────────────────────────
addHeading('Core lease lifecycle')
addParagraph(
  'The product follows tenants from first contact through an active lease:',
  { gapAfter: 8 }
)
addFlowStep(1, 'Tenant finds the landlord (Public Discovery) or opens a one-time invite link/code (Invite-Only).')
addFlowStep(2, 'Tenant confirms rental details or starts an application: choose company, address, occupancy preference, and (for furnished homes) bed/room.')
addFlowStep(3, 'Applicant appears under Waiting to Connect with occupancy preference tags and roommate-invite counts.')
addFlowStep(4, 'Landlord accepts & drafts a lease → Pending Tenants (Lease Drafted). Preview, download, upload replacement, then send — or auto-send drafted leases.')
addFlowStep(5, 'Tenant reviews and signs electronically. Deposit invoice is auto-sent with a payment link.')
addFlowStep(6, 'Tenant moves to Official Tenants as Awaiting Deposit → Confirm Payment Complete → Upcoming until lease start → Active during the term.')

// ── Landlord capabilities ─────────────────────────────────────
addHeading('What landlords can do')

addSubheading('Tenants & Waiting (dashboard)')
addBullet(
  'Official Tenants',
  'See signed tenants with lease status tags (Active / Upcoming / Awaiting Deposit) and payment status tags (On Time / Overdue / Deposit Paid / Awaiting Deposit). Use Spreadsheet or Tile view, resize tiles, edit columns, Show Arrangements for an Arrangement column beside Tenant with Sole/Co-Tenant status and a per-bedroom roster (occupants or Vacant), and open Tenant Details from a name.'
)
addBullet(
  'Waiting to Connect',
  'Review new applicants, occupancy preferences (Entire Home, Open to Roommates, Private/Shared Room), and Accept & Draft Lease.'
)
addBullet(
  'Pending Tenants',
  'Manage drafted/sent leases: Lease Agreement Preview, Download draft, Upload Replacement, Send, optional auto-send, and Change Lease Style to restyle pending agreements from templates without clearing tenant details or forcing re-sign.'
)

addSubheading('Rentals')
addBullet(
  'Add and manage properties',
  'Furnished or unfurnished, pricing by room/person/bed, deposit, utilities, entire-home-only, bedrooms/privacy, bed sizes, total monthly rent, and calculated max occupancy. Color-coded occupancy; expand occupants and open Tenant Details.'
)
addBullet(
  'Views & filters',
  'Mobile tiles; desktop Tile or Spreadsheet with rental tile size, Edit Columns, and filters by State, Town, and Group (including map radius).'
)
addBullet(
  'Upcoming Openings',
  'Rows for units becoming available with Send Re-sign Message for current tenants or Generate Invite Code for a new tenant.'
)
addBullet(
  'Invite links',
  'Send Invite Link: pick property, future lease start, duration, and custom code — texted to the tenant’s phone.'
)

addSubheading('Lease agreements')
addBullet(
  'Lease drafting & tracking',
  'Draft, send, and track leases with Sent / Signed status and term progress. Filter by lease status, progress, state, area code, or group. Tile or Spreadsheet view with lease tile sizing and Edit Columns.'
)
addBullet(
  'Lease Agreement Templates',
  'In Settings, upload a sample PDF/DOC lease style, view a sample with a pending tenant, confirm as default, then Apply to All (or selected leases) to restyle pending agreements while keeping rent, personal info, and signatures.'
)

addSubheading('Payments & messaging')
addBullet(
  'Payments board',
  'Each tile shows unit rent, tenant monthly share (equal roommate split or custom), paid vs remaining, next due date, and status. Resize tiles; filter Overdue Rent, Paid Early, or payment method (Stripe, PayPal, Square).'
)
addBullet(
  'Smart messaging',
  'Send Message to Tenant from a payment tile with a template or custom note; replies stay on the landlord’s phone.'
)

addSubheading('Tenant Alerts & settings')
addBullet(
  'Tenant Alerts',
  'Maintenance requests with required photos land in Tenant Alerts (top nav / Menu) for review and dispatch.'
)
addBullet(
  'Company Profile & Settings',
  'Company profile, lease import (queue files → Scan → confirm → invite by email/text), business info, automation, lease default dates/seasons/eras, app style, Public Discovery vs Invite-Only, tour, and bug report.'
)

// ── Tenant capabilities ───────────────────────────────────────
addHeading('What tenants can do')
addBullet(
  'Tenant portal & application',
  'Open an invite link/code for a pre-filled confirmation, or Start Application: choose landlord company, available address (furnished status, total rent, cost at full occupancy, utilities), occupancy preference, and furnished bed/room when applicable.'
)
addBullet(
  'Review & sign leases',
  'Open sent lease agreements, review terms, and sign by drawing a signature. Both parties are notified; deposit invoice appears with PayPal, Stripe, or Square link.'
)
addBullet(
  'Pay rent',
  'See next due date; Pay Rent (or pay several consecutive months when the lease allows) via PayPal, Stripe, or Square.'
)
addBullet(
  'Reminders & documents',
  'Receive overdue rent texts from the landlord and pay anytime from the portal. Upload files/notes and follow lease milestones on the dashboard timeline (also on Timeline).'
)
addBullet(
  'Request Maintenance',
  'Pick a household problem, attach a required photo, optionally add a note, and notify the landlord under Tenant Alerts.'
)

// ── Demo ──────────────────────────────────────────────────────
addHeading('Demo mode')
addParagraph(
  'Hosts can share an access code or company demo link. From the homepage Quick Access (key icon), enter a code — optionally add a first name to personalize mock messages — confirm Start Demo, and choose landlord or a tenant scenario. Switch POV anytime from bottom-right controls; demo changes are not saved.',
  { gapAfter: 8 }
)

// ── Summary grid ──────────────────────────────────────────────
addHeading('At a glance')
const caps = [
  ['Verify & accept tenants', 'Review sign-ups and move applicants into the lease pipeline.'],
  ['Draft & finalize leases', 'Generate documents, send for e-signature, restyle from templates.'],
  ['Unified tenant dashboard', 'Official, pending, and waiting queues with status tags in one place.'],
  ['Schedule & track payments', 'Due dates, balances, overdue focus, and payment methods.'],
  ['Smart tenant messaging', 'One-time rent messages; replies stay on your phone.'],
  ['Request maintenance', 'Photo-backed tenant requests; landlord alerts inbox.'],
  ['Import property records', 'Upload leases, extract details, confirm, invite existing tenants.'],
  ['Track rentals & openings', 'Occupancy, availability color-coding, upcoming vacancies.'],
  ['Invite & connect', 'Invite links/codes or public discovery by agency name.'],
]
for (const [t, b] of caps) addBullet(t, b)

ensureSpace(40)
y += 8
doc.setDrawColor(...rule)
doc.setLineWidth(0.8)
doc.line(marginX, y, pageW - marginX, y)
y += 18
addParagraph(
  'Leased Initiative — Aspen Creative Solutions. Create an account to get started, or explore with a host access code or company demo link.',
  { size: 9.5, color: faint, gapAfter: 0 }
)

footer()
mkdirSync(dirname(outPath), { recursive: true })
doc.save(outPath)
console.log(`Wrote ${outPath}`)
