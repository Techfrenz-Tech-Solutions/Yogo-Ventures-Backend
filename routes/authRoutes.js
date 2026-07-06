const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');

// Login route only
router.post('/login', authController.login);

module.exports = router;
