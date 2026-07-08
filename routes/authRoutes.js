const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const { loginLimiter } = require('../helper/rateLimiters.js');

// Login route only
router.post('/login', loginLimiter, authController.login);

module.exports = router;
