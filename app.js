// ================================================================
// FILE: app.js
// ================================================================
// Replace this URL with your deployed Cloudflare Worker URL.
// This is the ONLY config needed in the frontend — no Firebase keys.
// ================================================================
const API_BASE = 'https://your-worker.your-subdomain.workers.dev';

// ── Candidate data ───────────────────────────────────────────────
const PRINCES = [
  { id:'paris',          name:'Paris',         tiktok:'@princeoffparis' },
  { id:'sweden',         name:'Sweden',        tiktok:'@sippeee_g' },
  { id:'germany',        name:'Germany',       tiktok:'@princeoffgermanyy' },
  { id:'holland',        name:'Holland',       tiktok:'@sjorshelenklaken' },
  { id:'leeuw',          name:'Leeuwarden',    tiktok:'@nietsido' },
  { id:'turkey',         name:'Turkey',        tiktok:'@celikkardaa' },
  { id:'italy',          name:'Italy',         tiktok:'@picasso_jr_' },
  { id:'norway',         name:'Norway',        tiktok:'@princeaugusteezzz' },
  { id:'brabant',        name:'Brabant',       tiktok:'@sunglassguy3' },
  { id:'iraq',           name:'Iraq',          tiktok:'@theprinceoffiraq' },
  { id:'persia',         name:'Persia',        tiktok:'@clovis.fillion' },
  { id:'miami',          name:'Miami',         tiktok:'@calithekid1' },
  { id:'egypt',          name:'Egypt',         tiktok:'@svfnxo' },
  { id:'utrecht',        name:'Utrecht',       tiktok:'@christiaan_devierde' },
  { id:'belgium',        name:'Belgium',       tiktok:'@finlaystp' },
  { id:'poland#2',       name:'Poland 2',      tiktok:'@princeofpoland90' },
  { id:'zuid-holland',   name:'Zuid-Holland',  tiktok:'@jeanjacquescorjan' },
  { id:'limburg',        name:'Limburg',       tiktok:'@princeoflimburg' },
  { id:'denmark',        name:'Denmark',       tiktok:'@princeofdenmark4' },
  { id:'baronen',        name:'Baronen',       tiktok:'@realbaronen' },
  { id:'schweiz',        name:'Schweiz',       tiktok:'@posbackup' },
  { id:'baltzar',        name:'Baltzar',       tiktok:'@baltzar.1' },
  { id:'switserland#2',  name:'Switserland',   tiktok:'@theprinceofswitzerland' },
  { id:'hungary',        name:'Hungary',       tiktok:'@kobold.exee' },
];

const PRINCESSES = [
  { id:'poland',          name:'Poland',        tiktok:'@princessoffpoland' },
  { id:'cannes',          name:'Cannes',        tiktok:'@lyndaydl' },
  { id:'gelderland',      name:'Gelderland',    tiktok:'@princessa1005' },
  { id:'monaco',          name:'Monaco',        tiktok:'@sara.vasa10' },
  { id:'switserland',     name:'Switserland',   tiktok:'@princessofswissitaly' },
  { id:'friesland',       name:'Friesland',     tiktok:'@princess_of_friesland' },
  { id:'czech republic',  name:'Czech Republic',tiktok:'@tessynaaa' },
];

const ALL = [...PRINCES, ...PRINCESSES];
const PRINCESS_IDS = new Set(PRINCESSES.map(p => p.id));

const TT_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.07-.36z"/></svg>`;

function ttUrl(handle) {
  return `https://www.tiktok.com/${handle.startsWith('@') ? handle : '@' + handle}`;
}

function isPrincess(id) { return PRINCESS_IDS.has(id); }

function imgPath(c) {
  return `images/${isPrincess(c.id) ? 'princess' : 'prince'}-${c.id}.jpg`;
}

function avatarImg(c, wrapClass, fallbackClass, glyph) {
  return `<div class="${wrapClass}">
    <img src="${imgPath(c)}" alt="${c.name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="${fallbackClass}" style="display:none">${glyph}</span>
  </div>`;
}

// ── Cooldown (client-side display only — real enforcement is server-side) ──
const VOTE_TS_KEY = 'rm_vote_ts_v2';
const RATE_MS     = 86400000;

function getVoteTimestamp() { return parseInt(localStorage.getItem(VOTE_TS_KEY) || '0', 10); }
function markVoted()        { localStorage.setItem(VOTE_TS_KEY, String(Date.now())); }
function msUntilNextVote()  {
  const ts = getVoteTimestamp();
  if (!ts) return 0;
  const remaining = RATE_MS - (Date.now() - ts);
  return remaining > 0 ? remaining : 0;
}
function canVote() { return msUntilNextVote() === 0; }

let countdownInterval = null;

function formatCountdown(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
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
  countdownInterval = setInterval(tick, 1000);
}

