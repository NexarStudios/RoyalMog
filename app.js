import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, onSnapshot,
         runTransaction, increment }              from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAnalytics }                           from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';

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
  { id:'india',       name:'India',       tiktok:'@iblamebilall' },
];

const PRINCESSES = [
  { id:'poland',           name:'Poland',          tiktok:'@princessoffpoland' },
  { id:'cannes',           name:'Cannes',          tiktok:'@lyndaydl' },
  { id:'gelderland',       name:'Gelderland',      tiktok:'@princessa1005' },
  { id:'monaco',           name:'Monaco',          tiktok:'@sara.vasa10' },
  { id:'switserland',      name:'Switserland',     tiktok:'@princessofswissitaly' },
  { id:'friesland',        name:'Friesland',       tiktok:'@princess_of_friesland' },
  { id:'czech republic',   name:'Czech Republic',  tiktok:'@tessynaaa' },
  { id:'england',   name:'England',  tiktok:'@.johanna_ov' },
];

/* ─── Derived helpers ─── */
const ALL = Object.freeze([...PRINCES, ...PRINCESSES]);

// Build a Set of valid IDs for O(1) lookup — used in vote validation
const VALID_IDS = new Set(ALL.map(c => c.id));

const TT_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.07-.36z"/></svg>`;

/* ─── Security: escape user-visible strings to prevent XSS ─── */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Security: validate TikTok handles before building URLs ─── */
function ttUrl(handle) {
  // Only allow @username format with safe characters
  const sanitized = handle.startsWith('@') ? handle : '@' + handle;
  if (!/^@[\w.]+$/.test(sanitized)) return '#';
  return `https://www.tiktok.com/${sanitized}`;
}

function isPrincess(id) { return PRINCESSES.some(p => p.id === id); }

function imgPath(c) {
  const prefix = isPrincess(c.id) ? 'princess' : 'prince';
  // Use encodeURIComponent for the id portion in case of special chars
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
const ATTEMPT_COOLDOWN_MS = 3000; // min 3 s between clicks regardless of state

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

onSnapshot(VOTES_DOC, snap => {
  const data = snap.exists() ? snap.data() : {};
  renderRankings(data);
}, err => {
  console.warn('Snapshot error', err);
  document.getElementById('rankings-content').innerHTML =
    `<div class="empty-state"><span class="e-crown">♛</span>Could not load rankings.<br>Check your connection.</div>`;
});

/* ─── Render rankings ─── */
function renderRankings(data) {
  // Only include entries whose keys are in our known VALID_IDS list
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
    const pct  = Math.round((c.v / tot) * 100);
    const name = escapeHTML(c.name);
    const url  = escapeHTML(ttUrl(c.tiktok));
    const type = isPrincess(c.id) ? 'Princess of' : 'Prince of';
    return `
      <div class="pod-card ${pCls[i]}">
        <div class="pod-medal">${pMedal[i]}</div>
        ${avatarImg(c, 'pod-avatar-wrap', 'pod-avatar-fallback', isPrincess(c.id) ? '♛' : '♔')}
        <div class="pod-type">${type}</div>
        <div class="pod-name">${name}</div>
        <div class="pod-votes">${c.v}</div>
        <div class="pod-pct">${pct}%</div>
        <a class="pod-tt" href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  const listHTML = rest.map((c, i) => {
    const pct  = Math.round((c.v / tot) * 100);
    const barW = Math.round((c.v / maxV) * 100);
    const name = escapeHTML(c.name);
    const url  = escapeHTML(ttUrl(c.tiktok));
    const type = isPrincess(c.id) ? 'Princess of' : 'Prince of';
    return `
      <div class="rank-row" style="animation-delay:${i * 0.04}s">
        <div class="rank-num">${i + 4}</div>
        ${avatarImg(c, 'rank-avatar', 'rank-avatar-fallback', isPrincess(c.id) ? '♛' : '♔')}
        <div>
          <div class="rank-name">${name}</div>
          <div class="rank-type">${type}</div>
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
  // Validate the ID is a known candidate
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

  // Final whitelist check — must be a known, canonical ID
  if (!VALID_IDS.has(selected)) {
    showToast('Invalid selection. Please refresh and try again.', 'error');
    return;
  }

  const btn = document.getElementById('vote-btn');
  btn.disabled = true;
  btn.textContent = 'Casting…';

  const candidateId = selected; // capture before any async gap

  try {
    await runTransaction(db, async tx => {
      // Read the doc inside the transaction for atomicity
      await tx.get(VOTES_DOC);
      // Re-validate inside the transaction
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
  // Strip any HTML/script injection from search value before using
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
  // Use textContent (not innerHTML) so the message can never inject markup
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ─── Tab switching ─── */
function switchTab(id, btn) {
  // Validate id against allowed tab names
  const allowed = ['rankings', 'vote', 'about'];
  if (!allowed.includes(id)) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
}

/* ─── Expose only what the HTML needs ─── */
window.submitVote       = submitVote;
window.filterCandidates = filterCandidates;
window.showToast        = showToast;
window.switchTab        = switchTab;

/* ─── Init ─── */
buildGrid('grid-princes',    PRINCES,    false);
buildGrid('grid-princesses', PRINCESSES, true);

if (!canVote()) {
  startCooldownDisplay();
}
