/**
 * RoyalMog — Backend API (api.js)
 *
 * Keeps Firebase credentials off the frontend.
 * Deploy this on any Node.js host (Railway, Render, Fly.io, etc.)
 *
 * Install deps:  npm install express firebase-admin cors
 * Run locally:   node api.js
 *
 * Set these environment variables on your host (or in a .env file
 * loaded with `npm install dotenv` + `require('dotenv').config()`):
 *
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY      (the full PEM string, newlines as \n)
 *   ALLOWED_ORIGIN            (your frontend URL, e.g. https://royalmog.com)
 *   PORT                      (optional, defaults to 3000)
 */

const express    = require('express');
const cors       = require('cors');
const admin      = require('firebase-admin');

// ─── Firebase Admin init ──────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Hosting providers often escape newlines — this handles both cases
    privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const VOTES_REF = db.collection('royalmog').doc('votes');

// ─── Valid candidate IDs (mirrors frontend list — acts as server-side allowlist)
const VALID_IDS = new Set([
  'paris','sweden','germany','holland','leeuw','turkey','italy','norway',
  'brabant','iraq','persia','miami','egypt','utrecht','belgium','poland#2',
  'zuid-holland','limburg','denmark','baronen','schweiz','baltzar',
  'switserland#2','hungary',
  // princesses
  'poland','cannes','gelderland','monaco','switserland','friesland',
  'czech republic',
]);

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',   // lock this down in production!
  methods: ['GET', 'POST'],
}));

// GET /api/votes  — fetch current vote counts
app.get('/api/votes', async (req, res) => {
  try {
    const snap = await VOTES_REF.get();
    res.json(snap.exists ? snap.data() : {});
  } catch (err) {
    console.error('GET /api/votes error:', err);
    res.status(500).json({ error: 'Failed to fetch votes.' });
  }
});

// POST /api/vote  — cast one vote
//   Body: { candidateId: string, token: string }
app.post('/api/vote', async (req, res) => {
  const { candidateId } = req.body;

  // Validate candidate
  if (!candidateId || !VALID_IDS.has(candidateId)) {
    return res.status(400).json({ error: 'Invalid candidate.' });
  }

  try {
    await db.runTransaction(async tx => {
      tx.set(VOTES_REF, { [candidateId]: admin.firestore.FieldValue.increment(1) }, { merge: true });
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/vote error:', err);
    res.status(500).json({ error: 'Vote failed. Please try again.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RoyalMog API listening on port ${PORT}`));
