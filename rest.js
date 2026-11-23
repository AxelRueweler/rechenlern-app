'use strict';

/* ============================================================
   Teilen mit Rest (ab Klasse 3)
   Beispiel: 17 : 5 = 3 Rest 2
   ============================================================ */

const REST_SESSION_LEN = 10;

function restStat(p) { return p.stats.rest || { c: 0, w: 0, best: 0 }; }
function restStars(p) {
  const b = restStat(p).best;
  return b >= 100 ? 3 : b >= 75 ? 2 : b >= 50 ? 1 : 0;
}

function makeRestTask(prev) {
  let d, q, r;
  do {
    d = 2 + Math.floor(Math.random() * 9);          // Teiler 2 … 10
    q = 1 + Math.floor(Math.random() * 10);         // Ergebnis 1 … 10
    r = Math.random() < 0.15 ? 0 : 1 + Math.floor(Math.random() * (d - 1)); // meistens mit Rest
  } while (prev && prev.d === d && prev.q === q);
  return { n: d * q + r, d, q, r };
}

screens.restPlay = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  const s = { done: 0, correct: 0, streak: 0, bestStreak: 0, stars: 0, t: null, locked: false, start: Date.now(), val: { q: '', r: '' }, field: 'q' };

  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="quit" aria-label="Beenden">✖</button>
      <div class="progress"><div class="bar" id="bar"></div></div>
      <span class="stars-pill" id="streak">🔥 0</span>
    </div>
    <div class="play">
      <div class="question-card" id="card">
        <div class="rest-q"><span id="task"></span> =</div>
        <div class="rest-a">
          <button class="slot rslot active" id="sq">?</button>
          <span class="rest-word">Rest</span>
          <button class="slot rslot" id="sr">?</button>
        </div>
        <div class="feedback" id="fb"></div>
        <div class="explain" id="explain"></div>
      </div>
      <div id="input"></div>
    </div>`);
  const els = {};
  ['quit', 'bar', 'streak', 'card', 'task', 'sq', 'sr', 'fb', 'explain', 'input'].forEach((id) => { els[id] = node.getElementById(id); });
  const restQ = node.querySelector('.rest-q');
  attachSpeaker(els.card, () => [restQ], ' Mit Rest.');

  const padHtml = `
    <div class="pad">
      ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
      <button class="key alt" data-k="del" aria-label="Löschen">⌫</button>
      <button class="key" data-k="0">0</button>
      <button class="key ok" data-k="ok" aria-label="Prüfen">✔</button>
      <button class="key alt swap" data-k="swap">Ergebnis ⇄ Rest</button>
    </div>`;

  function draw() {
    els.sq.textContent = s.val.q || '?';
    els.sr.textContent = s.val.r || '?';
    els.sq.classList.toggle('active', s.field === 'q');
    els.sr.classList.toggle('active', s.field === 'r');
  }

  function updateBar() {
    els.bar.style.width = (s.done / REST_SESSION_LEN * 100) + '%';
    els.streak.textContent = '🔥 ' + s.streak;
  }

  function bindPad() {
    els.input.innerHTML = padHtml;
    els.input.querySelectorAll('.key').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 120);
      press(b.dataset.k);
    }));
  }

  function next() {
    if (s.t && !document.body.contains(els.card)) return; // Runde wurde verlassen
    if (s.done >= REST_SESSION_LEN) return finish();
    s.t = makeRestTask(s.t);
    s.val = { q: '', r: '' };
    s.field = 'q';
    s.locked = false;
    els.task.textContent = `${s.t.n} : ${s.t.d}`;
    els.card.className = 'question-card';
    els.fb.textContent = '';
    els.explain.textContent = '';
    bindPad();
    draw();
    autoSpeakTask(() => [restQ], ' Mit Rest.');
  }

  function press(k) {
    if (s.locked) return;
    const f = s.field;
    if (k === 'del') {
      if (!s.val[f] && f === 'r') s.field = 'q'; else s.val[f] = s.val[f].slice(0, -1);
    } else if (k === 'swap') s.field = f === 'q' ? 'r' : 'q';
    else if (k === 'ok') {
      if (!s.val.q) { s.field = 'q'; draw(); return; }
      if (!s.val.r) { s.field = 'r'; draw(); return; }
      return check();
    } else if (s.val[f].length < 2) {
      s.val[f] += k;
      // Nach dem Ergebnis automatisch zum Rest springen, wenn die Zahl fertig sein muss
      if (f === 'q' && s.val.q.length === 2) s.field = 'r';
    }
    draw();
  }

  function check() {
    s.locked = true;
    const { n, d, q, r } = s.t;
    const gq = Number(s.val.q), gr = Number(s.val.r);
    const ok = gq === q && gr === r;
    s.done++;
    const st = p.stats.rest || (p.stats.rest = { c: 0, w: 0, best: 0 });
    if (ok) {
      st.c++; s.correct++; s.streak++; s.stars++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      els.card.className = 'question-card good';
      els.fb.textContent = praise(s.streak);
      beep('good');
      setTimeout(next, 900);
    } else {
      st.w++; s.streak = 0;
      els.card.className = 'question-card bad';
      let hint = '';
      if (gq * d <= n && n - gq * d >= d) hint = `Der Rest ${n - gq * d} ist größer als ${d - 1}. Da passt noch eine ${d} hinein! `;
      else if (gq * d > n) hint = `${gq} · ${d} = ${gq * d}, das ist schon mehr als ${n}. `;
      els.fb.textContent = `Richtig ist: ${q} Rest ${r}`;
      els.explain.textContent = hint + `${q} · ${d} = ${q * d}, und ${n} − ${q * d} = ${r}.`;
      speakMistake([els.fb, els.explain]);
      beep('bad');
      els.input.innerHTML = '<div class="color-actions"><span></span><button class="btn" id="next">Weiter ▶</button></div>';
      els.input.querySelector('#next').addEventListener('click', next);
    }
    updateBar();
    save();
  }

  function finish() {
    document.removeEventListener('keydown', onKey);
    const st = p.stats.rest || (p.stats.rest = { c: 0, w: 0, best: 0 });
    const pct = Math.round(s.correct / s.done * 100);
    st.best = Math.max(st.best || 0, pct);
    const perfect = s.correct === s.done;
    if (perfect) s.stars += 3;
    const day = finishRound(p, s.stars);
    p.sessions.push({ type: 'rest', date: new Date().toISOString(), correct: s.correct, total: s.done, ms: Date.now() - s.start, stars: s.stars });
    if (p.sessions.length > 500) p.sessions = p.sessions.slice(-500);
    p.best = p.best || {};
    p.best.streak = Math.max(p.best.streak || 0, s.bestStreak);
    const nb = [award(p, 'first'), award(p, 'restFirst')];
    if (perfect) nb.push(award(p, 'perfect'), award(p, 'restPerfect'));
    if (s.bestStreak >= 10) nb.push(award(p, 'streak10'));
    save();
    state.screen = 'multDone';
    state.params = { profileId: p.id, mode: 'rest', correct: s.correct, total: s.done, stars: s.stars, perfect, day, badges: [...nb, ...day.badges].filter(Boolean) };
    history.replaceState({ screen: state.screen, params: state.params }, '');
    render();
    beep('win');
  }

  function onKey(e) {
    if (state.screen !== 'restPlay') return document.removeEventListener('keydown', onKey);
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('ok');
    else if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'r') { e.preventDefault(); press('swap'); }
  }
  document.addEventListener('keydown', onKey);

  els.sq.addEventListener('click', () => { if (!s.locked) { s.field = 'q'; draw(); } });
  els.sr.addEventListener('click', () => { if (!s.locked) { s.field = 'r'; draw(); } });
  els.quit.addEventListener('click', () => { document.removeEventListener('keydown', onKey); save(); history.back(); });

  next();
  updateBar();
  return node;
};

Object.assign(BADGES, {
  restFirst: { icon: '🧩', name: 'Erste Rest-Runde' },
  restPerfect: { icon: '🎯', name: 'Rest-Profi' }
});
