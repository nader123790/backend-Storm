// config/firebase.js
// Firebase Admin SDK — server-side ONLY. Never expose this to the client.
const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return;

  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  for (const v of requiredVars) {
    if (!process.env[v]) {
      throw new Error(`Missing required environment variable: ${v}`);
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines from .env string format
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  initialized = true;
  console.log('[Firebase] Admin SDK initialized');
}

initFirebase();

const db = admin.firestore();

module.exports = { admin, db };