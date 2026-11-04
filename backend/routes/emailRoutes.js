const express = require('express');
const router = express.Router();
const { subscribeToNewsletter } = require('../controllers/emailController');

// Public route for newsletter subscription
router.post('/subscribe-newsletter', subscribeToNewsletter);

module.exports = router;
