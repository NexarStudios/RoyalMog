/**
 * RoyalMog — Frontend Application
 * --------------------------------
 * All voting logic goes through the Cloudflare Worker API.
 * This file contains NO database credentials and NO direct DB access.
 *
 * Architecture:
 *   Browser → POST /vote  (with Turnstile token) → Worker → D1
 *   Browser → GET  /votes                         → Worker → D1
 */

'use strict';

// ─── Configuration ────────────────────────────────────────────────────────────
// ↓ Replace with your deployed Worker URL after `npx wrangler deploy`
const API_BASE = 'https://royalmog-api.ottenwebstudios.workers.dev';

// ↓ Replace with your Turnstile SITE key (public, safe to expose)
//   Get it from: Cloudflare Dashboard → Turnstile → your site → Site Key
const TURNSTILE_SITE_KEY = '0x4AAAAAADQC0Z_vATLLyBY-';

// ─── Candidate data (mirrors the database — used only for rendering) ──────────
// The backend has its own identical list and ignores any ID not in it.
// Princesses use the 'p_' prefix to match the database IDs.
const PRINCES = [
  { id: 'paris',         name: 'Paris',        tiktok: '@princeoffparis' },
  { id: 'sweden',        name: 'Sweden',       tiktok: '@sippeee_g' },
  { id: 'germany',       name: 'Germany',      tiktok: '@princeoffgermanyy' },
  { id: 'holland',       name: 'Holland',      tiktok: '@sjorshelenklaken' },
  { id: 'leeuw',         name: 'Leeuwarden',   tiktok: '@nietsido' },
  { id: 'turkey',        name: 'Turkey',       tiktok: '@celikkardaa' },
  { id: 'italy',         name: 'Italy',        tiktok: '@picasso_jr_' },
  { id: 'norway',        name: 'Norway',       tiktok: '@princeaugusteezzz' },
  { id: 'brabant',       name: 'Brabant',      tiktok: '@sunglassguy3' },
  { id: 'iraq',          name: 'Iraq',         tiktok: '@theprinceoffiraq' },
  { id: 'persia',        name: 'Persia',       tiktok: '@clovis.fillion' },
  { id: 'miami',         name: 'Miami',        tiktok: '@calithekid1' },
  { id: 'egypt',         name: 'Egypt',        tiktok: '@svfnxo' },
  { id: 'utrecht',       name: 'Utrecht',      tiktok: '@christiaan_devierde' },
  { id: 'belgium',       name: 'Belgium',      tiktok: '@finlaystp' },
  { id: 'poland#2',      name: 'Poland 2',     tiktok: '@princeofpoland90' },
  { id: 'zuid-holland',  name: 'Zuid-Holland', tiktok: '@jeanjacquescorjan' },
  { id: 'limburg',       name: 'Limburg',      tiktok: '@princeoflimburg' },
  { id: 'denmark',       name: 'Denmark',      tiktok: '@princeofdenmark4' },
  { id: 'baronen',       name: 'Baronen',      tiktok: '@realbaronen' },
  { id: 'schweiz',       name: 'Schweiz',      tiktok: '@posbackup' },
  { id: 'baltzar',       name: 'Baltzar',      tiktok: '@baltzar.1' },
  { id: 'switserland#2', name: 'Switserland',  tiktok: '@theprinceofswitzerland' },
  { id: 'hungary',       name: 'Hungary',      tiktok: '@kobold.exee' },
  { id: 'india',         name: 'India',        tiktok: '@iblamebilall' },
  { id: 'ireland',       name: 'Ireland',      tiktok: '@prince_irelandtt' },
  { id: 'sápmi',         name: 'Sápmi',        tiktok: '@thesword665' },
  { id: 'estonia',       name: 'Estonia',      tiktok: '@JoosepMogs' },
  { id: 'malta',         name: 'Malta',        tiktok: '@denilsonzammit' },
  { id: 'bosnia',        name: 'Bosnia',       tiktok: '@melvin_vem_annars' },
  { id: 'england',       name: 'England',      tiktok: '@princeofengland8' },
];

const PRINCESSES = [
  { id: 'p_poland',         name: 'Poland',        tiktok: '@princessoffpoland' },
  { id: 'p_cannes',         name: 'Cannes',        tiktok: '@lyndaydl' },
  { id: 'p_gelderland',     name: 'Gelderland',    tiktok: '@princessa1005' },
  { id: 'p_monaco',         name: 'Monaco',        tiktok: '@sara.vasa10' },
  { id: 'p_switserland',    name: 'Switserland',   tiktok: '@princessofswissitaly' },
  { id: 'p_friesland',      name: 'Friesland',     tiktok: '@princess_of_friesland' },
  { id: 'p_czech republic', name: 'Czech Republic',tiktok: '@tessynaaa' },
  { id: 'p_england',        name: 'England',       tiktok: '@.johanna_ov' },
  { id: 'p_sweden#2',       name: 'Sweden',        tiktok: '@livfrandegard' },
  { id: 'p_greece',         name: 'Greece',        tiktok: '@princessofgreece_' },
  { id: 'p_portugal',       name: 'Portugal',      tiktok: '@raquelbtw' },
];

