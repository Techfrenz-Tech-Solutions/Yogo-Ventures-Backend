// helper/mailer.js
//
// Single reusable Nodemailer transport (Brevo SMTP). Created once at module
// load, not per-send — creating a new transporter per email would open a new
// SMTP connection pool every time and defeats connection reuse.

const nodemailer = require('nodemailer');
const path = require('path');

const REQUIRED_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL'];

function checkEnv() {
    const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        const msg = `Email is not configured — missing env vars: ${missing.join(', ')}`;
        if (process.env.NODE_ENV === 'production') {
            console.error(`FATAL: ${msg}. Quote confirmation emails will fail until these are set.`);
        } else {
            console.warn(`WARNING: ${msg}. Quote confirmation emails will fail until these are set.`);
        }
        return false;
    }
    return true;
}

const emailConfigured = checkEnv();

// Never log this object — it contains the SMTP password.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'email', 'yogo-logo.png');

/**
 * Sends an email. Never throws a raw Nodemailer/SMTP error to the caller —
 * callers should treat rejection as "delivery failed" and log err.message
 * only (never the transport config).
 */
async function sendMail({ to, subject, html, text, replyTo, fromName, attachLogo = true }) {
    if (!emailConfigured) {
        throw new Error('Email transport is not configured');
    }

    const fromDisplayName = fromName || process.env.SMTP_FROM_NAME || 'YoGo Ventures';

    const attachments = attachLogo
        ? [{ filename: 'yogo-logo.png', path: LOGO_PATH, cid: 'yogo-logo' }]
        : [];

    const info = await transporter.sendMail({
        from: `"${fromDisplayName}" <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        replyTo: replyTo || process.env.SMTP_REPLY_TO || undefined,
        subject,
        html,
        text,
        attachments,
    });

    return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

module.exports = { sendMail, isConfigured: () => emailConfigured };
