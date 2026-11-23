'use strict';

/* ============================================================
   Einmaleins-Modul
   - Reihen auswählen oder "Mix" (passt sich an: schwierige Aufgaben kommen öfter)
   - Blitzrunde: 60 Sekunden so viele wie möglich
   - Ab Klasse 4 optional Umkehraufgaben (Geteilt)
   - Statistik pro Aufgabe: richtig, falsch, Serie
   ============================================================ */

const MULT_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SESSION_LEN = 10;
const BLITZ_SECONDS = 60;
const MASTERED_STREAK = 3;

/* ---------- Statistik ---------- */

function factKey(a, b) { return a + 'x' + b; }

function factStat(p, a, b) {
  return p.stats.mult[factKey(a, b)] || { c: 0, w: 0, s: 0 };
}

function recordFact(p, a, b, ok) {
  const k = factKey(a, b);
  const st = p.stats.mult[k] || { c: 0, w: 0, s: 0 };
  if (ok) { st.c++; st.s++; } else { st.w++; st.s = 0; }
  st.t = Date.now();
  p.stats.mult[k] = st;
  return st;
}

function isMastered(p, a, b) { return factStat(p, a, b).s >= MASTERED_STREAK; }

// 0 bis 3 Sterne pro Reihe
function rowStars(p, a) {
  const n = MULT_ROWS.filter((b) => isMastered(p, a, b)).length;
  if (n === 10) return 3;
  if (n >= 7) return 2;
  if (n >= 3) return 1;
  return 0;
}

function masteredCount(p) {
  let n = 0;
  MULT_ROWS.forEach((a) => MULT_ROWS.forEach((b) => { if (isMastered(p, a, b)) n++; }));
  return n;
}

// Gewicht: neue und oft falsche Aufgaben häufiger, gemeisterte selten
function factWeight(p, a, b) {
  const st = factStat(p, a, b);
  let w = 4 - Math.min(st.s, 3);            // 4 … 1
  if (st.c + st.w === 0) w += 1;            // noch nie gesehen
  if (st.w > st.c) w += 3;                  // häufig falsch
  if (b === 1 || b === 10 || a === 1 || a === 10) w *= 0.5; // leichte Aufgaben seltener
  return w;
}

function pickWeighted(items, weightFn) {
  const ws = items.map(weightFn);
  let r = Math.random() * ws.reduce((x, y) => x + y, 0);
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function makeQuestion(p, rows, withDiv, prev) {
  const facts = [];
  rows.forEach((a) => MULT_ROWS.forEach((b) => facts.push([a, b])));
  let f, tries = 0;
  do { f = pickWeighted(facts, ([a, b]) => factWeight(p, a, b)); tries++; }
  while (prev && f[0] === prev.a && f[1] === prev.b && tries < 10);
  const [a, b] = f;
  const div = withDiv && Math.random() < 0.35;
  // Bei Mal-Aufgaben manchmal die Faktoren tauschen (7·3 und 3·7)
  const swap = !div && Math.random() < 0.5;
  return div
    ? { a, b, type: 'div', text: `${a * b} : ${a}`, answer: b }
    : { a, b, type: 'mul', text: swap ? `${b} · ${a}` : `${a} · ${b}`, answer: a * b };
}

/* ---------- Klang (sehr leise, abschaltbar) ---------- */

let audioCtx;
function beep(kind) {
  if (state.data.settings && state.data.settings.sound === false) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'good' ? [660, 880] : kind === 'win' ? [523, 659, 784, 1047] : [220];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = kind === 'bad' ? 'triangle' : 'sine';
      o.frequency.value = f;
      const t0 = audioCtx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.25);
    });
  } catch (e) { /* kein Ton möglich */ }
}

/* ---------- Abzeichen ---------- */

const BADGES = {
  first: { icon: '🎉', name: 'Erste Runde' },
  perfect: { icon: '💯', name: 'Alles richtig' },
  streak10: { icon: '🔥', name: '10 in Folge' },
  streak25: { icon: '🌋', name: '25 in Folge' },
  blitz15: { icon: '⚡', name: 'Blitz 15' },
  blitz25: { icon: '🌩️', name: 'Blitz 25' },
  row: { icon: '🥇', name: 'Erste Reihe gemeistert' },
  half: { icon: '🧠', name: '50 Aufgaben gemeistert' },
  all: { icon: '👑', name: 'Einmaleins-König' }
};

