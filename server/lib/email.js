import nodemailer from 'nodemailer'

function normalizeSmtpPass(pass) {
  return pass?.trim().replace(/\s+/g, '') ?? ''
}

function getTransport() {
  const host = process.env.SMTP_HOST?.trim()
  if (!host) return null

  const user = process.env.SMTP_USER?.trim()
  const pass = normalizeSmtpPass(process.env.SMTP_PASS)
  if (!user || !pass) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  })
}

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      normalizeSmtpPass(process.env.SMTP_PASS)
  )
}

export async function verifySmtpConnection() {
  const transport = getTransport()
  if (!transport) {
    return { ok: false, error: 'SMTP_HOST, SMTP_USER, or SMTP_PASS is missing in .env' }
  }
  try {
    await transport.verify()
    return { ok: true, user: process.env.SMTP_USER?.trim() }
  } catch (err) {
    return { ok: false, error: err.message, user: process.env.SMTP_USER?.trim() }
  }
}

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leased.app'
  const fromName = process.env.MAIL_FROM_NAME || 'Leased Initiative'
  const subject = 'Confirm your Leased Initiative account'

  const text = [
    `Hi ${name},`,
    '',
    'Thanks for signing up. Please confirm your email address to activate your account:',
    '',
    verifyUrl,
    '',
    'This link expires in 24 hours.',
    '',
    "If you didn't create an account, you can safely ignore this email.",
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thanks for signing up with <strong>Leased Initiative</strong>. Please confirm your email address to activate your account:</p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#1e4d6b;color:#ffffff;text-decoration:none;font-weight:600;border-radius:4px">
        Confirm email address
      </a>
    </p>
    <p style="font-size:14px;color:#555">Or copy this link into your browser:<br><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p style="font-size:13px;color:#777">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
  `

  const transport = getTransport()
  if (!transport) {
    console.log('[dev] SMTP not configured — verification link (not emailed):')
    console.log(verifyUrl)
    return { sent: false, devMode: true, verifyUrl }
  }

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error('SMTP send failed:', err.message)
    // Don't block local signup when SMTP credentials are invalid — log the link instead.
    console.log('[dev] Falling back to console verification link after SMTP failure:')
    console.log(verifyUrl)
    return { sent: false, devMode: true, verifyUrl, smtpError: err.message }
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendClientReminderEmail({ to, name, title, message, portalUrl }) {
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leased.app'
  const fromName = process.env.MAIL_FROM_NAME || 'Leased Initiative'
  const subject = `${title} — Leased Initiative`

  const text = [
    `Hi ${name},`,
    '',
    message,
    '',
    `View your portal: ${portalUrl}`,
    '',
    'This is an automated reminder from your project portal.',
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>${escapeHtml(message)}</p>
    <p style="margin:24px 0">
      <a href="${portalUrl}" style="display:inline-block;padding:12px 20px;background:#1e4d6b;color:#ffffff;text-decoration:none;font-weight:600;border-radius:4px">
        Open your portal
      </a>
    </p>
    <p style="font-size:13px;color:#777">This is an automated reminder from your project portal.</p>
  `

  const transport = getTransport()
  if (!transport) return { sent: false }

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text,
    html,
  })
  return { sent: true }
}

export async function sendClientUpdateEmail({ to, name, title, message, portalUrl }) {
  return sendClientReminderEmail({ to, name, title, message, portalUrl })
}

