const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const password = process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD;
  const hasPlaceholder = [host, user, password].some((value) => /your_|your |replace_with|example\.com/i.test(String(value || '')));
  if (!host || !user || !password || host.includes('mailinator.com') || hasPlaceholder) {
    throw new Error('Outgoing SMTP settings are missing or invalid. Mailinator receives email but cannot send it. Configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.');
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || process.env.MAIL_SECURE === 'true',
    requireTLS: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587) === 587,
    auth: { user, pass: password }
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER,
    to: email,
    subject: 'Reset your Anchor Auth password',
    text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in ${process.env.RESET_TOKEN_MINUTES || 15} minutes.`,
    html: `<p>Reset your password using the link below.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in ${process.env.RESET_TOKEN_MINUTES || 15} minutes.</p>`
  });
}

module.exports = { sendPasswordResetEmail };
