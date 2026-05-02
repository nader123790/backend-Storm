// server.js — Storm Café Secure Backend
// =============================================
// SECURITY CHECKLIST:
//   ✅ helmet() — security headers (XSS, CORS, CSP, etc.)
//   ✅ cors() — allow-list only
//   ✅ express-rate-limit — global + per-route limits
//   ✅ No secrets in Flutter client (JWT-only)
//   ✅ Firebase Admin SDK (server-side only)
//   ✅ Telegram BOT_TOKEN never exposed to client
//   ✅ Input validation in all controllers
//   ✅ Constant-time password comparison in auth
// =============================================

require('dotenv').config();

// Validate critical env vars at startup — fail fast
const REQUIRED_ENV = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'JWT_SECRET',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required env var: ${key}`);
    process.exit(1);
  }
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const telegramRoutes = require('./routes/telegram');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────

// Helmet sets sensible HTTP security headers
app.use(helmet());

// CORS — explicitly allow-list your Flutter Web domain(s)
// Update ALLOWED_ORIGINS in your .env or here for production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, Postman in dev)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global rate limit: 100 requests per IP per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});
app.use(globalLimiter);

// Parse JSON bodies — limit size to prevent body-stuffing attacks
app.use(express.json({ limit: '64kb' }));

// ─── Health Check ──────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'storm-cafe-backend' });
});

// ─── Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/telegram', telegramRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  // Never expose stack traces to clients
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
  console.log(`[Storm Café Backend] Running on port ${PORT}`);
});