const express = require('express');
const router = express.Router();

const itemController = require('../controllers/itemMasterController.js');
const { upload, handleUpload: uploadMiddleware } = require('../helper/upload.js');
const { auth } = require('../helper/helper.js');
const { publicFormLimiter } = require('../helper/rateLimiters.js');

// ── Country (dropdown is public — used by the website contact form) ──
router.post('/countrycreate', auth, itemController.createCountry);
router.get('/countrylist', auth, itemController.getCountries);
router.get('/country/:id', auth, itemController.getCountry);
router.post('/countryupdate', auth, itemController.updateCountry);
router.post('/countrydelete', auth, itemController.deleteCountry);

router.get('/countrydropdown', itemController.countryDropdown);



// ── Category (dropdown is public — used by the website) ───────
router.post('/categorycreate', auth, itemController.createCategory);
router.get('/categorylist', auth, itemController.getCategories);
router.get('/category/:id', auth, itemController.getCategory);
router.post('/categoryupdate', auth, itemController.updateCategory);
router.post('/categorydelete', auth, itemController.deleteCategory);

router.get('/categorydropdown', itemController.categoryDropdown);
router.get('/categorynextcode', auth, itemController.getNextCategoryCode);



// ── Sub-category (lists are public — used by the website) ─────
router.post('/sub-categorycreate', auth, itemController.createSubCategory);
router.get('/sub-categorylist', itemController.getSubCategories);
router.get('/sub-category/:id', auth, itemController.getSubCategory);
router.post('/sub-categoryupdate', auth, itemController.updateSubCategory);
router.post('/sub-categorydelete', auth, itemController.deleteSubCategory);
router.get('/sub-categorydropdown', itemController.subCategoryDropdown);
router.get('/sub-categorynextcode', auth, itemController.getNextSubCategoryCode);




// MAX_VARIATION_IMAGES: a sensible configurable ceiling on how many
// variation images one product can have — the field itself is dynamic
// (unlimited-looking to the admin), this just caps abuse.
const MAX_VARIATION_IMAGES = 20;
const productImageFields = upload.fields([
    { name: 'index_image', maxCount: 1 },
    { name: 'variation_images', maxCount: MAX_VARIATION_IMAGES }
]);

// ── Product (list is public — used by the website) ─────────────
router.post('/productcreate', auth, uploadMiddleware(productImageFields), itemController.createProduct);
router.get('/productlist', itemController.getProducts);
router.get('/product/:id', auth, itemController.getProduct);
router.post('/productupdate', auth, uploadMiddleware(productImageFields), itemController.updateProduct);
router.post('/productdelete', auth, itemController.deleteProduct);
//router.get('/productdropdown', itemController.productDropdown);
router.get('/productnextcode', auth, itemController.getNextProductCode);


// ── Quote enquiries (create is public — website "Get a Quote" form) ──
router.post('/enquiry-quotecreate', publicFormLimiter, itemController.createEnquiryQuote);
router.get('/enquiry-quotelist', auth, itemController.getEnquiryQuotes);
router.get('/enquiry-quote/:id', auth, itemController.getEnquiryQuote);
router.post('/enquiry-quoteupdate-status', auth, itemController.updateEnquiryQuoteStatus);

router.post('/enquiry-quoteupdate-remarks', auth, itemController.updateEnquiryQuoteRemarks);
router.post('/enquiry-quotedelete', auth, itemController.deleteEnquiryQuote);
router.get('/enquiry-quoteexport', auth, itemController.exportEnquiryQuotes);


// ── Contact us (create is public — website contact form) ───────
router.post('/contact-uscreate', publicFormLimiter, itemController.createContactUs);
router.get('/contact-uslist', auth, itemController.getContactUsList);
router.get('/contact-us/:id', auth, itemController.getContactUs);
router.post('/contact-usupdate-status', auth, itemController.updateContactUsStatus);

router.post('/contact-usupdate-remarks', auth, itemController.updateContactUsRemarks);
router.post('/contact-usdelete', auth, itemController.deleteContactUs);
router.get('/contact-usexport', auth, itemController.exportContactUsList);




