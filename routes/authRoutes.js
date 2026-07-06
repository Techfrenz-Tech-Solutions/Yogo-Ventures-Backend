const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');

// Signup route
router.post('/signup', authController.signup);

// Login route
router.post('/login', authController.login);

module.exports = router;