// ─── Derived constants ────────────────────────────────────────────────────────
const ALL       = Object.freeze([...PRINCES, ...PRINCESSES]);
const VALID_IDS = new Set(ALL.map(c => c.id));

const TT_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
           2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33
           6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34
           0 0 0 6.33-6.34V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.07-.36z"/>
</svg>`;

// ─── State ────────────────────────────────────────────────────────────────────
let selected         = null;    // currently selected candidate ID
let currentVotes     = {};      // { candidateId: voteCount }
let countdownInterval = null;

// ─── Cooldown helpers (localStorage — supplementary to server-side check) ─────
// This is a UX convenience only. The server enforces the real rate limit.
const VOTE_TS_KEY  = 'rm_vote_ts_v3';   // bumped from v2 to reset old cooldowns
const RATE_MS      = 86_400_000;         // 24 hours

function getVoteTimestamp() { return parseInt(localStorage.getItem(VOTE_TS_KEY) || '0', 10); }
function markVotedLocally() { localStorage.setItem(VOTE_TS_KEY, Date.now().toString()); }
function msUntilNextVote()  {
  const elapsed = Date.now() - getVoteTimestamp();
  return elapsed >= RATE_MS ? 0 : RATE_MS - elapsed;
}
function canVoteLocally() { return msUntilNextVote() === 0; }

// ─── Security: XSS prevention ─────────────────────────────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Security: validate TikTok handles before building URLs ──────────────────
function ttUrl(handle) {
  const h = handle.startsWith('@') ? handle : '@' + handle;
  return /^@[\w.]+$/.test(h) ? `https://www.tiktok.com/${h}` : '#';
}

function isPrincess(id) { return id.startsWith('p_'); }

function imgPath(c) {
  const prefix = isPrincess(c.id) ? 'princess' : 'prince';
  // Strip the 'p_' prefix for the filename so images are named consistently
  const fileId = isPrincess(c.id) ? c.id.slice(2) : c.id;
  return `images/${prefix}-${encodeURIComponent(fileId)}.jpg`;
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

// ─── API calls ────────────────────────────────────────────────────────────────

/** Fetch current vote counts from the Worker. */
async function fetchVotes() {
  const res  = await fetch(`${API_BASE}/votes`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Unknown error');
  return data.votes; // { candidateId: count, ... }
}

/**
 * Submit a vote via the Worker.
 * @param {string} candidateId   - Must be in VALID_IDS
 * @param {string} turnstileToken - From the Turnstile widget
 */
async function postVote(candidateId, turnstileToken) {
  const res  = await fetch(`${API_BASE}/vote`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ candidateId, turnstileToken }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data; // { ok: true, votes: newCount }
}

// ─── Rankings renderer ────────────────────────────────────────────────────────

function renderRankings(votesData) {
  const sorted = ALL
    .map(c => ({ ...c, v: Math.max(0, Number.isFinite(votesData[c.id]) ? votesData[c.id] : 0) }))
    .sort((a, b) => b.v - a.v);

  const tot  = sorted.reduce((s, c) => s + c.v, 0);
  const maxV = sorted[0]?.v || 1;

  document.getElementById('total-label').textContent =
    `${tot} vote${tot !== 1 ? 's' : ''} cast`;

  if (tot === 0) {
    document.getElementById('rankings-content').innerHTML =
      `<div class="empty-state">
        <span class="e-crown">♛</span>
        No votes yet.<br>Be the first to crown a royal.
      </div>`;
    return;
  }

  // Podium (top 3)
  const top3   = sorted.slice(0, 3);
  const rest   = sorted.slice(3);
  const podOrd = top3.length === 1 ? [null, top3[0], null]
               : top3.length === 2 ? [null, top3[0], top3[1]]
               : [top3[1], top3[0], top3[2]];
  const pCls   = ['p2', 'p1', 'p3'];
  const pLabel = ['2nd Place', '1st Place', '3rd Place'];

  const podHTML = podOrd.map((c, i) => {
    if (!c) return `<div class="pod-card" style="visibility:hidden"></div>`;
    const pct  = Math.round((c.v / tot) * 100);
    const name = escapeHTML(c.name);
    const url  = escapeHTML(ttUrl(c.tiktok));
    const type = isPrincess(c.id) ? 'Princess of' : 'Prince of';
    return `
      <div class="pod-card ${pCls[i]}">
        <div class="pod-medal">${pLabel[i]}</div>
        ${avatarImg(c, 'pod-avatar-wrap', 'pod-avatar-fallback', isPrincess(c.id) ? '♛' : '♔')}
        <div class="pod-type">${type}</div>
        <div class="pod-name">${name}</div>
        <div class="pod-votes">${c.v}</div>
        <div class="pod-pct">${pct}%</div>
        <a class="pod-tt" href="${url}" target="_blank" rel="noopener noreferrer"
           onclick="event.stopPropagation()">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  // Rest of list (#4 onwards)
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
          <div class="rank-track">
            <div class="rank-fill" style="width:${barW}%"></div>
          </div>
        </div>
        <div class="rank-vcount">
          ${c.v}
          <span style="font-size:10px;color:var(--text3)">${pct}%</span>
        </div>
        <a class="rank-tt" href="${url}" target="_blank" rel="noopener noreferrer"
           onclick="event.stopPropagation()">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  document.getElementById('rankings-content').innerHTML =
    `<div class="podium">${podHTML}</div><div class="rank-list">${listHTML}</div>`;
}

/** Load rankings from API and render. Called on page load and after voting. */
async function loadAndRenderRankings() {
  try {
    currentVotes = await fetchVotes();
    renderRankings(currentVotes);
  } catch (err) {
    console.warn('Failed to load rankings:', err);
    document.getElementById('rankings-content').innerHTML =
      `<div class="empty-state">
        <span class="e-crown">♛</span>
        Could not load rankings.<br>Check your connection.
      </div>`;
  }
}

// ─── Vote grid builder ────────────────────────────────────────────────────────

function buildGrid(gridId, list, princessFlag) {
  document.getElementById(gridId).innerHTML = list.map(c => {
    const name = escapeHTML(c.name);
    const url  = escapeHTML(ttUrl(c.tiktok));
    const type = princessFlag ? 'Princess of' : 'Prince of';
    const id   = escapeHTML(c.id);
    return `
      <div class="cand-card" id="card-${CSS.escape(id)}" data-name="${name.toLowerCase()}" data-id="${id}">
        <div class="cand-check">
          <svg viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1"/></svg>
        </div>
        ${avatarImg(c, 'cand-avatar-wrap', 'cand-avatar-fallback', princessFlag ? '♛' : '♔')}
        <div class="cand-label">${type}</div>
        <div class="cand-name">${name}</div>
        <a class="cand-tt" href="${url}" target="_blank" rel="noopener noreferrer">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  // Attach click listeners (using data-id avoids re-querying by constructed ID)
  document.getElementById(gridId).querySelectorAll('.cand-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.cand-tt')) return;
      selectCand(card.dataset.id);
    });
  });
}

