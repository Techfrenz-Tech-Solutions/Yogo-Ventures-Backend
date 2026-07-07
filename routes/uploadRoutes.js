const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/uploadController.js');
const { upload, handleUpload } = require('../helper/upload.js');
const { auth } = require('../helper/helper.js');

router.post('/', auth, handleUpload(upload.single('image')), uploadController.uploadImage);

module.exports = router;
