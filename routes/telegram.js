// routes/telegram.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendTelegramMessage } = require('../controllers/telegramController');

// Rate limit: max 10 Telegram messages per IP per minute
const telegramLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// POST /api/telegram
router.post('/', telegramLimiter, sendTelegramMessage);

module.exports = router;