// ─── Candidate selection ──────────────────────────────────────────────────────

function selectCand(id) {
  if (!VALID_IDS.has(id)) return;

  if (!canVoteLocally()) {
    showToast('You have already voted today. Come back tomorrow!', 'error');
    return;
  }

  selected = selected === id ? null : id;

  document.querySelectorAll('.cand-card').forEach(el =>
    el.classList.toggle('selected', el.dataset.id === selected));

  const btn = document.getElementById('vote-btn');
  if (selected) {
    const c = ALL.find(x => x.id === selected);
    btn.textContent = `Vote for ${c.name}`;
    btn.disabled    = false;
  } else {
    btn.textContent = 'Select a Royal First';
    btn.disabled    = true;
  }
}

// ─── Turnstile widget management ──────────────────────────────────────────────

let turnstileWidgetId = null;

function mountTurnstile() {
  // Only mount once
  if (turnstileWidgetId !== null) return;

  const container = document.getElementById('turnstile-container');
  if (!container || typeof turnstile === 'undefined') return;

  turnstileWidgetId = turnstile.render('#turnstile-container', {
    sitekey:  TURNSTILE_SITE_KEY,
    theme:    'dark',
    size:     'normal',
    callback: () => {},   // token auto-captured on submit
  });
}

function getTurnstileToken() {
  if (typeof turnstile === 'undefined' || turnstileWidgetId === null) return null;
  return turnstile.getResponse(turnstileWidgetId);
}

function resetTurnstile() {
  if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
    turnstile.reset(turnstileWidgetId);
  }
}

// ─── Submit vote ──────────────────────────────────────────────────────────────

