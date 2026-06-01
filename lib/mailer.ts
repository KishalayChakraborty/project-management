import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    // SMTP not configured — log URL for debugging only (remove in production)
    console.warn('[mailer] SMTP not configured. Reset URL:', resetUrl);
    return;
  }

  const transporter = createTransport();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Project Management" <noreply@${process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '')}>`,
    to,
    subject: 'Reset your password',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
    text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}
