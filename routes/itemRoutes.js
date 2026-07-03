// const express = require('express');
// const router = express.Router();

// const itemController = require('../controllers/itemMasterController.js');


// const uploadMiddleware = (req, res, next) => {
//     upload.single('image')(req, res, function (err) {

//         if (err instanceof multer.MulterError) {
//             if (err.code === 'LIMIT_FILE_SIZE') {
//                 return res.json({
//                     status: 0,
//                     message: 'File size must be less than 5MB'
//                 });
//             }
//         } else if (err) {
//             return res.json({
//                 status: 0,
//                 message: err.message
//             });
//         }

//         next();
//     });
// };

// // Route
// router.post('/uploadToPinata', uploadMiddleware, itemController.uploadToPinata);

const express = require('express');
const router = express.Router();
  
const itemController = require('../controllers/itemMasterController.js');
 
// Middleware
const uploadMiddleware = (req, res, next) => {
    upload.single('image')(req, res, function (err) {
 
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.json({
                    status: 0,
                    message: 'File size must be less than 5MB'
                });
            }
        } else if (err) {
            return res.json({
                status: 0,
                message: err.message
            });
        }
 
        next();
    });
};
 
// // Route
// router.post('/uploadToPinata', uploadMiddleware, itemController.uploadToPinata);

router.post('/countrycreate', itemController.createCountry);
router.get('/countrylist', itemController.getCountries);
router.get('/country/:id', itemController.getCountry);
router.post('/countryupdate', itemController.updateCountry);
router.post('/countrydelete', itemController.deleteCountry);



router.post('/categorycreate', itemController.createCategory);
router.get('/categorylist', itemController.getCategories);
router.get('/category/:id', itemController.getCategory);
router.post('/categoryupdate', itemController.updateCategory);
router.post('/categorydelete', itemController.deleteCategory);

router.get('/categorydropdown', itemController.categoryDropdown);



router.post('/sub-categorycreate', itemController.createSubCategory);
router.get('/sub-categorylist', itemController.getSubCategories);
router.get('/sub-category/:id', itemController.getSubCategory);
router.post('/sub-categoryupdate', itemController.updateSubCategory);
router.post('/sub-categorydelete', itemController.deleteSubCategory);
router.get('/sub-categorydropdown', itemController.subCategoryDropdown);




router.post('/productcreate', itemController.createProduct);
router.get('/productlist', itemController.getProducts);
router.get('/product/:id', itemController.getProduct);
router.post('/productupdate', itemController.updateProduct);
router.post('/productdelete', itemController.deleteProduct);
//router.get('/productdropdown', itemController.productDropdown);


router.post('/enquiry-quotecreate', itemController.createEnquiryQuote);
router.get('/enquiry-quotelist', itemController.getEnquiryQuotes);
router.get('/enquiry-quote/:id', itemController.getEnquiryQuote);
router.post('/enquiry-quoteupdate-status', itemController.updateEnquiryQuoteStatus);
router.post('/enquiry-quotedelete', itemController.deleteEnquiryQuote);


router.post('/contact-uscreate', itemController.createContactUs);
router.get('/contact-uslist', itemController.getContactUsList);
router.get('/contact-us/:id', itemController.getContactUs);
router.post('/contact-usupdate-status', itemController.updateContactUsStatus);
router.post('/contact-usdelete', itemController.deleteContactUs);




router.post('/best-sellingcreate', itemController.createBestSelling);
router.get('/best-sellinglist', itemController.getBestSellingList);
router.get('/best-selling/:id', itemController.getBestSelling);
router.post('/best-sellingupdate', itemController.updateBestSelling);
router.post('/best-sellingdelete', itemController.deleteBestSelling);


router.post('/new-arrivalcreate', itemController.createNewArrival);
router.get('/new-arrivallist', itemController.getNewArrivalList);
router.get('/new-arrival/:id', itemController.getNewArrival);
router.post('/new-arrivalupdate', itemController.updateNewArrival);
router.post('/new-arrivaldelete', itemController.deleteNewArrival);


router.post('/enquirycreate', itemController.createEnquiry);
router.get('/enquirylist', itemController.getEnquiries);
router.get('/enquiry/:id', itemController.getEnquiry);
router.post('/enquiryupdate-status', itemController.updateEnquiryStatus);
router.post('/enquirydelete', itemController.deleteEnquiry);



router.post('/customercreate', itemController.createCustomer);
router.get('/customerlist', itemController.getCustomers);
router.get('/customer/:id', itemController.getCustomer);
router.post('/customerupdate', itemController.updateCustomer);
router.post('/customerdelete', itemController.deleteCustomer);


router.post('/order-trackingcreate', itemController.createOrderTracking);
router.get('/order-trackinglist', itemController.getOrderTrackingList);
router.get('/order-tracking/:id', itemController.getOrderTracking);
router.post('/order-trackingupdate', itemController.updateOrderTracking);
router.post('/order-trackingdelete', itemController.deleteOrderTracking);


module.exports = router;