async function submitVote() {
  if (!selected) {
    showToast('Please select a candidate first.', 'error');
    return;
  }
  if (!canVoteLocally()) {
    showToast('You have already voted today!', 'error');
    return;
  }
  if (!VALID_IDS.has(selected)) {
    showToast('Invalid selection. Please refresh and try again.', 'error');
    return;
  }

  // Get Turnstile CAPTCHA token
  const token = getTurnstileToken();
  if (!token) {
    showToast('Please complete the CAPTCHA first.', 'error');
    return;
  }

  const btn = document.getElementById('vote-btn');
  btn.disabled    = true;
  btn.textContent = 'Casting…';

  const candidateId = selected;

  try {
    const result = await postVote(candidateId, token);

    // Optimistically update local vote data
    currentVotes[candidateId] = result.votes;

    // Mark voted locally (UX convenience — server enforces real limit)
    markVotedLocally();

    const c = ALL.find(x => x.id === candidateId);
    showToast(`Your vote for ${c.name} has been cast. Long may they reign.`, 'success');

    selected = null;
    document.querySelectorAll('.cand-card').forEach(el => el.classList.remove('selected'));
    startCooldownDisplay();

    // Switch to rankings tab and refresh after vote
    setTimeout(() => {
      document.querySelectorAll('.tab')[0].click();
      loadAndRenderRankings();
    }, 800);

  } catch (err) {
    console.error('Vote error:', err);

    // If the server says already-voted, enforce cooldown locally too
    if (err.message.includes('already voted')) {
      markVotedLocally();
      startCooldownDisplay();
    }

    showToast(err.message || 'Something went wrong. Please try again.', 'error');
    resetTurnstile();
    btn.disabled    = false;
    const c = ALL.find(x => x.id === selected);
    btn.textContent = c ? `Vote for ${c.name}` : 'Select a Royal First';
  }
}

// ─── Cooldown display ─────────────────────────────────────────────────────────

function formatCountdown(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000)    / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startCooldownDisplay() {
  clearInterval(countdownInterval);

  const banner   = document.getElementById('cooldown-banner');
  const timerEl  = document.getElementById('cooldown-timer');
  const btn      = document.getElementById('vote-btn');
  const badge    = document.getElementById('voted-badge');

  function tick() {
    const rem = msUntilNextVote();
    if (rem <= 0) {
      clearInterval(countdownInterval);
      banner.classList.remove('show');
      btn.style.display = '';
      btn.disabled      = true;
      btn.textContent   = 'Select a Royal First';
      badge.style.display = 'none';
      // Re-mount Turnstile for next vote
      mountTurnstile();
      document.querySelectorAll('.cand-card').forEach(el => (el.style.pointerEvents = ''));
      return;
    }
    timerEl.textContent = formatCountdown(rem);
  }

  banner.classList.add('show');
  btn.style.display   = 'none';
  badge.style.display = 'inline-flex';
  document.querySelectorAll('.cand-card').forEach(el => (el.style.pointerEvents = 'none'));
  tick();
  countdownInterval = setInterval(tick, 1_000);
}

// ─── Search filter ────────────────────────────────────────────────────────────

function filterCandidates() {
  // Strip HTML from search input before using it
  const q = document.getElementById('search-input').value
    .replace(/<[^>]*>/g, '').toLowerCase().trim();

  let vP = 0, vPr = 0;

  PRINCES.forEach(c => {
    const el   = document.getElementById('grid-princes').querySelector(`[data-id="${CSS.escape(c.id)}"]`);
    const hide = q && !c.name.toLowerCase().includes(q);
    el?.classList.toggle('hidden', hide);
    if (!hide) vP++;
  });
  PRINCESSES.forEach(c => {
    const el   = document.getElementById('grid-princesses').querySelector(`[data-id="${CSS.escape(c.id)}"]`);
    const hide = q && !c.name.toLowerCase().includes(q);
    el?.classList.toggle('hidden', hide);
    if (!hide) vPr++;
  });

  document.getElementById('lbl-princes').style.display    = vP  > 0 ? '' : 'none';
  document.getElementById('lbl-princesses').style.display = vPr > 0 ? '' : 'none';
  document.getElementById('no-results').style.display     = (vP + vPr === 0) ? 'block' : 'none';
}

// ─── Toast notifications ──────────────────────────────────────────────────────

let toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;   // textContent — never innerHTML — prevents XSS
  t.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

// ─── Tab switching ────────────────────────────────────────────────────────────

function switchTab(id, btn) {
  const allowed = ['rankings', 'vote', 'about'];
  if (!allowed.includes(id)) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');

  // Mount Turnstile the first time the vote tab is opened
  if (id === 'vote') {
    setTimeout(mountTurnstile, 100);
  }
}

// ─── Expose to inline HTML event handlers ────────────────────────────────────
window.submitVote       = submitVote;
window.filterCandidates = filterCandidates;
window.showToast        = showToast;
window.switchTab        = switchTab;

// ─── Initialise ───────────────────────────────────────────────────────────────
buildGrid('grid-princes',    PRINCES,    false);
buildGrid('grid-princesses', PRINCESSES, true);

if (!canVoteLocally()) {
  startCooldownDisplay();
}

// Initial rankings load
loadAndRenderRankings();

// Auto-refresh rankings every 60 seconds
setInterval(loadAndRenderRankings, 60_000);
