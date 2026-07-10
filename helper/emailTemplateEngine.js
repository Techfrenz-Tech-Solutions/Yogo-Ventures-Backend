// helper/emailTemplateEngine.js
//
// Renders the DB-backed email_templates row into a final HTML + text email
// body. Pure string substitution ({{TOKEN}} placeholders) — no eval, no
// executable template language, so a compromised/typo'd template can never
// run arbitrary code. Every scalar value is HTML-escaped before being placed
// into the HTML body; PRODUCT_ROWS/PHONE_ROW/MESSAGE_BLOCK are pre-rendered
// HTML fragments built here from already-escaped pieces, never raw user input.

const REQUIRED_HTML_PLACEHOLDERS = [
    '{{HEADING}}', '{{CUSTOMER_NAME}}', '{{CUSTOMER_EMAIL}}',
    '{{QUOTE_REFERENCE}}', '{{PRODUCT_ROWS}}'
];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Only allow product images that live under our own known storage host —
// never trust an arbitrary browser-supplied URL as an <img src> in an email
// (tracking-pixel / SSRF-adjacent risk). Falls back to no image if unset.
const PUBLIC_ASSET_BASE_URL = (process.env.PUBLIC_ASSET_BASE_URL || '').replace(/\/+$/, '');

function isSafeProductImage(url) {
    if (!url || typeof url !== 'string') return false;
    if (!PUBLIC_ASSET_BASE_URL) return false;
    return url.startsWith(`${PUBLIC_ASSET_BASE_URL}/storage/`);
}

function buildProductRowsHtml(items, settings) {
    if (!Array.isArray(items) || items.length === 0) {
        return '<tr><td colspan="2" style="padding:14px; font-size:12.5px; color:#888;">No products were attached to this enquiry.</td></tr>';
    }

    return items.map((item) => {
        const name = escapeHtml(item.product_name || item.name || 'Item');
        const qty = settings.show_quantities ? escapeHtml(item.quantity ?? item.qty ?? 1) : '';
        const variantBits = [];
        if (settings.show_product_variants) {
            if (item.variant) variantBits.push(escapeHtml(item.variant));
            if (item.color) variantBits.push(escapeHtml(item.color));
        }
        const variantHtml = variantBits.length
            ? `<br /><span style="font-size:11.5px; color:#888;">${variantBits.join(' &middot; ')}</span>`
            : '';

        const imageHtml = (settings.show_product_images && isSafeProductImage(item.image))
            ? `<img src="${escapeHtml(item.image)}" alt="${name}" width="44" height="44" style="width:44px; height:44px; object-fit:cover; border-radius:6px; border:1px solid #e8e8e0; margin-right:10px; vertical-align:middle;" />`
            : '';

        return `<tr>
  <td style="padding:12px 14px; font-size:13px; color:#2c2c2c; border-bottom:1px solid #f0f0f0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      ${imageHtml ? `<td style="width:54px;">${imageHtml}</td>` : ''}
      <td style="font-size:13px; color:#2c2c2c;">${name}${variantHtml}</td>
    </tr></table>
  </td>
  <td align="right" style="padding:12px 14px; font-size:13px; color:#2c2c2c; border-bottom:1px solid #f0f0f0; white-space:nowrap;">${qty}</td>
</tr>`;
    }).join('\n');
}

function buildProductRowsText(items, settings) {
    if (!Array.isArray(items) || items.length === 0) {
        return '  (no products attached to this enquiry)';
    }
    return items.map((item) => {
        const name = item.product_name || item.name || 'Item';
        const qty = settings.show_quantities ? ` x${item.quantity ?? item.qty ?? 1}` : '';
        const bits = [];
        if (settings.show_product_variants) {
            if (item.variant) bits.push(item.variant);
            if (item.color) bits.push(item.color);
        }
        const variant = bits.length ? ` (${bits.join(', ')})` : '';
        return `  - ${name}${variant}${qty}`;
    }).join('\n');
}

// Replaces every {{TOKEN}} in `source` using `values` (plain object of
// token -> already-safe string). Any placeholder left over after substitution
// (a typo, or a token we don't know about) is stripped rather than being
// allowed to leak into the customer-facing email.
function substitute(source, values) {
    let out = String(source);
    for (const [key, value] of Object.entries(values)) {
        out = out.split(`{{${key}}}`).join(value);
    }
    // Strip any placeholder-looking tokens that weren't substituted.
    out = out.replace(/\{\{[A-Z0-9_]+\}\}/g, '');
    return out;
}

