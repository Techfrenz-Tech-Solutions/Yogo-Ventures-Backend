const express = require('express');
const router = express.Router();

const emailSettingsController = require('../controllers/emailSettingsController.js');
const siteSettingsController = require('../controllers/siteSettingsController.js');
const { auth } = require('../helper/helper.js');

// All settings endpoints are admin-only, same JWT middleware as every other
// admin route in this backend.

// General site settings (admin panel's General / Social Media / Invoice tabs).
router.get('/', auth, siteSettingsController.getSiteSettings);
router.put('/', auth, siteSettingsController.updateSiteSettings);

router.get('/quote-confirmation-email', auth, emailSettingsController.getQuoteConfirmationSettings);
router.put('/quote-confirmation-email', auth, emailSettingsController.updateQuoteConfirmationSettings);
router.post('/quote-confirmation-email/preview', auth, emailSettingsController.previewQuoteConfirmation);
router.post('/quote-confirmation-email/send-test', auth, emailSettingsController.sendTestQuoteConfirmation);

module.exports = router;
