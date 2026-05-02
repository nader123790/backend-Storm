// routes/auth.js
const express = require('express');
const router = express.Router();
const { loginWaiter } = require('../controllers/authController');

// POST /api/auth/waiter
router.post('/waiter', loginWaiter);

module.exports = router;