function award(p, id) {
  if (p.badges.includes(id)) return null;
  p.badges.push(id);
  return BADGES[id];
}

/* ---------- Auswahl-Bildschirm ---------- */

screens.mult = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  const prefs = p.multPrefs || (p.multPrefs = { rows: [2, 5, 10], div: p.grade >= 4 });
  const sel = new Set(prefs.rows);
  const best = (p.best && p.best.blitz) || 0;

  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Zurück">⬅️</button>
      <h2 style="margin:0">Einmaleins</h2>
      <div class="spacer"></div>
      ${starPill(p)}
    </div>

    <div class="mode-grid">
      <button class="mode-card m-mix" id="mix">
        <span class="emoji">🎲</span>
        <span class="title">Mix</span>
        <span class="desc">Alle Reihen. Was noch schwer ist, kommt öfter.</span>
      </button>
      <button class="mode-card m-blitz" id="blitz">
        <span class="emoji">⚡</span>
        <span class="title">Blitzrunde</span>
        <span class="desc">${BLITZ_SECONDS} Sekunden. Rekord: <b>${best}</b></span>
      </button>
    </div>

    <div class="panel">
      <div class="row-head">
        <h2 style="margin:0">Reihen üben</h2>
        <span class="muted small">${masteredCount(p)} von 100 gemeistert</span>
      </div>
      <div class="rows-grid" id="rows">
        ${MULT_ROWS.map((a) => `
          <button class="row-btn" data-r="${a}" aria-pressed="${sel.has(a)}">
            <span class="num">${a}er</span>
            <span class="rstars">${'★'.repeat(rowStars(p, a))}<span class="off">${'★'.repeat(3 - rowStars(p, a))}</span></span>
          </button>`).join('')}
      </div>
      <label class="toggle">
        <input type="checkbox" id="div" ${prefs.div ? 'checked' : ''}>
        <span>Auch Geteilt-Aufgaben (z. B. 56 : 8)</span>
      </label>
      <div class="actions">
        <button class="btn" id="start">Los geht's ▶</button>
      </div>
    </div>`);

  const startBtn = node.getElementById('start');
  const sync = () => { startBtn.disabled = sel.size === 0; };
  sync();
  node.querySelectorAll('.row-btn').forEach((b) => b.addEventListener('click', () => {
    const r = Number(b.dataset.r);
    sel.has(r) ? sel.delete(r) : sel.add(r);
    b.setAttribute('aria-pressed', sel.has(r));
    sync();
  }));
  const divEl = node.getElementById('div');
  const persist = () => { prefs.rows = [...sel].sort((x, y) => x - y); prefs.div = divEl.checked; save(); };

  node.getElementById('back').addEventListener('click', () => history.back());
  startBtn.addEventListener('click', () => { persist(); go('multPlay', { profileId: p.id, mode: 'rows' }); });
  node.getElementById('mix').addEventListener('click', () => { persist(); go('multPlay', { profileId: p.id, mode: 'mix' }); });
  node.getElementById('blitz').addEventListener('click', () => { persist(); go('multPlay', { profileId: p.id, mode: 'blitz' }); });
  return node;
};

/* ---------- Spiel-Bildschirm ---------- */

let activeTimer = null;
function stopTimer() { if (activeTimer) { clearInterval(activeTimer); activeTimer = null; } }
window.addEventListener('popstate', stopTimer);

screens.multPlay = () => {
  stopTimer();
  const p = currentProfile();
  if (!p) return screens.profiles();
  const mode = state.params.mode;
  const rows = mode === 'rows' ? p.multPrefs.rows : MULT_ROWS;
  const withDiv = !!p.multPrefs.div;

  const s = {
    mode, done: 0, correct: 0, streak: 0, bestStreak: 0, stars: 0,
    retry: [],            // falsch beantwortete Aufgaben kommen später noch mal
    q: null, input: '', locked: false,
    start: Date.now(), endAt: mode === 'blitz' ? Date.now() + BLITZ_SECONDS * 1000 : 0,
    newBadges: []
  };

  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="quit" aria-label="Beenden">✖</button>
      <div class="progress"><div class="bar" id="bar"></div></div>
      <span class="stars-pill" id="streak">🔥 0</span>
    </div>
    <div class="play">
      <div class="question-card" id="card">
        <div class="q" id="q"></div>
        <div class="answer" id="ans">?</div>
        <div class="feedback" id="fb"></div>
      </div>
      <div class="pad" id="pad">
        ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
        <button class="key alt" data-k="del" aria-label="Löschen">⌫</button>
        <button class="key" data-k="0">0</button>
        <button class="key ok" data-k="ok" aria-label="Prüfen">✔</button>
      </div>
    </div>`);

  const $ = (id) => node.getElementById(id);
  const qEl = $('q'), ansEl = $('ans'), fbEl = $('fb'), cardEl = $('card'), barEl = $('bar'), streakEl = $('streak');

  function updateBar() {
    if (mode === 'blitz') {
      const left = Math.max(0, s.endAt - Date.now());
      barEl.style.width = (left / (BLITZ_SECONDS * 1000) * 100) + '%';
      barEl.textContent = Math.ceil(left / 1000) + ' s';
    } else {
      barEl.style.width = (s.done / SESSION_LEN * 100) + '%';
      barEl.textContent = '';
    }
    streakEl.textContent = (mode === 'blitz' ? '✔ ' + s.correct : '🔥 ' + s.streak);
  }

  function next() {
    if (mode !== 'blitz' && s.done >= SESSION_LEN && s.retry.length === 0) return finish();
    const due = s.retry.find((r) => r.due <= s.done);
    if (due && mode !== 'blitz') {
      s.retry.splice(s.retry.indexOf(due), 1);
      s.q = due.q;
    } else if (mode !== 'blitz' && s.done >= SESSION_LEN) {
      s.q = s.retry.shift().q;
    } else {
      s.q = makeQuestion(p, rows, withDiv, s.q);
    }
    s.input = '';
    s.locked = false;
    qEl.textContent = s.q.text + ' =';
    ansEl.textContent = '?';
    ansEl.className = 'answer';
    fbEl.textContent = '';
    cardEl.className = 'question-card';
  }

  function press(k) {
    if (s.locked) return;
    if (k === 'del') s.input = s.input.slice(0, -1);
    else if (k === 'ok') return check();
    else if (s.input.length < 3) s.input += k;
    ansEl.textContent = s.input || '?';
    ansEl.className = 'answer' + (s.input ? ' typed' : '');
  }

  function check() {
    if (!s.input) return;
    s.locked = true;
    const ok = Number(s.input) === s.q.answer;
    recordFact(p, s.q.a, s.q.b, ok);
    if (mode !== 'blitz' || ok) s.done++;
    if (ok) {
      s.correct++; s.streak++; s.stars++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      cardEl.className = 'question-card good';
      fbEl.textContent = praise(s.streak);
      beep('good');
    } else {
      s.streak = 0;
      cardEl.className = 'question-card bad';
      ansEl.innerHTML = `<s>${esc(s.input)}</s> ${s.q.answer}`;
      fbEl.textContent = 'Fast! Merk dir: ' + s.q.text + ' = ' + s.q.answer;
      beep('bad');
      if (mode !== 'blitz') s.retry.push({ q: s.q, due: s.done + 3 });
    }
    updateBar();
    save();
    setTimeout(next, ok ? (mode === 'blitz' ? 350 : 700) : 1900);
  }

  function finish() {
    stopTimer();
    document.removeEventListener('keydown', onKey);
    const perfect = mode !== 'blitz' && s.correct === s.done;
    if (perfect) s.stars += 3;
    addStars(p, s.stars);
    p.sessions.push({ type: 'mult', mode, date: new Date().toISOString(), correct: s.correct, total: s.done, ms: Date.now() - s.start, stars: s.stars });
    if (p.sessions.length > 500) p.sessions = p.sessions.slice(-500);
    p.best = p.best || {};
    let record = false;
    if (mode === 'blitz' && s.correct > (p.best.blitz || 0)) { p.best.blitz = s.correct; record = s.correct > 0; }
    p.best.streak = Math.max(p.best.streak || 0, s.bestStreak);

    const nb = [award(p, 'first')];
    if (perfect) nb.push(award(p, 'perfect'));
    if (s.bestStreak >= 10) nb.push(award(p, 'streak10'));
    if (s.bestStreak >= 25) nb.push(award(p, 'streak25'));
    if (mode === 'blitz' && s.correct >= 15) nb.push(award(p, 'blitz15'));
    if (mode === 'blitz' && s.correct >= 25) nb.push(award(p, 'blitz25'));
    if (MULT_ROWS.some((a) => rowStars(p, a) === 3)) nb.push(award(p, 'row'));
    const m = masteredCount(p);
    if (m >= 50) nb.push(award(p, 'half'));
    if (m === 100) nb.push(award(p, 'all'));
    save();

    state.screen = 'multDone';
    state.params = { profileId: p.id, mode, correct: s.correct, total: s.done, stars: s.stars, record, perfect, badges: nb.filter(Boolean) };
    history.replaceState({ screen: state.screen, params: state.params }, '');
    render();
    beep('win');
  }

  function onKey(e) {
    if (state.screen !== 'multPlay') return document.removeEventListener('keydown', onKey);
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('ok');
  }
  document.addEventListener('keydown', onKey);

  node.querySelectorAll('.key').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.classList.add('down');
    setTimeout(() => b.classList.remove('down'), 120);
    press(b.dataset.k);
  }));
  $('quit').addEventListener('click', () => {
    stopTimer();
    document.removeEventListener('keydown', onKey);
    save();
    history.back();
  });

  if (mode === 'blitz') {
    activeTimer = setInterval(() => {
      updateBar();
      if (Date.now() >= s.endAt) finish();
    }, 200);
  }
  next();
  updateBar();
  return node;
};

