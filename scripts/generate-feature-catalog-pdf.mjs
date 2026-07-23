/**
 * Capture feature screenshots and build Leased-Initiative-Feature-Catalog.pdf
 * Usage: node scripts/generate-feature-catalog-pdf.mjs
 */
import { chromium } from 'playwright'
import { jsPDF } from 'jspdf'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SHOTS = join(ROOT, 'docs/feature-catalog-shots')
const OUT_PDF = join(ROOT, 'Leased-Initiative-Feature-Catalog.pdf')
const BASE = process.env.CATALOG_BASE_URL || 'http://127.0.0.1:3021'
const BROWSERS = join(ROOT, '.playwright-browsers')

mkdirSync(SHOTS, { recursive: true })

async function dismissTour(page) {
  const skip = page.getByRole('button', { name: /skip tour/i })
  try {
    if (await skip.isVisible({ timeout: 2500 })) {
      await skip.click()
      await page.waitForTimeout(400)
    }
  } catch {
    /* no tour */
  }
}

async function login(page, path, email, password) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 20000 })
  await page.waitForTimeout(800)
  await dismissTour(page)
}

async function shot(page, name, opts = {}) {
  const file = join(SHOTS, `${name}.png`)
  await page.waitForTimeout(opts.settle ?? 600)
  await page.screenshot({
    path: file,
    fullPage: opts.fullPage ?? false,
    animations: 'disabled',
  })
  console.log('  shot', name)
  return file
}

async function captureScreenshots() {
  console.log('Launching browser…')
  const browser = await chromium.launch({
    headless: true,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS },
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  })
  const page = await context.newPage()

  // Mark welcome carousel done so it does not block
  await page.addInitScript(() => {
    try {
      localStorage.setItem('leased-welcome-carousel-done', '1')
    } catch {
      /* ignore */
    }
  })

  console.log('Public…')
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await shot(page, '01-home')

  await page.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  // If carousel still shows, try dismissing / picking role
  const landlordBtn = page.getByRole('button', { name: /landlord/i }).first()
  try {
    if (await landlordBtn.isVisible({ timeout: 1500 })) {
      await landlordBtn.click().catch(() => {})
    }
  } catch {
    /* ok */
  }
  await shot(page, '02-welcome')

  console.log('Landlord…')
  await login(page, '/studio/login', 'landlord@leased.test', 'landlord@leased.test')
  await page.goto(`${BASE}/studio`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  // Hide Admin Mode FAB for cleaner catalog shots
  await page.addStyleTag({ content: '[class*="AdminMode"], button:has-text("Admin") { display: none !important; }' }).catch(() => {})
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach((b) => {
      if ((b.textContent || '').trim() === 'Admin') b.style.display = 'none'
    })
  })

  await shot(page, '10-landlord-dashboard', { settle: 1000 })

  await page.goto(`${BASE}/studio/properties`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '11-landlord-rentals', { settle: 900 })

  await page.goto(`${BASE}/studio/contracts`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '12-landlord-contracts', { settle: 900 })

  await page.goto(`${BASE}/studio/payments`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '13-landlord-payments', { settle: 900 })

  await page.goto(`${BASE}/studio/payments?status=overdue`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '14-landlord-payments-overdue', { settle: 900 })

  await page.goto(`${BASE}/studio/alerts`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '15-landlord-alerts', { settle: 800 })

  await page.goto(`${BASE}/studio/profile`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '16-landlord-profile', { settle: 900 })

  await page.goto(`${BASE}/studio/settings`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '17-landlord-settings', { settle: 800 })

  // Sign out landlord
  const signOut = page.getByRole('button', { name: /sign out/i }).or(page.getByRole('link', { name: /sign out/i }))
  try {
    if (await signOut.first().isVisible({ timeout: 2000 })) {
      await signOut.first().click()
      await page.waitForTimeout(600)
    }
  } catch {
    await context.clearCookies()
  }

  console.log('Tenant…')
  // Active signed tenant — shows Pay Rent, leases, documents
  await login(page, '/login', 'active@leased.test', 'active@leased.test')
  await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '20-tenant-dashboard', { settle: 1000 })

  await page.goto(`${BASE}/portal/timeline`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '21-tenant-timeline', { settle: 800 })

  await page.goto(`${BASE}/portal/report`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '22-tenant-report', { settle: 800 })

  await page.goto(`${BASE}/portal/profile`, { waitUntil: 'networkidle' })
  await dismissTour(page)
  await shot(page, '23-tenant-profile', { settle: 800 })

  console.log('Demo POV…')
  await context.clearCookies()
  await page.goto(`${BASE}/demo/pov`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, '30-demo-pov', { settle: 600 })

  await browser.close()
  console.log('Screenshots done.')
}

