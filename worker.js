// ================================================================
// FILE: worker.js  (Cloudflare Worker — deploy via dashboard or Wrangler)
// ================================================================
// Environment variables to set in Cloudflare Worker dashboard:
//   FIREBASE_PROJECT_ID   = royalmog-a8a40
//   FIREBASE_API_KEY      = AIzaSyAHMkMwjU4B78ItURh5rD2nvXyq4lFwzAs
//   FIREBASE_CLIENT_EMAIL = (your service account email)
//   FIREBASE_PRIVATE_KEY  = (your service account private key)
//   ALLOWED_ORIGIN        = https://yourdomain.com
// ================================================================
//
// NOTE ON SERVICE ACCOUNT:
//   For server-side writes with full auth, generate a Firebase service
//   account key (Firebase Console → Project Settings → Service Accounts
//   → Generate new private key). Store FIREBASE_CLIENT_EMAIL and
//   FIREBASE_PRIVATE_KEY as Worker secrets (not plain env vars).
//
//   If you prefer to keep using the client SDK key for writes, the
//   Firestore REST API also accepts the API key as a query param.
//   This worker uses the REST API + API key path for simplicity,
//   since your Firestore rules already guard the shape of writes.
//   Upgrade to service account JWT auth for stricter control.
// ================================================================

const VALID_CANDIDATES = new Set([
  'paris','sweden','germany','holland','leeuw',
  'turkey','italy','norway','brabant','iraq',
  'persia','miami','egypt','poland','cannes',
  'utrecht','belgium','poland#2','zuid-holland',
  'gelderland','limburg','monaco','baronen',
  'denmark','switserland','schweiz','friesland',
  'switserland#2','baltzar','czech republic','hungary',
]);

// In-memory rate limit store (resets on Worker restart — good enough for edge).
// For persistent rate limiting use Cloudflare KV.
const voteLog = new Map(); // ip -> timestamp

function corsHeaders(origin, allowedOrigin) {
  // Only echo the origin back if it matches; otherwise omit CORS headers
  // so the browser blocks the preflight.
  const allow = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function incrementVote(candidateId, env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const apiKey    = env.FIREBASE_API_KEY;
  const docUrl    = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/royalmog/votes?key=${apiKey}`;

  // Firestore REST PATCH with field transform (increment)
  const body = {
    writes: [{
      transform: {
        document: `projects/${projectId}/databases/(default)/documents/royalmog/votes`,
        fieldTransforms: [{
          fieldPath: candidateId,
          increment: { integerValue: '1' },
        }],
      },
    }],
  };

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore error ${res.status}: ${err}`);
  }
  return true;
}

async function getVotes(env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const apiKey    = env.FIREBASE_API_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/royalmog/votes?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore read error ${res.status}`);

  const json = await res.json();
  const fields = json.fields || {};
  const votes = {};
  for (const [k, v] of Object.entries(fields)) {
    votes[k] = parseInt(v.integerValue || '0', 10);
  }
  return votes;
}

export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '';
    const cors    = corsHeaders(origin, allowed);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // ── GET /votes ──────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/votes') {
      try {
        const votes = await getVotes(env);
        return new Response(JSON.stringify(votes), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── POST /vote ───────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/vote') {
      // 1. Origin check
      if (origin !== allowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2. Parse body
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const { candidateId } = body;

      // 3. Validate candidate
      if (!candidateId || !VALID_CANDIDATES.has(candidateId)) {
        return new Response(JSON.stringify({ error: 'Invalid candidate' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // 4. Server-side rate limit (IP-based, 24h)
      // Cloudflare provides the real IP even behind proxies
      const ip = request.headers.get('CF-Connecting-IP') ||
                 request.headers.get('X-Forwarded-For') ||
                 'unknown';
      const now      = Date.now();
      const lastVote = voteLog.get(ip) || 0;
      const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms

      if (now - lastVote < COOLDOWN) {
        const retryAfter = Math.ceil((lastVote + COOLDOWN - now) / 1000);
        return new Response(
          JSON.stringify({ error: 'Too many requests', retryAfterSeconds: retryAfter }),
          {
            status: 429,
            headers: {
              ...cors,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        );
      }

      // 5. Write to Firestore
      try {
        await incrementVote(candidateId, env);
        voteLog.set(ip, now);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Database error' }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};
