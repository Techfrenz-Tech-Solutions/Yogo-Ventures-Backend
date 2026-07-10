// scripts/seed-email-template.js
//
// Idempotent one-off seed: inserts the initial `quote_confirmation` email
// template into the DB only if a row with that template_key does not already
// exist. Never overwrites an administrator-customised template — safe to
// re-run on every deploy/restart (it simply no-ops if the row is already there).
//
// Usage: node scripts/seed-email-template.js

require('dotenv').config({ debug: false, silent: true, quiet: true });
const fs = require('fs');
const path = require('path');
const db = require('../models/db.js');

const TEMPLATE_KEY = 'quote_confirmation';

async function main() {
    const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'templates', 'quote-confirmation.html'), 'utf8');
    const textContent = fs.readFileSync(path.join(__dirname, '..', 'templates', 'quote-confirmation.txt'), 'utf8');

    const existing = await db.mainDbForCron(
        'SELECT id FROM email_templates WHERE template_key = ? LIMIT 1',
        [TEMPLATE_KEY]
    );

    if (existing.length > 0) {
        console.log(`[seed] "${TEMPLATE_KEY}" template already exists (id=${existing[0].id}) — leaving it untouched.`);
        db.closePool();
        return;
    }

    await db.mainDbForCron(
        `INSERT INTO email_templates
            (template_key, name, subject, html_content, text_content, is_active,
             heading, intro_text, response_text, footer_text, sender_name, reply_to,
             show_phone, show_message, show_product_images, show_product_variants, show_quantities)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NULL, 1, 1, 1, 1, 1)`,
        [
            TEMPLATE_KEY,
            'Quote Confirmation Email',
            'Your YoGo Ventures Quote Request — {{QUOTE_REFERENCE}}',
            htmlContent,
            textContent,
            'Thank You for Your Enquiry!',
            "We've received your details and appreciate your interest in our products/services.",
            'You will receive your quotation within 24 hours.',
            'If you have any questions in the meantime, just reply to this email.',
            'YoGo Ventures',
        ]
    );

    console.log(`[seed] Inserted "${TEMPLATE_KEY}" email template.`);
    db.closePool();
}

main().catch((err) => {
    console.error('[seed] Failed to seed email template:', err.message);
    db.closePool();
    process.exit(1);
});