function validateTemplate(template) {
    const missing = REQUIRED_HTML_PLACEHOLDERS.filter((p) => !template.html_content.includes(p));
    if (missing.length > 0) {
        throw new Error(`Template "${template.template_key}" is missing required placeholders: ${missing.join(', ')}`);
    }
}

/**
 * Renders the quote-confirmation template for one recipient.
 * @param {object} template - row from email_templates
 * @param {object} data - { customerName, customerEmail, customerPhone, country,
 *   quoteReference, submittedDate, message, items, shopUrl }
 */
function renderQuoteConfirmation(template, data) {
    validateTemplate(template);

    const settings = {
        show_phone: !!template.show_phone,
        show_message: !!template.show_message,
        show_product_images: !!template.show_product_images,
        show_product_variants: !!template.show_product_variants,
        show_quantities: !!template.show_quantities,
    };

    const customerName = escapeHtml(data.customerName || 'Valued Customer');
    const customerEmail = escapeHtml(data.customerEmail || '');
    const country = escapeHtml(data.country || '-');
    const quoteReference = escapeHtml(data.quoteReference || '');
    const submittedDate = escapeHtml(data.submittedDate || '');
    const shopUrl = escapeHtml(data.shopUrl || '#');

    const phoneRowHtml = (settings.show_phone && data.customerPhone)
        ? `<strong style="color:#1a1a1a;">Phone:</strong> ${escapeHtml(data.customerPhone)}<br />`
        : '';
    const phoneLineText = (settings.show_phone && data.customerPhone)
        ? `Phone: ${data.customerPhone}\n`
        : '';

    const messageBlockHtml = (settings.show_message && data.message)
        ? `<p style="font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#8a8a8a; margin:0 0 8px;">Your Message</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fdfdf9; border:1.5px solid #e8e8e0; border-radius:10px; margin-bottom:24px;">
  <tr><td style="padding:14px 18px; font-size:13px; color:#4a4a4a; white-space:pre-line;">${escapeHtml(data.message)}</td></tr>
</table>`
        : '';
    const messageBlockText = (settings.show_message && data.message)
        ? `\nYOUR MESSAGE\n${data.message}\n`
        : '';

    const productRowsHtml = buildProductRowsHtml(data.items, settings);
    const productRowsText = buildProductRowsText(data.items, settings);

    const htmlValues = {
        HEADING: escapeHtml(template.heading),
        CUSTOMER_NAME: customerName,
        CUSTOMER_EMAIL: customerEmail,
        INTRO_TEXT: escapeHtml(template.intro_text),
        RESPONSE_TEXT: escapeHtml(template.response_text),
        FOOTER_TEXT: escapeHtml(template.footer_text),
        QUOTE_REFERENCE: quoteReference,
        SUBMITTED_DATE: submittedDate,
        COUNTRY: country,
        PHONE_ROW: phoneRowHtml,
        MESSAGE_BLOCK: messageBlockHtml,
        PRODUCT_ROWS: productRowsHtml,
        SHOP_URL: shopUrl,
    };

    const textValues = {
        HEADING: template.heading || '',
        CUSTOMER_NAME: data.customerName || 'Valued Customer',
        CUSTOMER_EMAIL: data.customerEmail || '',
        INTRO_TEXT: template.intro_text || '',
        RESPONSE_TEXT: template.response_text || '',
        FOOTER_TEXT: template.footer_text || '',
        QUOTE_REFERENCE: data.quoteReference || '',
        SUBMITTED_DATE: data.submittedDate || '',
        COUNTRY: data.country || '-',
        PHONE_LINE: phoneLineText,
        MESSAGE_BLOCK_TEXT: messageBlockText,
        PRODUCT_ROWS_TEXT: productRowsText,
        SHOP_URL: data.shopUrl || '#',
    };

    return {
        subject: substitute(template.subject, htmlValues),
        html: substitute(template.html_content, htmlValues),
        text: template.text_content ? substitute(template.text_content, textValues) : undefined,
    };
}

module.exports = { escapeHtml, renderQuoteConfirmation, isSafeProductImage, validateTemplate };