/** Lease-ready / account-setup invite for Add Tenant → Generate Agreement & Notify. */
export async function sendTenantSetupNotifyEmail({
  to,
  name,
  landlordCompany,
  propertyAddress,
  setupUrl,
}) {
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leased.app'
  const fromName = process.env.MAIL_FROM_NAME || 'Leased Initiative'
  const who = name?.trim() || 'there'
  const landlord = landlordCompany?.trim() || 'your landlord'
  const address = propertyAddress?.trim()
  const addressLine = address
    ? `They prepared a lease agreement for ${escapeHtml(address)}.`
    : 'They prepared a lease agreement for you.'

  const subject = `${landlord} — set up your tenant account`
  const text = [
    `Hi ${who},`,
    '',
    `${landlord} invited you to set up your tenant account.`,
    address
      ? `They prepared a lease agreement for ${address}.`
      : 'They prepared a lease agreement for you.',
    '',
    'Open this link to continue:',
    setupUrl,
    '',
    'If you were not expecting this message, you can ignore it.',
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(who)},</p>
    <p><strong>${escapeHtml(landlord)}</strong> invited you to set up your tenant account.</p>
    <p>${addressLine}</p>
    <p style="margin:24px 0">
      <a href="${setupUrl}" style="display:inline-block;padding:12px 20px;background:#1e4d6b;color:#ffffff;text-decoration:none;font-weight:600;border-radius:4px">
        Set up your account
      </a>
    </p>
    <p style="font-size:14px;color:#555">Or copy this link into your browser:<br><a href="${setupUrl}">${escapeHtml(setupUrl)}</a></p>
    <p style="font-size:13px;color:#777">If you were not expecting this message, you can ignore it.</p>
  `

  const transport = getTransport()
  if (!transport) {
    console.log('[dev] SMTP not configured — tenant setup notify (not emailed):')
    console.log(`  To: ${to}`)
    console.log(`  Setup URL: ${setupUrl}`)
    return { sent: false, devMode: true, setupUrl, error: 'SMTP is not configured in .env' }
  }

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text,
      html,
    })
    return { sent: true, setupUrl }
  } catch (err) {
    console.error('Tenant setup email failed:', err.message)
    console.log('[dev] Falling back to console setup link after SMTP failure:')
    console.log(setupUrl)
    return {
      sent: false,
      devMode: true,
      setupUrl,
      error: err.message || 'Could not send email',
      smtpError: err.message,
    }
  }
}

const ASPEN_SUPPORT_EMAIL =
  process.env.BUG_REPORT_EMAIL?.trim() || 'sophie@aspencreativesolutions.com'

/** Notify Aspen Creative Solutions of an in-app bug report (email when SMTP is configured). */
export async function sendBugReportEmail({
  description,
  stepsToReproduce,
  reporterName,
  reporterEmail,
  reportId,
}) {
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leased.app'
  const fromName = process.env.MAIL_FROM_NAME || 'Leased Initiative'
  const subject = `Bug report — Leased Initiative (${reportId})`

  const text = [
    'A bug report was submitted from Leased Initiative.',
    '',
    `Report ID: ${reportId}`,
    `From: ${reporterName || 'Unknown'}${reporterEmail ? ` <${reporterEmail}>` : ''}`,
    '',
    'Description:',
    description,
    '',
    stepsToReproduce ? `Steps to reproduce:\n${stepsToReproduce}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <p>A bug report was submitted from <strong>Leased Initiative</strong>.</p>
    <p style="font-size:13px;color:#555">
      Report ID: ${escapeHtml(reportId)}<br>
      From: ${escapeHtml(reporterName || 'Unknown')}${
        reporterEmail ? ` &lt;${escapeHtml(reporterEmail)}&gt;` : ''
      }
    </p>
    <h3 style="margin:16px 0 8px;font-size:14px">Description</h3>
    <p style="white-space:pre-wrap">${escapeHtml(description)}</p>
    ${
      stepsToReproduce
        ? `<h3 style="margin:16px 0 8px;font-size:14px">Steps to reproduce</h3>
           <p style="white-space:pre-wrap">${escapeHtml(stepsToReproduce)}</p>`
        : ''
    }
  `

  const transport = getTransport()
  if (!transport) {
    console.log('[dev] SMTP not configured — bug report stored only:')
    console.log(text)
    return { sent: false, devMode: true }
  }

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: ASPEN_SUPPORT_EMAIL,
      replyTo: reporterEmail || undefined,
      subject,
      text,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error('Bug report email failed:', err.message)
    console.log('[dev] Bug report contents:')
    console.log(text)
    return { sent: false, smtpError: err.message }
  }
}

