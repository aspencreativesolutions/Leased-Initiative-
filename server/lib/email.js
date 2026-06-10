import nodemailer from 'nodemailer'

function getTransport() {
  const host = process.env.SMTP_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
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
    console.log('\n--- EMAIL VERIFICATION (SMTP not configured) ---')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Verify: ${verifyUrl}`)
    console.log('Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env to send real emails.')
    console.log('---\n')
    return { sent: false, devMode: true }
  }

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text,
    html,
  })

  return { sent: true, devMode: false }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