function buildPdf() {
  console.log('Building PDF…')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 50
  const marginR = 50
  const marginT = 52
  const marginB = 52
  const contentW = pageW - marginL - marginR
  let y = marginT
  let pageNum = 1

  const LINE = 12
  const GAP_AFTER_BLOCK = 6

  function addFooter() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('Leased Initiative — Feature Catalog', marginL, pageH - 26)
    doc.text(String(pageNum), pageW - marginR, pageH - 26, { align: 'right' })
    doc.setTextColor(0)
  }

  function newPage() {
    addFooter()
    doc.addPage()
    pageNum += 1
    y = marginT
  }

  /** Ensure `needed` points of free space below current y; page-break if not. */
  function ensureSpace(needed) {
    if (y + needed > pageH - marginB) newPage()
  }

  function h1(text) {
    // Major sections always start on a fresh page (except right after cover/toc)
    if (y > marginT + 8) newPage()
    ensureSpace(44)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(20, 30, 40)
    doc.text(text, marginL, y + 14)
    y += 20
    doc.setDrawColor(30, 60, 90)
    doc.setLineWidth(1.25)
    doc.line(marginL, y, marginL + 100, y)
    y += 16
  }

  function h2(text) {
    ensureSpace(36)
    y += 10
    ensureSpace(26)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(25, 55, 85)
    const lines = doc.splitTextToSize(text, contentW)
    for (const line of lines) {
      ensureSpace(LINE + 2)
      doc.text(line, marginL, y)
      y += LINE + 2
    }
    y += 4
  }

  function h3(text) {
    ensureSpace(28)
    y += 8
    ensureSpace(18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(40, 75, 55)
    const lines = doc.splitTextToSize(text, contentW)
    for (const line of lines) {
      ensureSpace(LINE)
      doc.text(line, marginL, y)
      y += LINE
    }
    y += 3
  }

  function para(text) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(40)
    const lines = doc.splitTextToSize(text, contentW)
    for (const line of lines) {
      ensureSpace(LINE)
      doc.text(line, marginL, y)
      y += LINE
    }
    y += GAP_AFTER_BLOCK
  }

  function bullet(text, indent = 0) {
    const x = marginL + indent
    const maxW = contentW - indent - 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(35)
    const lines = doc.splitTextToSize(text, maxW)
    ensureSpace(lines.length * LINE + 4)
    doc.setFillColor(35, 70, 100)
    doc.circle(x + 2.5, y - 2.5, 1.5, 'F')
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) ensureSpace(LINE)
      doc.text(lines[i], x + 12, y)
      y += LINE
    }
    y += 2
  }

  function img(filename, caption) {
    const path = join(SHOTS, filename)
    if (!existsSync(path)) {
      bullet(`[Screenshot unavailable: ${filename}]`)
      return
    }
    const maxImgH = 300
    const maxImgW = contentW
    const dataUrl = `data:image/png;base64,${readFileSync(path).toString('base64')}`
    const props = doc.getImageProperties(dataUrl)
    let w = maxImgW
    let h = (props.height * w) / props.width
    if (h > maxImgH) {
      h = maxImgH
      w = (props.width * h) / props.height
    }
    ensureSpace(h + 28)
    y += 8
    ensureSpace(h + 22)
    doc.addImage(dataUrl, 'PNG', marginL, y, w, h, undefined, 'FAST')
    y += h + 6
    if (caption) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(90)
      const caps = doc.splitTextToSize(caption, contentW)
      for (const c of caps) {
        ensureSpace(10)
        doc.text(c, marginL, y)
        y += 10
      }
      doc.setTextColor(35)
    }
    y += 8
  }

  // —— Cover ——
  doc.setFillColor(22, 42, 64)
  doc.rect(0, 0, pageW, pageH, 'F')
  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('Leased Initiative', marginL, 220)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('Complete Feature Catalog', marginL, 250)
  doc.setDrawColor(180, 200, 220)
  doc.setLineWidth(1)
  doc.line(marginL, 268, marginL + 180, 268)
  doc.setFontSize(11)
  doc.text('Organized by role and use — with screenshots', marginL, 292)
  doc.setFontSize(10)
  doc.setTextColor(190, 205, 220)
  doc.text('Generated July 23, 2026', marginL, 320)
  doc.text('Landlord Studio · Tenant Portal · Public · Demo', marginL, 338)
  addFooter()

  // —— TOC ——
  doc.addPage()
  pageNum = 2
  y = marginT
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 30, 40)
  doc.text('Contents', marginL, y + 14)
  y += 36
  const toc = [
    '1. Product overview & roles',
    '2. Landlord / Studio Admin',
    '3. Tenant / Portal',
    '4. Public / Marketing',
    '5. Demo (host access)',
    '6. Admin Mode (internal tooling)',
    '7. Cross-cutting capabilities',
    '8. Route map',
  ]
  for (const t of toc) {
    ensureSpace(14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(40)
    doc.text(t, marginL, y)
    y += 16
  }

  // —— 1 ——
  h1('1. Product overview & roles')
  para(
    'Leased Initiative is a rental management platform. Landlords work in the Studio workspace (/studio). Tenants work in the Portal (/portal). Public marketing, Terms, welcome onboarding, and host-driven demos sit outside authenticated product areas.'
  )
  h3('Roles')
  bullet('Landlord / Studio Admin (role: admin) — portfolio, tenants, leases, payments, alerts, company profile, settings')
  bullet('Tenant / Portal (role: client) — registration, lease review/sign, rent & deposit payment, files, repairs, timeline, profile')
  bullet('Public / Marketing — homepage, welcome/role select, Terms of Service, style chooser')
  bullet('Demo (public host session) — access code or company demo link; landlord or tenant POV; changes not saved')
  bullet('Admin Mode (internal / QA) — mock users, scenarios, reseed, demo codes; enabled in DEV or via VITE_ADMIN_MODE')

  // —— 2 LANDLORD ——
  h1('2. Landlord / Studio Admin')

  h2('2.1 Auth, welcome & tour')
  h3('Authentication')
  bullet('Studio register: company name (immutable after signup), email, password')
  bullet('Email verification flow (check-email / verify-email)')
  bullet('Studio login')
  bullet('Sign out (also exits an active public demo session)')
  h3('Welcome carousel (landlord track)')
  bullet('Your landlord workspace — registrations, lease statuses, filters, openings')
  bullet('Rentals and lease import — portfolio fields, occupancy tiles, Display Settings, Company Profile import')
  bullet('Approve new tenants — Waiting to Connect, Accept, Add Tenant, lease status pipeline')
  bullet('Upcoming openings — re-sign messages and invite codes from Rentals')
  bullet('Overdue rent messaging — payment tiles, filters, SMS templates')
  bullet('Tenant Alerts — photo repair/concern reports')
  bullet('Shared slides: revisit Tour anytime; try product demo; ready to begin')
  h3('In-app Tour')
  bullet('Restart from nav Tour button anytime')
  bullet('Section jump bar: Dashboard, Rentals, Lease Agreements, Payments, Tenant Alerts')
  bullet('Walkthrough covers pipeline, rentals, openings, leases, payments/overdue, alerts, profile import, and settings')

  h2('2.2 Navigation & global actions')
  bullet('Primary nav: Dashboard, Rentals, Lease Agreements, Payments, Tenant Alerts')
  bullet('Settings, Tour restart, Company Profile (company name), Sign out')
  bullet('Tenant shortcuts: View New Registers (pending badge), Send Invite Link, Add Tenant')
  bullet('Rentals nav: available-rentals indicator when vacant openings exist')
  bullet('Tenant Alerts nav: unread count badge')

  h2('2.3 Dashboard & tenant pipeline')
  img('10-landlord-dashboard.png', 'Landlord Dashboard — Official Tenants, Waiting to Connect, and Pending Tenants')
  h3('Official Tenants')
  bullet('Table of signed leases that are active or starting soon')
  bullet('Sort by Date Became Official; Address (A–Z), or focus by state / region / specific rental')
  bullet('Edit Column Arrangement (drag reorder): Name, Email, Address, Lease Status, Payment Status; Actions pinned')
  bullet('Address column location display modes: street / city / state / zip / full')
  bullet('Lease Status badges with pipeline labels')
  bullet('Payment Status tags: last payment (check + hover date/provider) and next-due countdown; deep-link to Payments')
  bullet('Row actions open tenant profile; empty state prompts Add Tenant')
  h3('Waiting to Connect')
  bullet('New registrations awaiting landlord approval')
  bullet('Accept → moves to Pending Tenants; Dismiss')
  bullet('List vs gallery view toggle')
  bullet('Rental availability badges for applicant’s property')
  bullet('Tenant marker badges and help tooltips')
  h3('Pending Tenants')
  bullet('Accepted, manually added, or imported tenants awaiting a signed lease')
  bullet('Lease actions: Draft / Generating (live poll) / Send / Resend / Preview')
  bullet('Status markers such as Lease Sent')
  bullet('Open Send Lease Agreement modal')
  h3('Other dashboard UX')
  bullet('Hash deep-links to dashboard sections')
  bullet('Auto-refresh when admin notification count rises')

  h2('2.4 Rentals & upcoming openings')
  img('11-landlord-rentals.png', 'Rentals — portfolio tiles, occupancy, and Upcoming Openings')
  h3('Portfolio management')
  bullet('List of rentals feeding signup, invites, leases, openings, and payments')
  bullet('+ Add Rental: address autocomplete/confirm, rental type, bedrooms, max tenants, units; monthly rent per unit')
  bullet('Housing types: Apartment, Condo, Single-Family Home, Townhouse, Duplex, Triplex, Fourplex, Multi-Family, Studio, Loft, Basement/ADU, Vacation Rental')
  bullet('Search by address or type; secondary rental-type select')
  h3('Display Settings')
  bullet('Tile vs Spreadsheet view (persisted)')
  bullet('Tile size scale')
  bullet('Filter By: All Rentals + type chips for types in the portfolio')
  bullet('Location filters: Property State, Group (+ Edit Groups)')
  bullet('Showing X of Y when filtered')
  h3('Tile & spreadsheet views')
  bullet('Tiles: address, type, monthly rent, occupancy, per-tenant share, beds tag, interest cue, occupancy color (dark red → green)')
  bullet('Spreadsheet: sortable address, type, bedrooms, max tenants, occupancy, open units, monthly rent, tenant share')
  h3('Details & openings')
  bullet('Highlight deep-link (?highlight=) with scroll/flash')
  bullet('Details modal: rent/pricing, open units, official tenants with lease status/dates, profile links')
  bullet('Upcoming Openings: vacant / opening soon / ending / renewal rows')
  bullet('Select opening → re-sign message or generate invite code/link; copy link')

  h2('2.5 Groups & location filters')
  bullet('Edit Groups: named rental groups combining states, area codes, and/or map radius')
  bullet('Filter rentals and lease agreements by group / state / area code / map radius')

  h2('2.6 Tenant lifecycle & profiles')
  h3('Inviting & adding tenants')
  bullet('Send Invite: generate invite link, copy, create another')
  bullet('Add Tenant: name, email, phone, property, January/August or scheduled start, lease length; auto-generates lease draft')
  bullet('Invite-aware tenant registration path')
  h3('Tenant profile (/studio/clients/:id)')
  bullet('Edit client; open/edit lease; lease PDF; delete or view lease')
  bullet('Email mailto; quick note; mark follow-up complete; remove client')
  bullet('Important dates & deadlines; profile notes')
  bullet('Lease CTAs: Draft, Send, View/Edit, Resend, Revise')

  h2('2.7 Lease agreements')
  img('12-landlord-contracts.png', 'Lease Agreements — status badges, term progress, Display Settings')
  h3('Portfolio (/studio/contracts)')
  bullet('All lease agreements with term progress')
  bullet('Display Settings: Tile (default) / Spreadsheet; tile size; Filter')
  bullet('Status filters: Signed, Sent, Active, Not Started, Draft in Progress, Generated, Completed, Cancelled')
  bullet('Location: Property State, Area Code, Group (+ Edit Groups)')
  bullet('Tiles: tenant name; Sent/Signed/Active badges with hover dates; address → map; Month X of Y timeline; Open; Delete')
  bullet('Spreadsheet: sort by tenant, address, status, duration, progress; delete')
  h3('Contract editor (/studio/clients/:id/contract)')
  bullet('Multi-step residential lease form (dates, costs, deposit, schedule, late policy, signatures, and more)')
  bullet('Payment provider: PayPal / Stripe / Square')
  bullet('Allow prepaid / multi-month rent toggle')
  bullet('Save Draft; Review & Generate PDF; download PDF; Send / Resend to Tenant')
  bullet('SendContractModal: portal send (primary) or email fallback')

  h2('2.8 Payments & overdue messaging')
  img('13-landlord-payments.png', 'Payments — unit rent, tenant share, due dates, payment method badges')
  img('14-landlord-payments-overdue.png', 'Payments filtered to Overdue Rent — Send Message to Tenant')
  bullet('Official-tenant payment tiles: name, address, unit rent, tenant share, paid vs remaining, status')
  bullet('Date meta: last paid, next due, countdown, final due, lease ends')
  bullet('Paid Early badge; payment method logos (Stripe / PayPal / Square)')
  bullet('Display Settings: tile size; Overdue Rent; Paid Early; Payment Method; URL ?status=overdue|paid_early')
  bullet('With Overdue on: Send Message — custom text or templates; Done opens device SMS; note logged on profile')

  h2('2.9 Tenant alerts (repairs)')
  img('15-landlord-alerts.png', 'Tenant Alerts — repair/concern reports with required photos')
  bullet('List of repair/concern reports from tenants')
  bullet('New badge, problem type, timestamp, tenant, address, note')
  bullet('Required photo with lightbox')
  bullet('Mark as read; View tenant (also marks read)')
  bullet('Unread counts in nav and header subtitle')

  h2('2.10 Company profile & lease import')
  img('16-landlord-profile.png', 'Company Profile — company details and Import existing leases')
  h3('Company Details')
  bullet('Registered company name; rental-type counts; Official / Pending / Waiting / All Renters')
  bullet('Filter lists by lease duration; explore grouped rentals/renters')
  h3('Import existing leases')
  bullet('Queue PDFs / images / spreadsheets; Scan Files')
  bullet('Review rows with confidence chips; confirm → create clients/contracts')
  bullet('Send invite by email or SMS; invite status tracking')
  h3('Account & legal')
  bullet('Login email (read-only), display name, change password (8+ characters)')
  bullet('Legal: Terms modal + link to /terms')

  h2('2.11 Settings')
  img('17-landlord-settings.png', 'Settings — Business Information, Automation, Lease Defaults, App Style')
  bullet('Tabs: Business Information; Client Automation; Lease Defaults; App Style')
  bullet('Business: company name (read-only), owner, email, phone, address, logo URL, lease header preview')
  bullet('Automation: enable; status updates; follow-up reminders; deadline window (1/3/7 days); email reminders')
  bullet('Lease defaults: seasonal Jan/Aug vs custom; payment terms; revision limit; lease footer')
  bullet('App Style: Graphite, Lab Ink Frame, Ocean Office, Slate Bureau; appearance toggle; live preview')

  // —— 3 TENANT ——
  h1('3. Tenant / Portal')

  h2('3.1 Auth, welcome & tour')
  bullet('Register: select agency + property; preferred lease length; password; optional invite token')
  bullet('Login; legacy /portal/login and /portal/register redirect')
  bullet('Email verification; sign out (demo-aware)')
  h3('Welcome carousel (tenant track)')
  bullet('Portal dashboard centered on next rent due')
  bullet('Review and sign lease agreements electronically')
  bullet('Pay rent anytime — multi-month upfront when allowed; PayPal, Stripe, or Square')
  bullet('SMS rent reminders from landlord; reply from phone')
  bullet('Share documents, Timeline milestones, invite-link join')
  bullet('Log Repairs or Concerns → landlord Tenant Alerts')
  h3('Portal Tour')
  bullet('Conditional steps: waiting for approval; Pay Rent; review/sign; deposit; files; Log Repairs; Timeline; notifications')

  h2('3.2 Dashboard & rent payment')
  img('20-tenant-dashboard.png', 'Tenant Portal dashboard — Pay Rent, leases, documents')
  bullet('Unlinked state: waiting for landlord approval')
  bullet('Linked: greeting; Lease Active CTA + Log Repairs')
  bullet('Rent payment schedule timeline')
  bullet('Pay Rent: next due; optional consecutive months; PayPal / Stripe / Square')
  bullet('Current lease agreements list + status')
  bullet('Deposit Invoice; Remaining Balance; Final Invoice')
  bullet('Share documents: upload files + optional note')
  bullet('Payment success return page (/portal/payment/success)')

  h2('3.3 Lease review & signing')
  bullet('Open lease at /portal/contracts/:id')
  bullet('Statuses: Pending Review → Viewed → Accepted')
  bullet('Mark reviewed; full ContractReviewView')
  bullet('Electronic signature + agree checkbox')

  h2('3.4 Documents, repairs & timeline')
  img('22-tenant-report.png', 'Log Repairs — problem type, required photo, optional note')
  img('21-tenant-timeline.png', 'Timeline — lease milestones')
  bullet('Problem types: plumbing, electrical, HVAC, appliance, pest, water damage, locks/security, structural, other')
  bullet('Required photo; optional note; submits to landlord Tenant Alerts')
  bullet('Timeline milestones: approval, lease, payment, project start, and more')
  bullet('In-app notifications and email reminders when automation is enabled')

  h2('3.5 Profile & style')
  img('23-tenant-profile.png', 'Tenant profile — account details and legal')
  bullet('Email (read-only); name & phone; change password')
  bullet('Legal: Terms modal + /terms')
  bullet('Nav: Appearance toggle; Choose Style; Dashboard; Timeline; profile')

  // —— 4 PUBLIC ——
  h1('4. Public / Marketing')
  img('01-home.png', 'Homepage — brand hero and feature tiles')
  img('02-welcome.png', 'Welcome / role select')
  h2('Homepage')
  bullet('Brand hero + tagline; landlord / tenant / demo framing')
  bullet('3×3 feature action tiles with hover descriptions')
  bullet('Sign in / Register → role paths')
  bullet('Quick Access (key icon): demo code; Style Chooser')
  bullet('Terms of Service entry points')
  h2('Welcome / Role select (/welcome)')
  bullet('First-visit WelcomeCarousel: role pick → feature slides → tour/demo/ready')
  bullet('Landlord vs Tenant tiles → login paths')
  h2('Terms of Service')
  bullet('Modal on homepage, welcome, and both profiles')
  bullet('Full page /terms')
  bullet('Sections: acceptance, service description, accounts, acceptable use, payment responsibilities, privacy, demo disclaimer, and more')

  // —— 5 DEMO ——
  h1('5. Demo (host access)')
  img('30-demo-pov.png', 'Demo POV picker — landlord or tenant scenarios')
  h2('Entry')
  bullet('Homepage Quick Access → host demo access code → Start Demo → /demo/pov')
  bullet('Company demo link (/demo/company/:token) with expiry messaging')
  h2('POV selection & session')
  bullet('Choose Landlord or Tenant; tenant cards show scenario, address, rent, payment status')
  bullet('Scenarios: awaiting approval, Sent, Active, overdue, roommate split, paid, and more')
  bullet('Public Demo POV Fab: Switch POV; Exit Demo; changes are not persisted')

  // —— 6 ADMIN ——
  h1('6. Admin Mode (internal tooling)')
  para('Shown when enabled in DEV or VITE_ADMIN_MODE=true via a floating panel. Not an end-user product role.')
  bullet('Enter core/edge mock users (landlord + tenant journey POVs); password = email')
  bullet('Run scenarios across dashboard, registrations, contracts, overdue, alerts, openings, settings, and tenant flows')
  bullet('Reseed demo data; optional re-login to same POV')
  bullet('Restart as first-time visitor (clears welcome carousel, resets themes, logout)')
  bullet('Manage/share demo access code; create company demo links')
  bullet('Expandable sections; busy/error/message feedback')

  // —— 7 CROSS ——
  h1('7. Cross-cutting capabilities')
  bullet('Welcome carousel with balanced landlord and tenant feature slides')
  bullet('Onboarding tour + section jump + Tour restart (Studio and Portal)')
  bullet('Tile vs Spreadsheet views + tile scale (Rentals, Lease Agreements; Payments tiles + scale)')
  bullet('Occupancy color coding on Rental tiles')
  bullet('Lease status badges (Sent / Signed / Active + hover dates)')
  bullet('Payment status tags + deep links from Official Tenants to Payments')
  bullet('Group filters + map radius (Rentals, Contracts)')
  bullet('Payment partners: PayPal, Stripe, Square')
  bullet('Multi-month prepaid rent when lease allows')
  bullet('On-device SMS for overdue rent and lease-import invites')
  bullet('Theme / App Style / Portal Style across Settings, homepage, and portal')
  bullet('Terms of Service on public, auth, and both profiles')
  bullet('Demo POV switching during public demo sessions')
  bullet('Email verification on registration')

  // —— 8 ROUTES ——
  h1('8. Route map')
  h3('Public')
  bullet('/ — Homepage')
  bullet('/welcome — Role select + welcome carousel')
  bullet('/terms — Terms of Service')
  bullet('/demo/pov — Demo POV picker')
  bullet('/demo/company/:token — Company demo link')
  h3('Auth')
  bullet('/login, /register — Tenant auth')
  bullet('/studio/login, /studio/register — Landlord auth')
  bullet('/check-email, /verify-email — Email verification')
  h3('Landlord Studio (protected, role admin)')
  bullet('/studio — Dashboard')
  bullet('/studio/properties — Rentals & Upcoming Openings')
  bullet('/studio/contracts — Lease Agreements portfolio')
  bullet('/studio/payments — Payments (also ?status=overdue)')
  bullet('/studio/alerts — Tenant Alerts')
  bullet('/studio/settings — Settings')
  bullet('/studio/profile — Company Profile & lease import')
  bullet('/studio/clients/:id — Tenant profile')
  bullet('/studio/clients/:id/contract — Lease editor')
  h3('Tenant Portal (protected, role client)')
  bullet('/portal — Dashboard')
  bullet('/portal/timeline — Timeline')
  bullet('/portal/report — Log Repairs')
  bullet('/portal/profile — Profile')
  bullet('/portal/contracts/:contractId — Lease review & sign')
  bullet('/portal/payment/success — Payment success')

  addFooter()

  const buf = Buffer.from(doc.output('arraybuffer'))
  writeFileSync(OUT_PDF, buf)
  console.log(`Wrote ${OUT_PDF} (${buf.length} bytes, ${pageNum} pages)`)
}

const skipShots = process.argv.includes('--pdf-only')
if (!skipShots) {
  await captureScreenshots()
}
buildPdf()
