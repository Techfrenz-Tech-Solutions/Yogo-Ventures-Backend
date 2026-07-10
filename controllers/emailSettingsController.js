// controllers/emailSettingsController.js
//
// Admin-only endpoints backing the "Quote Confirmation Email" section of the
// admin panel's existing Settings page. Only safe, structured fields are
// readable/writable here — html_content/text_content (the protected,
// DB-backed template layout) are never returned or accepted from the client.

const { Validator } = require('node-input-validator');
const db = require('../models/db.js');
const mailer = require('../helper/mailer.js');
const { renderQuoteConfirmation } = require('../helper/emailTemplateEngine.js');

const TEMPLATE_KEY = 'quote_confirmation';

const SAFE_FIELDS = [
    'is_active', 'subject', 'heading', 'intro_text', 'response_text', 'footer_text',
    'sender_name', 'reply_to', 'show_phone', 'show_message',
    'show_product_images', 'show_product_variants', 'show_quantities',
];

function toPublicShape(row) {
    if (!row) return null;
    const out = { template_key: row.template_key, name: row.name, updated_date: row.updated_date };
    for (const field of SAFE_FIELDS) out[field] = row[field];
    return out;
}

async function getTemplateRow() {
    const rows = await db.mainDbForCron(
        'SELECT * FROM email_templates WHERE template_key = ? LIMIT 1',
        [TEMPLATE_KEY]
    );
    return rows[0] || null;
}

exports.getQuoteConfirmationSettings = async (req, res) => {
    try {
        const row = await getTemplateRow();
        if (!row) {
            return res.json({ status: 0, message: 'Quote confirmation template has not been seeded yet' });
        }
        return res.json({ status: 1, data: toPublicShape(row) });
    } catch (err) {
        console.error('Failed to load quote confirmation settings:', err.message);
        return res.json({ status: 0, message: 'DB error' });
    }
};

exports.updateQuoteConfirmationSettings = async (req, res) => {
    const reqData = req.body || {};

    const v = new Validator(reqData, {
        is_active: 'boolean',
        subject: 'required|string|maxLength:255',
        heading: 'required|string|maxLength:255',
        intro_text: 'string|maxLength:1000',
        response_text: 'string|maxLength:500',
        footer_text: 'string|maxLength:500',
        sender_name: 'required|string|maxLength:150',
        reply_to: 'string|maxLength:255',
        show_phone: 'boolean',
        show_message: 'boolean',
        show_product_images: 'boolean',
        show_product_variants: 'boolean',
        show_quantities: 'boolean',
    });

    const matched = await v.check();
    if (!matched) {
        const error_message = Object.values(v.errors).map((e) => e.message).join(', ');
        return res.json({ status: 0, message: error_message });
    }

    if (reqData.reply_to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqData.reply_to.trim())) {
        return res.json({ status: 0, message: 'Reply-to must be a valid email address' });
    }

    // template_key is intentionally never read from the request body — it is
    // always the fixed key, so a client can't repoint this row at another template.
    try {
        const existing = await getTemplateRow();
        if (!existing) {
            return res.json({ status: 0, message: 'Quote confirmation template has not been seeded yet' });
        }

        await db.mainDbForCron(
            `UPDATE email_templates SET
                is_active = ?, subject = ?, heading = ?, intro_text = ?, response_text = ?,
                footer_text = ?, sender_name = ?, reply_to = ?, show_phone = ?, show_message = ?,
                show_product_images = ?, show_product_variants = ?, show_quantities = ?
             WHERE template_key = ?`,
            [
                reqData.is_active ? 1 : 0,
                reqData.subject.trim(),
                reqData.heading.trim(),
                (reqData.intro_text || '').trim(),
                (reqData.response_text || '').trim(),
                (reqData.footer_text || '').trim(),
                reqData.sender_name.trim(),
                reqData.reply_to ? reqData.reply_to.trim() : null,
                reqData.show_phone ? 1 : 0,
                reqData.show_message ? 1 : 0,
                reqData.show_product_images ? 1 : 0,
                reqData.show_product_variants ? 1 : 0,
                reqData.show_quantities ? 1 : 0,
                TEMPLATE_KEY,
            ]
        );

        const updated = await getTemplateRow();
        return res.json({ status: 1, message: 'Settings updated successfully', data: toPublicShape(updated) });
    } catch (err) {
        console.error('Failed to update quote confirmation settings:', err.message);
        return res.json({ status: 0, message: 'DB error' });
    }
};

const SAMPLE_DATA = {
    customerName: 'Alex Morgan',
    customerEmail: 'alex@example.com',
    customerPhone: '+61 400 000 000',
    country: 'Australia',
    quoteReference: 'YQ-20260711-DEMO1234',
    submittedDate: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    message: 'Looking for a quote on bulk custom-branded merchandise for an upcoming event.',
    items: [
        { product_name: 'Custom Cotton Tote Bag', quantity: 250, variant: 'Natural', color: 'Navy Print', image: '' },
        { product_name: 'Embroidered Cap', quantity: 250, variant: 'One Size', color: 'Black', image: '' },
    ],
    shopUrl: process.env.SHOP_URL || '#',
};

// Renders unsaved settings values (from the admin form) against the
// protected, DB-backed html_content/text_content — the same renderer used
// for real customer emails — so admins can preview before saving.
exports.previewQuoteConfirmation = async (req, res) => {
    try {
        const existing = await getTemplateRow();
        if (!existing) {
            return res.json({ status: 0, message: 'Quote confirmation template has not been seeded yet' });
        }

        const overrides = req.body || {};
        const previewTemplate = { ...existing };
        for (const field of SAFE_FIELDS) {
            if (field === 'is_active') continue;
            if (overrides[field] !== undefined) previewTemplate[field] = overrides[field];
        }

        const rendered = renderQuoteConfirmation(previewTemplate, SAMPLE_DATA);
        return res.json({ status: 1, data: { html: rendered.html, subject: rendered.subject } });
    } catch (err) {
        console.error('Failed to render quote confirmation preview:', err.message);
        return res.json({ status: 0, message: 'Failed to render preview' });
    }
};

exports.sendTestQuoteConfirmation = async (req, res) => {
    const recipient = (req.body?.recipient || req.user?.email || '').trim();

    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        return res.json({ status: 0, message: 'A valid test recipient email is required' });
    }

    try {
        const template = await getTemplateRow();
        if (!template) {
            return res.json({ status: 0, message: 'Quote confirmation template has not been seeded yet' });
        }

        const rendered = renderQuoteConfirmation(template, SAMPLE_DATA);
        await mailer.sendMail({
            to: recipient,
            subject: `[TEST] ${rendered.subject}`,
            html: rendered.html,
            text: rendered.text,
            replyTo: template.reply_to,
            fromName: template.sender_name,
        });

        return res.json({ status: 1, message: `Test email sent to ${recipient}` });
    } catch (err) {
        console.error('Failed to send test quote confirmation email:', err.message);
        return res.json({ status: 0, message: 'Failed to send test email — check SMTP configuration' });
    }
};