// ── Best selling (list is public — homepage) ────────────────────
router.post('/best-sellingcreate', auth, uploadMiddleware(upload.single('image')), itemController.createBestSelling);
router.get('/best-sellinglist', itemController.getBestSellingList);
router.get('/best-selling/:id', auth, itemController.getBestSelling);
router.post('/best-sellingupdate', auth, uploadMiddleware(upload.single('image')), itemController.updateBestSelling);
router.post('/best-sellingdelete', auth, itemController.deleteBestSelling);


// ── New arrivals (list is public — homepage) ─────────────────────
router.post('/new-arrivalcreate', auth, uploadMiddleware(upload.single('image')), itemController.createNewArrival);
router.get('/new-arrivallist', itemController.getNewArrivalList);
router.get('/new-arrival/:id', auth, itemController.getNewArrival);
router.post('/new-arrivalupdate', auth, uploadMiddleware(upload.single('image')), itemController.updateNewArrival);
router.post('/new-arrivaldelete', auth, itemController.deleteNewArrival);


// ── General enquiry (create is public — website enquiry form) ──
router.post('/enquirycreate', publicFormLimiter, itemController.createEnquiry);
router.get('/enquirylist', auth, itemController.getEnquiries);
router.get('/enquiry/:id', auth, itemController.getEnquiry);
router.post('/enquiryupdate-status', auth, itemController.updateEnquiryStatus);

router.post('/enquiryupdate-remarks', auth, itemController.updateEnquiryRemarks);
router.post('/enquirydelete', auth, itemController.deleteEnquiry);
router.get('/enquiryexport', auth, itemController.exportEnquiries);



// ── Customer (admin-only) ───────────────────────────────────────
router.post('/customercreate', auth, itemController.createCustomer);
router.get('/customerlist', auth, itemController.getCustomers);
router.get('/customer/:id', auth, itemController.getCustomer);
router.post('/customerupdate', auth, itemController.updateCustomer);
router.post('/customerdelete', auth, itemController.deleteCustomer);
router.get('/customerexport', auth, itemController.exportCustomers);


// ── Order tracking (admin-only) ─────────────────────────────────
router.post('/order-trackingcreate', auth, itemController.createOrderTracking);
router.get('/order-trackinglist', auth, itemController.getOrderTrackingList);
router.get('/order-tracking/:id', auth, itemController.getOrderTracking);
router.patch('/order-tracking/:id/status', auth, itemController.updateOrderTrackingStatus);

router.patch('/order-tracking/:id/remarks', auth, itemController.updateOrderTrackingRemarks);
router.post('/order-trackingupdate', auth, itemController.updateOrderTracking);
router.post('/order-trackingdelete', auth, itemController.deleteOrderTracking);
router.get('/order-trackingnextcode', auth, itemController.getNextOrderId);
router.get('/order-datetitles', auth, itemController.getOrderDateTitles);
router.get('/order-trackingexport', auth, itemController.exportOrderTracking);


router.post('/sample-enquirycreate', auth, itemController.createSampleEnquiry);

router.get('/sample-enquirylist', auth, itemController.getSampleEnquiries);

router.get('/sample-enquiry/:id', auth, itemController.getSampleEnquiry);

router.post('/sample-enquiryupdate', auth, itemController.updateSampleEnquiry);

router.post('/sample-enquiryupdate-status', auth, itemController.updateSampleEnquiryStatus);

router.post('/sample-enquiryupdate-remarks', auth, itemController.updateSampleEnquiryRemarks);

router.post('/sample-enquirydelete', auth, itemController.deleteSampleEnquiry);


// ── Admin notifications (recent activity feed) ──────────────────────────
router.get('/recent-activity', auth, itemController.getRecentActivity);


// ── Dashboard (real stats, monthly graph, latest-enquiry previews) ──────
router.get('/dashboard-stats',             auth, itemController.getDashboardStats);
router.get('/dashboard-monthly-enquiries', auth, itemController.getMonthlyEnquiries);
router.get('/dashboard-latest-enquiries',  auth, itemController.getLatestEnquiries);


module.exports = router;
