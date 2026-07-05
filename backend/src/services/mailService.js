/**
 * Transactional mail. Configured entirely through env vars:
 *
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true for 465),
 *   SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * When SMTP_HOST is not set (local dev), emails are logged to the console
 * instead of being sent — signup never fails because of mail problems.
 */
import nodemailer from 'nodemailer';

const configured = Boolean(process.env.SMTP_HOST);

const transport = configured
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

const FROM = process.env.MAIL_FROM || 'Tsugi <no-reply@tsugi.app>';

async function send(mail) {
  if (!transport) {
    console.log(`📧 [mail disabled — set SMTP_HOST to send] to=${mail.to} subject="${mail.subject}"`);
    return;
  }
  await transport.sendMail({ from: FROM, ...mail });
}

/** Fire-and-forget welcome email for new accounts. Never throws. */
export function sendWelcomeEmail(user) {
  const appUrl = process.env.CLIENT_URL || 'http://localhost:5174';
  send({
    to: user.email,
    subject: 'Welcome to Tsugi 次 — your anime watchlist',
    text: [
      `Hey ${user.username},`,
      '',
      'Welcome to Tsugi! Your account is ready.',
      '',
      'A few things you can do right away:',
      '  • Track what you\'re watching, episode by episode',
      '  • Rate everything you finish (1–10, MAL style)',
      '  • Build shareable lists and follow other people\'s',
      '',
      `Start here: ${appUrl}`,
      '',
      '— Tsugi',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#13131e;color:#e8e8f8;border-radius:12px;padding:32px">
        <div style="font-size:22px;font-weight:800;letter-spacing:4px;color:#7c6df4;margin-bottom:4px">TSUGI</div>
        <div style="font-size:12px;color:#70709a;margin-bottom:24px">ツギ · Anime Watchlist</div>
        <p style="font-size:15px;line-height:1.6">Hey <strong>${user.username}</strong>,</p>
        <p style="font-size:15px;line-height:1.6">Welcome to Tsugi! Your account is ready. A few things you can do right away:</p>
        <ul style="font-size:14px;line-height:1.9;color:#c9c9e8">
          <li>Track what you're watching, episode by episode</li>
          <li>Rate everything you finish (1–10, MAL style)</li>
          <li>Build shareable lists and follow other people's</li>
        </ul>
        <a href="${appUrl}" style="display:inline-block;margin-top:12px;background:#7c6df4;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">Open Tsugi</a>
      </div>`,
  }).catch((err) => console.warn(`Welcome email to ${user.email} failed:`, err.message));
}
