const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/uploadController.js');
const { upload, handleUpload } = require('../helper/upload.js');

router.post('/', handleUpload(upload.single('image')), uploadController.uploadImage);

module.exports = router;
