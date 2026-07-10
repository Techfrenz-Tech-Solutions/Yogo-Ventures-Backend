// services/quoteEmailService.js
//
// Orchestrates sending the quote-confirmation email for a saved quote row.
// Quote creation and email delivery are treated as two separate outcomes:
// this module never throws in a way that should roll back or invalidate the
// already-committed quote — callers get back a controlled
// { sent, status } result and log everything needed for troubleshooting in
// email_log, without ever persisting SMTP credentials or raw transport errors.

const db = require('../models/db.js');
const mailer = require('../helper/mailer.js');
const { renderQuoteConfirmation } = require('../helper/emailTemplateEngine.js');

const TEMPLATE_KEY = 'quote_confirmation';

function sanitizeError(err) {
    // Never let the SMTP password (or anything resembling env var values)
    // leak into a stored log row — keep only the error's own message, and
    // strip it if it happens to echo configured secrets back.
    let msg = String(err && err.message ? err.message : 'Unknown email delivery error');
    const pass = process.env.SMTP_PASS;
    if (pass && msg.includes(pass)) msg = msg.split(pass).join('[redacted]');
    return msg.slice(0, 500);
}

async function getActiveTemplate(templateKey) {
    const rows = await db.mainDbForCron(
        'SELECT * FROM email_templates WHERE template_key = ? LIMIT 1',
        [templateKey]
    );
    return rows[0] || null;
}

async function findLog(quoteId, templateKey) {
    const rows = await db.mainDbForCron(
        'SELECT * FROM email_log WHERE quote_id = ? AND template_key = ? LIMIT 1',
        [quoteId, templateKey]
    );
    return rows[0] || null;
}

async function createPendingLog(quoteId, templateKey, recipient) {
    try {
        const result = await db.mainDbForCron(
            `INSERT INTO email_log (quote_id, template_key, recipient, status)
             VALUES (?, ?, ?, 'pending')`,
            [quoteId, templateKey, recipient]
        );
        return result.insertId;
    } catch (err) {
        // Unique key race (two concurrent attempts for the same quote/template) —
        // fall back to the row the other request created.
        const existing = await findLog(quoteId, templateKey);
        if (existing) return existing.id;
        throw err;
    }
}

async function markLog(id, fields) {
    const sets = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
        sets.push(`${key} = ?`);
        values.push(value);
    }
    values.push(id);
    await db.mainDbForCron(`UPDATE email_log SET ${sets.join(', ')} WHERE id = ?`, values);
}

/**
 * @param {object} quote - { id, first_name, last_name, email_id, phone_number,
 *   country, message, reference_number, created_date, items }
 * @returns {Promise<{sent:boolean, status:'sent'|'failed'|'skipped'}>}
 */
async function sendQuoteConfirmation(quote) {
    const recipient = quote.email_id;

    // Idempotency: never send the same template twice for the same quote.
    const existing = await findLog(quote.id, TEMPLATE_KEY);
    if (existing) {
        return { sent: existing.status === 'sent', status: existing.status };
    }

    const logId = await createPendingLog(quote.id, TEMPLATE_KEY, recipient);

    let template;
    try {
        template = await getActiveTemplate(TEMPLATE_KEY);
    } catch (err) {
        await markLog(logId, { status: 'failed', error_message: sanitizeError(err) });
        return { sent: false, status: 'failed' };
    }

    if (!template) {
        await markLog(logId, { status: 'skipped', error_message: 'Template not found' });
        return { sent: false, status: 'skipped' };
    }
    if (!template.is_active) {
        await markLog(logId, { status: 'skipped', error_message: 'Template disabled' });
        return { sent: false, status: 'skipped' };
    }

    try {
        const customerName = [quote.first_name, quote.last_name].filter(Boolean).join(' ').trim();
        const submittedDate = new Date(quote.created_date || Date.now()).toLocaleString('en-IN', {
            dateStyle: 'medium', timeStyle: 'short',
        });

        const rendered = renderQuoteConfirmation(template, {
            customerName,
            customerEmail: recipient,
            customerPhone: quote.phone_number,
            country: quote.country,
            quoteReference: quote.reference_number,
            submittedDate,
            message: quote.message,
            items: quote.items || [],
            shopUrl: process.env.SHOP_URL || process.env.PUBLIC_ASSET_BASE_URL || '#',
        });

        const info = await mailer.sendMail({
            to: recipient,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            replyTo: template.reply_to,
            fromName: template.sender_name,
        });

        await markLog(logId, {
            status: 'sent',
            provider_message_id: info.messageId || null,
            sent_at: new Date(),
        });
        return { sent: true, status: 'sent' };
    } catch (err) {
        console.error(`Quote confirmation email failed for quote #${quote.id}:`, err.message);
        await markLog(logId, { status: 'failed', error_message: sanitizeError(err) });
        return { sent: false, status: 'failed' };
    }
}

module.exports = { sendQuoteConfirmation, TEMPLATE_KEY };
