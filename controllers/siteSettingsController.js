// controllers/siteSettingsController.js
//
// Backs the admin panel's existing Site Settings page (General / Social
// Media / Invoice tabs) — src/pages/SiteSettings.jsx in
// Yogo-ventures-Admin-Panel. That page already called GET/PUT /settings,
// but no backend route or table existed for it, so it silently failed
// against the real API (empty catch block swallowed the error). This adds
// the missing table + endpoints, matching the exact field shape the page
// already reads/writes.
//
// Singleton resource: always operates on the one row with id=1
// (see migrations/003_site_settings.sql).

const { Validator } = require('node-input-validator');
const db = require('../models/db.js');

function toPublicShape(row) {
    if (!row) return null;
    return {
        siteName: row.site_name,
        siteTagline: row.site_tagline,
        siteUrl: row.site_url,
        supportEmail: row.support_email,
        supportContact: row.support_contact,
        maintenanceMode: !!row.maintenance_mode,
        maintenanceMessage: row.maintenance_message,
        socialMedia: {
            facebook: row.social_facebook,
            instagram: row.social_instagram,
            twitter: row.social_twitter,
            whatsapp: row.social_whatsapp,
        },
        invoicePrefix: row.invoice_prefix,
        invoiceFooterNote: row.invoice_footer_note,
        updated_date: row.updated_date,
    };
}

exports.getSiteSettings = async (req, res) => {
    try {
        const rows = await db.mainDbForCron('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
        if (rows.length === 0) {
            return res.json({ status: 0, message: 'Site settings have not been initialised yet' });
        }
        return res.json({ status: 1, data: toPublicShape(rows[0]) });
    } catch (err) {
        console.error('Failed to load site settings:', err.message);
        return res.json({ status: 0, message: 'DB error' });
    }
};

exports.updateSiteSettings = async (req, res) => {
    const reqData = req.body || {};
    const social = reqData.socialMedia || {};

    const v = new Validator(reqData, {
        siteName: 'string|maxLength:150',
        siteTagline: 'string|maxLength:255',
        siteUrl: 'string|maxLength:255',
        supportEmail: 'string|maxLength:255',
        supportContact: 'string|maxLength:30',
        maintenanceMode: 'boolean',
        maintenanceMessage: 'string|maxLength:500',
        invoicePrefix: 'string|maxLength:20',
        invoiceFooterNote: 'string|maxLength:500',
    });

    const matched = await v.check();
    if (!matched) {
        const error_message = Object.values(v.errors).map((e) => e.message).join(', ');
        return res.json({ status: 0, message: error_message });
    }

    if (reqData.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(reqData.supportEmail).trim())) {
        return res.json({ status: 0, message: 'Support email must be a valid email address' });
    }

    try {
        await db.mainDbForCron(
            `UPDATE site_settings SET
                site_name = ?, site_tagline = ?, site_url = ?, support_email = ?, support_contact = ?,
                maintenance_mode = ?, maintenance_message = ?,
                social_facebook = ?, social_instagram = ?, social_twitter = ?, social_whatsapp = ?,
                invoice_prefix = ?, invoice_footer_note = ?
             WHERE id = 1`,
            [
                (reqData.siteName || '').trim(),
                (reqData.siteTagline || '').trim(),
                (reqData.siteUrl || '').trim(),
                (reqData.supportEmail || '').trim(),
                (reqData.supportContact || '').trim(),
                reqData.maintenanceMode ? 1 : 0,
                (reqData.maintenanceMessage || '').trim(),
                (social.facebook || '').trim().slice(0, 255),
                (social.instagram || '').trim().slice(0, 255),
                (social.twitter || '').trim().slice(0, 255),
                (social.whatsapp || '').trim().slice(0, 30),
                (reqData.invoicePrefix || 'INV').trim(),
                (reqData.invoiceFooterNote || '').trim(),
            ]
        );

        const rows = await db.mainDbForCron('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
        return res.json({ status: 1, message: 'Settings saved successfully', data: toPublicShape(rows[0]) });
    } catch (err) {
        console.error('Failed to update site settings:', err.message);
        return res.json({ status: 0, message: 'DB error' });
    }
};
