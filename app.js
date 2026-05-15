import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot,
         runTransaction, increment, setDoc,
         getDoc, serverTimestamp }               from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAnalytics }                           from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';

/* ─── Version guard — bump this string on EVERY deploy ─── */
const CLIENT_VERSION = '2025-05-15-r2';

(async function checkVersion() {
  try {
    const res = await fetch('/version.txt', {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return;
    const serverVersion = (await res.text()).trim();
    if (serverVersion && serverVersion !== CLIENT_VERSION) {
      window.location.reload(true);
    }
  } catch (_) {}
})();

/* ─── Firebase config ─── */
const firebaseConfig = {
  apiKey:            "AIzaSyAHMkMwjU4B78ItURh5rD2nvXyq4lFwzAs",
  authDomain:        "royalmog-a8a40.firebaseapp.com",
  projectId:         "royalmog-a8a40",
  storageBucket:     "royalmog-a8a40",
  messagingSenderId: "634535128872",
  appId:             "1:634535128872:web:fdad8b39807d9b53c7ea1d",
  measurementId:     "G-9JJMYHF1GB"
};

/* ─── Candidate data ─── */
const PRINCES = [
  { id:'paris',         name:'Paris',         tiktok:'@princeoffparis' },
  { id:'sweden',        name:'Sweden',        tiktok:'@sippeee_g' },
  { id:'germany',       name:'Germany',       tiktok:'@princeoffgermanyy' },
  { id:'holland',       name:'Holland',       tiktok:'@sjorshelenklaken' },
  { id:'leeuw',         name:'Leeuwarden',    tiktok:'@nietsido' },
  { id:'turkey',        name:'Turkey',        tiktok:'@celikkardaa' },
  { id:'italy',         name:'Italy',         tiktok:'@picasso_jr_' },
  { id:'norway',        name:'Norway',        tiktok:'@princeaugusteezzz' },
  { id:'brabant',       name:'Brabant',       tiktok:'@sunglassguy3' },
  { id:'iraq',          name:'Iraq',          tiktok:'@theprinceoffiraq' },
  { id:'persia',        name:'Persia',        tiktok:'@clovis.fillion' },
  { id:'miami',         name:'Miami',         tiktok:'@calithekid1' },
  { id:'egypt',         name:'Egypt',         tiktok:'@svfnxo' },
  { id:'utrecht',       name:'Utrecht',       tiktok:'@christiaan_devierde' },
  { id:'belgium',       name:'Belgium',       tiktok:'@finlaystp' },
  { id:'poland#2',      name:'Poland 2',      tiktok:'@princeofpoland90' },
  { id:'zuid-holland',  name:'Zuid-Holland',  tiktok:'@jeanjacquescorjan' },
  { id:'limburg',       name:'Limburg',       tiktok:'@princeoflimburg' },
  { id:'denmark',       name:'Denmark',       tiktok:'@princeofdenmark4' },
  { id:'baronen',       name:'Baronen',       tiktok:'@realbaronen' },
  { id:'schweiz',       name:'Schweiz',       tiktok:'@posbackup' },
  { id:'baltzar',       name:'Baltzar',       tiktok:'@baltzar.1' },
  { id:'switserland#2', name:'Switserland',   tiktok:'@theprinceofswitzerland' },
  { id:'hungary',       name:'Hungary',       tiktok:'@kobold.exee' },
  { id:'india',         name:'India',         tiktok:'@iblamebilall' },
  { id:'ireland',       name:'Ireland',       tiktok:'@prince_irelandtt' },
  { id:'sápmi',         name:'Sápmi',         tiktok:'@thesword665' },
  { id:'estonia',       name:'Estonia',       tiktok:'@JoosepMogs' },
  { id:'malta',         name:'Malta',         tiktok:'@denilsonzammit' },
  { id:'bosnia',        name:'Bosnia',        tiktok:'@melvin_vem_annars' },
  { id:'england',       name:'England',       tiktok:'@princeofengland8' },
];

const PRINCESSES = [
  { id:'poland',           name:'Poland',          tiktok:'@princessoffpoland' },
  { id:'cannes',           name:'Cannes',          tiktok:'@lyndaydl' },
  { id:'gelderland',       name:'Gelderland',      tiktok:'@princessa1005' },
  { id:'monaco',           name:'Monaco',          tiktok:'@sara.vasa10' },
  { id:'switserland',      name:'Switserland',     tiktok:'@princessofswissitaly' },
  { id:'friesland',        name:'Friesland',       tiktok:'@princess_of_friesland' },
  { id:'czech republic',   name:'Czech Republic',  tiktok:'@tessynaaa' },
  { id:'england',          name:'England',         tiktok:'@.johanna_ov' },
  { id:'sweden#2',         name:'Sweden',          tiktok:'@livfrandegard' },
  { id:'greece',           name:'Greece',          tiktok:'@princessofgreece_' },
  { id:'portugal',         name:'Portugal',        tiktok:'@raquelbtw' },
];

const ALL      = Object.freeze([...PRINCES, ...PRINCESSES]);
const VALID_IDS = new Set(ALL.map(c => c.id));

const TT_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.07-.36z"/></svg>`;

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ttUrl(handle) {
  const sanitized = handle.startsWith('@') ? handle : '@' + handle;
  if (!/^@[\w.]+$/.test(sanitized)) return '#';
  return `https://www.tiktok.com/${sanitized}`;
}

function isPrincess(id) { return PRINCESSES.some(p => p.id === id); }

function imgPath(c) {
  const prefix = isPrincess(c.id) ? 'princess' : 'prince';
  return `images/${prefix}-${encodeURIComponent(c.id)}.jpg`;
}

function avatarImg(c, wrapClass, fallbackClass, glyph) {
  const src  = imgPath(c);
  const name = escapeHTML(c.name);
  return `<div class="${wrapClass}">
    <img src="${src}" alt="${name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="${fallbackClass}" style="display:none">${glyph}</span>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════
   ANOMALY DETECTION SYSTEM
   ═══════════════════════════════════════════════════════════════════════

   Strategy:
   ─────────
   1. We keep a rolling snapshot of vote counts in `lastKnownCounts`.
   2. On every Firestore `onSnapshot` update we diff the new counts
      against the last known ones.
   3. If any single candidate's count jumped by ≥ SPIKE_THRESHOLD votes
      in a single snapshot delta (a few seconds), we classify it as an
      anomaly.
   4. We write a quarantine record to `royalmog/audit` so an admin (or
      Cloud Function) can review and roll back server-side.
   5. We visually flag the candidate in the UI with a warning badge.
   6. We attempt a client-side rollback via Firestore transaction — this
      only succeeds if your Security Rules permit it (see README below).

   ⚠️  IMPORTANT — READ THIS:
   ─────────────────────────
   Client-side rollback can itself be defeated. The real protection is
   Firestore Security Rules + a Cloud Function. This client code acts as
   an early-warning layer and a best-effort corrector. Deploy the
   Security Rules in FIRESTORE_RULES.txt alongside this file.

   The audit log written to `royalmog/audit_log` (subcollection) can
   trigger a Cloud Function that does the authoritative rollback with
   admin privileges the client never has.
   ═══════════════════════════════════════════════════════════════════════ */

const SPIKE_THRESHOLD     = 20;   // votes-per-snapshot that triggers anomaly
const AUDIT_DOC           = doc(db => db, 'royalmog', 'audit'); // set after db init
const ANOMALY_WINDOW_MS   = 8_000; // time window we consider "one burst"

// Rolling baseline: candidateId → { count, ts }
const lastKnownCounts = new Map();

// Candidates currently flagged as anomalous: candidateId → true
const flaggedCandidates = new Set();

// Per-candidate spike history: candidateId → [timestamp, ...]
const spikeHistory = new Map();

/**
 * Called on every snapshot. Diffs new data against last known counts,
 * detects spikes, and handles them.
 */
async function runAnomalyDetection(db, newData) {
  const now = Date.now();

  for (const [id, newCount] of Object.entries(newData)) {
    if (!VALID_IDS.has(id)) continue; // ignore unknown fields

    const prev = lastKnownCounts.get(id);

    if (prev !== undefined) {
      const delta = newCount - prev.count;

      if (delta >= SPIKE_THRESHOLD) {
        console.warn(`[AnomalyDetector] Spike on "${id}": +${delta} votes in one snapshot (prev=${prev.count}, now=${newCount})`);
        await handleAnomaly(db, id, prev.count, newCount, delta, now);
      }
    }

    // Update baseline
    lastKnownCounts.set(id, { count: newCount, ts: now });
  }
}

/**
 * Handles a detected anomaly:
 *  1. Flags the candidate in the UI.
 *  2. Writes an audit record to Firestore.
 *  3. Attempts a client-side rollback to the pre-spike value.
 */
async function handleAnomaly(db, candidateId, prevCount, newCount, delta, ts) {
  // 1 — Flag in UI immediately
  flaggedCandidates.add(candidateId);
  markCandidateSuspect(candidateId, delta);
  showToast(`⚠️ Suspicious activity detected. Investigating vote for ${getCandidateName(candidateId)}…`, 'error');

  // 2 — Write audit record (best-effort; may fail if rules deny)
  try {
    const auditCol = doc(db, 'royalmog', 'audit');
    await setDoc(
      doc(db, `royalmog/audit_log/${candidateId}_${ts}`),
      {
        candidateId,
        prevCount,
        detectedCount: newCount,
        delta,
        detectedAt:    serverTimestamp(),
        clientVersion: CLIENT_VERSION,
        resolved:      false,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[AnomalyDetector] Could not write audit record:', e.message);
  }

  // 3 — Attempt rollback: reset to prevCount inside a transaction.
  //     This will only work if your Security Rules allow writes from
  //     trusted clients. If you have strict rules (recommended), this
  //     step is a no-op and the Cloud Function handles it instead.
  try {
    const votesDoc = doc(db, 'royalmog', 'votes');
    await runTransaction(db, async tx => {
      const snap = await tx.get(votesDoc);
      if (!snap.exists()) return;

      const currentVal = snap.data()[candidateId] ?? 0;
      // Only roll back if the value is still anomalously high
      // (prevents rolling back legitimate votes that came in after)
      if (currentVal - prevCount >= SPIKE_THRESHOLD) {
        console.warn(`[AnomalyDetector] Rolling back "${candidateId}" from ${currentVal} to ${prevCount}`);
        tx.set(votesDoc, { [candidateId]: prevCount }, { merge: true });
        // Update our baseline to the rolled-back value
        lastKnownCounts.set(candidateId, { count: prevCount, ts: Date.now() });
        showToast(`Vote count for ${getCandidateName(candidateId)} was reset due to suspicious activity.`, 'error');
      }
    });
  } catch (e) {
    // Rollback failed — this is expected when Security Rules are strict.
    // The Cloud Function (triggered by the audit record) will handle it.
    console.warn('[AnomalyDetector] Client rollback blocked (expected with strict rules):', e.message);
  }
}

/** Adds a visual warning badge to a candidate card in the vote grid. */
function markCandidateSuspect(candidateId, delta) {
  const card = document.getElementById('card-' + candidateId);
  if (!card) return;

  // Don't add duplicate badges
  if (card.querySelector('.suspect-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'suspect-badge';
  badge.title     = `Suspicious spike of +${delta} votes detected`;
  badge.textContent = '⚠️';
  card.appendChild(badge);
  card.classList.add('suspect');
}

/** Also marks ranking rows as suspicious. */
function markRankingRowSuspect(candidateId) {
  // Rankings are re-rendered from scratch each snapshot; the render
  // function checks flaggedCandidates and injects the badge itself.
}

function getCandidateName(id) {
  return ALL.find(c => c.id === id)?.name ?? id;
}

/* ─── 24-hour cooldown via localStorage ─── */
const VOTE_TS_KEY = 'rm_vote_ts_v2';
const RATE_MS     = 86_400_000;

function getVoteTimestamp() { return parseInt(localStorage.getItem(VOTE_TS_KEY) || '0', 10); }
function markVoted()        { localStorage.setItem(VOTE_TS_KEY, Date.now().toString()); }
function msUntilNextVote()  {
  const ts = getVoteTimestamp();
  if (!ts) return 0;
  const remaining = RATE_MS - (Date.now() - ts);
  return remaining > 0 ? remaining : 0;
}
function canVote() { return msUntilNextVote() === 0; }

/* ─── Anti-spam: track recent vote attempts in memory ─── */
let lastAttemptTs = 0;
const ATTEMPT_COOLDOWN_MS = 3000;

function attemptThrottled() {
  const now = Date.now();
  if (now - lastAttemptTs < ATTEMPT_COOLDOWN_MS) return true;
  lastAttemptTs = now;
  return false;
}

let countdownInterval = null;

function formatCountdown(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000)    / 1_000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function startCooldownDisplay() {
  clearInterval(countdownInterval);
  const banner  = document.getElementById('cooldown-banner');
  const timerEl = document.getElementById('cooldown-timer');
  const btn     = document.getElementById('vote-btn');
  const badge   = document.getElementById('voted-badge');

  function tick() {
    const rem = msUntilNextVote();
    if (rem <= 0) {
      clearInterval(countdownInterval);
      banner.classList.remove('show');
      btn.style.display = '';
      btn.disabled = true;
      btn.textContent = 'Select a Royal First';
      badge.style.display = 'none';
      document.querySelectorAll('.cand-card').forEach(el => el.style.pointerEvents = '');
      return;
    }
    timerEl.textContent = formatCountdown(rem);
  }

  banner.classList.add('show');
  btn.style.display = 'none';
  badge.style.display = 'inline-flex';
  document.querySelectorAll('.cand-card').forEach(el => el.style.pointerEvents = 'none');
  tick();
  countdownInterval = setInterval(tick, 1_000);
}

/* ─── Firebase init ─── */
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
try { getAnalytics(app); } catch(_) {}

const VOTES_DOC = doc(db, 'royalmog', 'votes');

/* ─── Snapshot listener with anomaly detection ─── */
let isFirstSnapshot = true;

onSnapshot(VOTES_DOC, snap => {
  const data = snap.exists() ? snap.data() : {};

  // On the very first snapshot, just seed the baseline — don't diff yet,
  // since we have nothing to compare against and any value would look
  // like a "spike from zero".
  if (isFirstSnapshot) {
    isFirstSnapshot = false;
    for (const [id, count] of Object.entries(data)) {
      if (VALID_IDS.has(id)) {
        lastKnownCounts.set(id, { count: Number(count), ts: Date.now() });
      }
    }
  } else {
    // Run anomaly detection asynchronously (don't block render)
    runAnomalyDetection(db, data).catch(console.error);
  }

  renderRankings(data);
}, err => {
  console.warn('Snapshot error', err);
  document.getElementById('rankings-content').innerHTML =
    `<div class="empty-state"><span class="e-crown">♛</span>Could not load rankings.<br>Check your connection.</div>`;
});

/* ─── Render rankings ─── */
function renderRankings(data) {
  const sorted = ALL
    .map(c => ({ ...c, v: Number.isFinite(data[c.id]) ? Math.max(0, data[c.id]) : 0 }))
    .sort((a, b) => b.v - a.v);

  const tot  = sorted.reduce((s, c) => s + c.v, 0);
  const maxV = sorted[0]?.v || 1;

  document.getElementById('total-label').textContent = `${tot} vote${tot !== 1 ? 's' : ''} cast`;

  if (tot === 0) {
    document.getElementById('rankings-content').innerHTML =
      `<div class="empty-state"><span class="e-crown">♛</span>No votes yet.<br>Be the first to crown a royal.</div>`;
    return;
  }

  const top3   = sorted.slice(0, 3);
  const rest   = sorted.slice(3);
  const podOrd = top3.length === 1 ? [null, top3[0], null]
               : top3.length === 2 ? [null, top3[0], top3[1]]
               : [top3[1], top3[0], top3[2]];
  const pCls   = ['p2', 'p1', 'p3'];
  const pMedal = ['2nd Place', '1st Place', '3rd Place'];

  const podHTML = podOrd.map((c, i) => {
    if (!c) return `<div class="pod-card" style="visibility:hidden"></div>`;
    const pct     = Math.round((c.v / tot) * 100);
    const name    = escapeHTML(c.name);
    const url     = escapeHTML(ttUrl(c.tiktok));
    const type    = isPrincess(c.id) ? 'Princess of' : 'Prince of';
    // Anomaly badge in rankings
    const suspect = flaggedCandidates.has(c.id)
      ? `<span class="rank-suspect-badge" title="Suspicious vote spike detected">⚠️ Under Review</span>` : '';
    return `
      <div class="pod-card ${pCls[i]}${flaggedCandidates.has(c.id) ? ' rank-suspect' : ''}">
        <div class="pod-medal">${pMedal[i]}</div>
        ${avatarImg(c, 'pod-avatar-wrap', 'pod-avatar-fallback', isPrincess(c.id) ? '♛' : '♔')}
        <div class="pod-type">${type}</div>
        <div class="pod-name">${name}</div>
        ${suspect}
        <div class="pod-votes">${c.v}</div>
        <div class="pod-pct">${pct}%</div>
        <a class="pod-tt" href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  const listHTML = rest.map((c, i) => {
    const pct     = Math.round((c.v / tot) * 100);
    const barW    = Math.round((c.v / maxV) * 100);
    const name    = escapeHTML(c.name);
    const url     = escapeHTML(ttUrl(c.tiktok));
    const type    = isPrincess(c.id) ? 'Princess of' : 'Prince of';
    const suspect = flaggedCandidates.has(c.id)
      ? `<span class="rank-suspect-badge" title="Suspicious vote spike detected">⚠️ Under Review</span>` : '';
    return `
      <div class="rank-row${flaggedCandidates.has(c.id) ? ' rank-suspect' : ''}" style="animation-delay:${i * 0.04}s">
        <div class="rank-num">${i + 4}</div>
        ${avatarImg(c, 'rank-avatar', 'rank-avatar-fallback', isPrincess(c.id) ? '♛' : '♔')}
        <div>
          <div class="rank-name">${name}</div>
          <div class="rank-type">${type}</div>
          ${suspect}
        </div>
        <div class="rank-bar">
          <div class="rank-track"><div class="rank-fill" style="width:${barW}%"></div></div>
        </div>
        <div class="rank-vcount">${c.v} <span style="font-size:10px;color:var(--text3)">${pct}%</span></div>
        <a class="rank-tt" href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  document.getElementById('rankings-content').innerHTML =
    `<div class="podium">${podHTML}</div><div class="rank-list">${listHTML}</div>`;
}

/* ─── Build vote grid ─── */
function buildGrid(gridId, list, princessFlag) {
  document.getElementById(gridId).innerHTML = list.map(c => {
    const name = escapeHTML(c.name);
    const url  = escapeHTML(ttUrl(c.tiktok));
    const type = princessFlag ? 'Princess of' : 'Prince of';
    const id   = escapeHTML(c.id);
    return `
      <div class="cand-card" id="card-${id}" data-name="${name.toLowerCase()}">
        <div class="cand-check"><svg viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1"/></svg></div>
        ${avatarImg(c, 'cand-avatar-wrap', 'cand-avatar-fallback', princessFlag ? '♛' : '♔')}
        <div class="cand-label">${type}</div>
        <div class="cand-name">${name}</div>
        <a class="cand-tt" href="${url}" target="_blank" rel="noopener noreferrer">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  list.forEach(c => {
    document.getElementById('card-' + c.id).addEventListener('click', e => {
      if (e.target.closest('.cand-tt')) return;
      selectCand(c.id);
    });
  });
}

let selected = null;

function selectCand(id) {
  if (!VALID_IDS.has(id)) return;
  if (!canVote()) {
    showToast('You have already voted today. Come back tomorrow!', 'error');
    return;
  }
  selected = selected === id ? null : id;
  document.querySelectorAll('.cand-card').forEach(el =>
    el.classList.toggle('selected', el.id === 'card-' + selected));
  const btn = document.getElementById('vote-btn');
  if (selected) {
    const c = ALL.find(x => x.id === selected);
    btn.textContent = `Vote for ${c.name}`;
    btn.disabled = false;
  } else {
    btn.textContent = 'Select a Royal First';
    btn.disabled = true;
  }
}

/* ─── Submit vote ─── */
async function submitVote() {
  if (!selected)          { showToast('Please select a candidate first.', 'error'); return; }
  if (!canVote())         { showToast('You have already voted today!', 'error'); return; }
  if (attemptThrottled()) { showToast('Please wait a moment before trying again.', 'error'); return; }
  if (!VALID_IDS.has(selected)) {
    showToast('Invalid selection. Please refresh and try again.', 'error');
    return;
  }

  const btn = document.getElementById('vote-btn');
  btn.disabled = true;
  btn.textContent = 'Casting…';

  const candidateId = selected;

  try {
    await runTransaction(db, async tx => {
      await tx.get(VOTES_DOC);
      if (!VALID_IDS.has(candidateId)) throw new Error('Invalid candidate');
      tx.set(VOTES_DOC, { [candidateId]: increment(1) }, { merge: true });
    });

    markVoted();
    const c = ALL.find(x => x.id === candidateId);
    showToast(`Your vote for ${c.name} has been cast. Long may they reign.`, 'success');
    selected = null;
    startCooldownDisplay();

  } catch (err) {
    console.error(err);
    showToast('Something went wrong. Please try again.', 'error');
    btn.disabled = false;
    const c = ALL.find(x => x.id === selected);
    btn.textContent = c ? `Vote for ${c.name}` : 'Select a Royal First';
  }
}

/* ─── Search filter ─── */
function filterCandidates() {
  const raw = document.getElementById('search-input').value;
  const q = raw.replace(/<[^>]*>/g, '').toLowerCase().trim();
  let vP = 0, vPr = 0;

  PRINCES.forEach(c => {
    const el = document.getElementById('card-' + c.id);
    const hide = q && !c.name.toLowerCase().includes(q);
    el.classList.toggle('hidden', hide);
    if (!hide) vP++;
  });
  PRINCESSES.forEach(c => {
    const el = document.getElementById('card-' + c.id);
    const hide = q && !c.name.toLowerCase().includes(q);
    el.classList.toggle('hidden', hide);
    if (!hide) vPr++;
  });
  document.getElementById('lbl-princes').style.display    = vP  > 0 ? '' : 'none';
  document.getElementById('lbl-princesses').style.display = vPr > 0 ? '' : 'none';
  document.getElementById('no-results').style.display     = (vP + vPr === 0) ? 'block' : 'none';
}

/* ─── Toast ─── */
let toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ─── Tab switching ─── */
function switchTab(id, btn) {
  const allowed = ['rankings', 'vote', 'about'];
  if (!allowed.includes(id)) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
}

/* ─── Expose to HTML ─── */
window.submitVote       = submitVote;
window.filterCandidates = filterCandidates;
window.showToast        = showToast;
window.switchTab        = switchTab;

/* ─── Init ─── */
buildGrid('grid-princes',    PRINCES,    false);
buildGrid('grid-princesses', PRINCESSES, true);
if (!canVote()) { startCooldownDisplay(); }