function praise(streak) {
  if (streak >= 10) return '🔥 ' + streak + ' in Folge! Unglaublich!';
  if (streak >= 5) return '🚀 ' + streak + ' in Folge!';
  return ['Super! ⭐', 'Richtig! 👍', 'Klasse! ✨', 'Genau! 🎯', 'Stark! 💪'][Math.floor(Math.random() * 5)];
}

/* ---------- Ergebnis ---------- */

screens.multDone = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  const r = state.params;
  const title = r.mode === 'blitz'
    ? (r.record ? 'Neuer Rekord! 🏆' : 'Zeit ist um! ⏱️')
    : (r.perfect ? 'Alles richtig! 💯' : r.correct >= r.total * 0.7 ? 'Gut gemacht! 🎉' : 'Weiter so! 💪');
  const line = r.mode === 'blitz'
    ? `Du hast <b>${r.correct}</b> Aufgaben in ${BLITZ_SECONDS} Sekunden geschafft.`
    : `<b>${r.correct}</b> von <b>${r.total}</b> Aufgaben richtig.`;
  const badges = (r.badges || []).map((b) => `<div class="new-badge"><span>${b.icon}</span>${esc(b.name)}</div>`).join('');

  const node = h(`
    <div class="done">
      <div class="confetti" aria-hidden="true">${Array.from('🎉⭐✨🎈🌟'.repeat(4)).map((c, i) => `<span style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s">${c}</span>`).join('')}</div>
      <div class="avatar big">${p.avatar}</div>
      <h1>${title}</h1>
      <p class="sub">${line}</p>
      <div class="earned">+${r.stars} ⭐</div>
      ${badges ? `<h2>Neues Abzeichen!</h2><div class="badge-row">${badges}</div>` : ''}
      <div class="actions" style="justify-content:center">
        <button class="btn secondary" id="menu">Zur Auswahl</button>
        <button class="btn" id="again">Noch mal ↻</button>
      </div>
    </div>`);
  node.getElementById('menu').addEventListener('click', () => history.back());
  node.getElementById('again').addEventListener('click', () => {
    state.screen = 'multPlay';
    state.params = { profileId: p.id, mode: r.mode };
    history.replaceState({ screen: state.screen, params: state.params }, '');
    render();
  });
  return node;
};
