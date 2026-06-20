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
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@clientcraft.app'
  const fromName = process.env.MAIL_FROM_NAME || 'Aspen Creative Solutions'
  const subject = 'Confirm your Client Craft account'

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
    <p>Thanks for signing up with <strong>Client Craft</strong>. Please confirm your email address to activate your account:</p>
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
    throw new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.'
    )
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
    const smtpErr = new Error(
      'Could not send verification email. For Google Workspace/Gmail, use an App Password (not your regular password) and ensure SMTP_USER matches the account that created it.'
    )
    smtpErr.cause = err
    throw smtpErr
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
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@clientcraft.app'
  const fromName = process.env.MAIL_FROM_NAME || 'Aspen Creative Solutions'
  const subject = `${title} — Client Craft`

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
