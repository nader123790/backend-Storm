// controllers/telegramController.js
// The Telegram BOT_TOKEN is stored in .env ONLY.
// It is NEVER sent to the Flutter client.
// All message-sending goes through this controller.

const https = require('https');

/**
 * Sends a message to the configured Telegram chat.
 * Internal helper — used by other controllers too.
 */
async function sendToTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.');
  }

  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Telegram API error: ${response.statusCode} — ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * POST /api/telegram
 * Accepts { message: string } from Flutter and forwards to Telegram.
 * No auth required — rate-limited at route level.
 */
async function sendTelegramMessage(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required.' });
    }

    // Sanitise: strip potential HTML injection, cap length
    const safeMessage = message.replace(/<[^>]*>/g, '').slice(0, 1000);

    await sendToTelegram(safeMessage);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[Telegram] sendTelegramMessage error:', err.message);
    // Don't expose internal Telegram errors to client
    return res.status(502).json({ error: 'Failed to send notification.' });
  }
}

module.exports = { sendTelegramMessage, sendToTelegram };