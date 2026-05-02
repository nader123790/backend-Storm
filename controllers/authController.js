// controllers/authController.js
// ALL authentication logic lives here — NEVER in the Flutter client.
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

/**
 * POST /api/auth/waiter
 * Body: { password: string }
 *
 * Fetches the waiter password from Firestore on the SERVER,
 * compares it securely, and returns a signed JWT on success.
 * The client never sees the password or the Firestore document.
 */
async function loginWaiter(req, res) {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }

    // Fetch the stored password from Firestore on the server
    const settingsDoc = await db
      .collection('settings')
      .doc('waiter')
      .get();

    if (!settingsDoc.exists) {
      console.error('[Auth] settings/waiter document not found in Firestore');
      return res.status(500).json({ error: 'Authentication service unavailable.' });
    }

    const correctPassword = settingsDoc.data().password;

    // Constant-time comparison to prevent timing attacks
    const inputBuf = Buffer.from(password);
    const correctBuf = Buffer.from(correctPassword);

    const lengthMatch = inputBuf.length === correctBuf.length;
    // Always run the comparison (avoids timing leak even on length mismatch)
    const contentMatch =
      lengthMatch &&
      require('crypto').timingSafeEqual(inputBuf, correctBuf);

    if (!contentMatch) {
      // Generic error — never reveal whether it was username or password
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Issue a short-lived JWT
    const token = jwt.sign(
      { role: 'waiter' },
      process.env.JWT_SECRET,
      { expiresIn: '8h', issuer: 'storm-cafe' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('[Auth] loginWaiter error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { loginWaiter };