// ── Fetch & render rankings ──────────────────────────────────────
async function loadRankings() {
  try {
    const res  = await fetch(`${API_BASE}/votes`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderRankings(data);
  } catch (err) {
    console.warn('Rankings fetch failed', err);
    document.getElementById('rankings-content').innerHTML =
      `<div class="empty-state"><span class="e-crown">♛</span>Could not load rankings.<br>Check your connection.</div>`;
  }
}

function renderRankings(data) {
  const sorted = ALL.map(c => ({ ...c, v: data[c.id] || 0 })).sort((a,b) => b.v - a.v);
  const tot    = sorted.reduce((s,c) => s + c.v, 0);
  const maxV   = sorted[0]?.v || 1;

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
  const pCls   = ['p2','p1','p3'];
  const pMedal = ['2nd Place','1st Place','3rd Place'];

  const podHTML = podOrd.map((c,i) => {
    if (!c) return `<div class="pod-card" style="visibility:hidden"></div>`;
    const pct = Math.round((c.v / tot) * 100);
    return `
      <div class="pod-card ${pCls[i]}">
        <div class="pod-medal">${pMedal[i]}</div>
        ${avatarImg(c,'pod-avatar-wrap','pod-avatar-fallback', isPrincess(c.id)?'♛':'♔')}
        <div class="pod-type">${isPrincess(c.id) ? 'Princess of' : 'Prince of'}</div>
        <div class="pod-name">${c.name}</div>
        <div class="pod-votes">${c.v}</div>
        <div class="pod-pct">${pct}%</div>
        <a class="pod-tt" href="${ttUrl(c.tiktok)}" target="_blank" rel="noopener noreferrer">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  const listHTML = rest.map((c,i) => {
    const pct  = Math.round((c.v / tot) * 100);
    const barW = Math.round((c.v / maxV) * 100);
    return `
      <div class="rank-row" style="animation-delay:${i * 0.04}s">
        <div class="rank-num">${i + 4}</div>
        ${avatarImg(c,'rank-avatar','rank-avatar-fallback', isPrincess(c.id)?'♛':'♔')}
        <div>
          <div class="rank-name">${c.name}</div>
          <div class="rank-type">${isPrincess(c.id) ? 'Princess of' : 'Prince of'}</div>
        </div>
        <div class="rank-bar">
          <div class="rank-track"><div class="rank-fill" style="width:${barW}%"></div></div>
        </div>
        <div class="rank-vcount">${c.v} <span style="font-size:10px;color:var(--text3)">${pct}%</span></div>
        <a class="rank-tt" href="${ttUrl(c.tiktok)}" target="_blank" rel="noopener noreferrer">
          ${TT_ICON} TikTok
        </a>
      </div>`;
  }).join('');

  document.getElementById('rankings-content').innerHTML =
    `<div class="podium">${podHTML}</div><div class="rank-list">${listHTML}</div>`;
}

// ── Vote grids ───────────────────────────────────────────────────
function buildGrid(gridId, list, princessFlag) {
  document.getElementById(gridId).innerHTML = list.map(c => `
    <div class="cand-card" id="card-${c.id}" data-name="${c.name.toLowerCase()}">
      <div class="cand-check"><svg viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1"/></svg></div>
      ${avatarImg(c,'cand-avatar-wrap','cand-avatar-fallback', princessFlag?'♛':'♔')}
      <div class="cand-label">${princessFlag ? 'Princess of' : 'Prince of'}</div>
      <div class="cand-name">${c.name}</div>
      <a class="cand-tt" href="${ttUrl(c.tiktok)}" target="_blank" rel="noopener noreferrer">
        ${TT_ICON} TikTok
      </a>
    </div>`).join('');

  list.forEach(c => {
    document.getElementById('card-' + c.id).addEventListener('click', e => {
      if (e.target.closest('.cand-tt')) return;
      selectCand(c.id);
    });
  });
}

let selected = null;

function selectCand(id) {
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

// ── Submit vote (calls Worker, not Firebase directly) ────────────
async function submitVote() {
  if (!selected)  { showToast('Please select a candidate first.', 'error'); return; }
  if (!canVote()) { showToast('You have already voted today!', 'error'); return; }

  const btn = document.getElementById('vote-btn');
  btn.disabled = true;
  btn.textContent = 'Casting…';

  const candidateId = selected;

  try {
    const res = await fetch(`${API_BASE}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const hrs  = Math.ceil((data.retryAfterSeconds || 86400) / 3600);
      showToast(`You've already voted. Come back in ~${hrs}h.`, 'error');
      // Sync local cooldown with server's remaining time
      if (data.retryAfterSeconds) {
        const serverCooldownStart = Date.now() - (RATE_MS - data.retryAfterSeconds * 1000);
        localStorage.setItem(VOTE_TS_KEY, String(serverCooldownStart));
      }
      startCooldownDisplay();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    markVoted();
    const c = ALL.find(x => x.id === candidateId);
    showToast(`Your vote for ${c.name} has been cast. Long may they reign.`, 'success');
    selected = null;
    startCooldownDisplay();
    // Refresh rankings after a short delay
    setTimeout(loadRankings, 800);

  } catch (err) {
    console.error(err);
    showToast('Something went wrong. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = selected ? `Vote for ${ALL.find(x => x.id === selected)?.name}` : 'Select a Royal First';
  }
}

// ── Search ───────────────────────────────────────────────────────
function filterCandidates() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  let vP = 0, vPr = 0;
  PRINCES.forEach(c => {
    const el   = document.getElementById('card-' + c.id);
    const hide = q && !c.name.toLowerCase().includes(q);
    el.classList.toggle('hidden', hide);
    if (!hide) vP++;
  });
  PRINCESSES.forEach(c => {
    const el   = document.getElementById('card-' + c.id);
    const hide = q && !c.name.toLowerCase().includes(q);
    el.classList.toggle('hidden', hide);
    if (!hide) vPr++;
  });
  document.getElementById('lbl-princes').style.display    = vP  > 0 ? '' : 'none';
  document.getElementById('lbl-princesses').style.display = vPr > 0 ? '' : 'none';
  document.getElementById('no-results').style.display     = (vP + vPr === 0) ? 'block' : 'none';
}

// ── Toast ────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

// ── Tab switching ────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
}

// ── Expose globals used by inline HTML handlers ──────────────────
window.submitVote      = submitVote;
window.filterCandidates = filterCandidates;
window.switchTab       = switchTab;
window.showToast       = showToast;

// ── Init ─────────────────────────────────────────────────────────
buildGrid('grid-princes',    PRINCES,    false);
buildGrid('grid-princesses', PRINCESSES, true);
loadRankings();

if (!canVote()) {
  startCooldownDisplay();
}
