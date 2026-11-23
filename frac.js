'use strict';

/* ============================================================
   Bruchrechnen-Modul
   Einstieg (ab Klasse 3): erkennen, einfärben, vergleichen, plus mit gleichem Nenner
   Aufbau (ab Klasse 5): erweitern, kürzen, vergleichen, plus/minus, mal
   ============================================================ */

const FRAC_SESSION_LEN = 8;

/* ---------- Mathe-Helfer ---------- */

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
function reduce(n, d) { const g = gcd(n, d) || 1; return [n / g, d / g]; }
function sameValue(a, b, c, d) { return a * d === b * c; }

/* ---------- Darstellung ---------- */

function fr(n, d, cls = '') {
  return `<span class="frac ${cls}"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;
}

function pie(n, k, size = 180) {
  const r = 46;
  let parts = '';
  if (n === 1) {
    parts = `<circle cx="50" cy="50" r="${r}" class="${k ? 'on' : 'off'}"/>`;
  } else {
    for (let i = 0; i < n; i++) {
      const a0 = (-90 + (360 * i) / n) * Math.PI / 180;
      const a1 = (-90 + (360 * (i + 1)) / n) * Math.PI / 180;
      const x0 = 50 + r * Math.cos(a0), y0 = 50 + r * Math.sin(a0);
      const x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1);
      parts += `<path d="M50,50 L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" class="${i < k ? 'on' : 'off'}"/>`;
    }
  }
  return `<svg class="pie" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${parts}</svg>`;
}

function bar(n, k) {
  return `<div class="fbar" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<span class="${i < k ? 'on' : ''}"></span>`).join('')}</div>`;
}

function visual(n, k) { return Math.random() < 0.5 ? pie(n, k) : `<div class="fbar-wrap">${bar(n, k)}</div>`; }

/* ---------- Themen ---------- */

const FRAC_TOPICS = [
  { id: 'erkennen', track: 'basic', icon: '🍕', name: 'Brüche erkennen', how: 'Wie viele Teile gibt es (unten)? Wie viele sind bunt (oben)?' },
  { id: 'faerben', track: 'basic', icon: '🎨', name: 'Brüche einfärben', how: 'Tippe so viele Teile an, wie oben im Bruch steht.' },
  { id: 'vergleichen', track: 'basic', icon: '⚖️', name: 'Vergleichen', how: 'Welcher Balken ist weiter gefüllt?' },
  { id: 'plus-gleich', track: 'basic', icon: '➕', name: 'Plus mit gleichem Nenner', how: 'Der Nenner bleibt gleich, die Zähler werden addiert.' },
  { id: 'erweitern', track: 'adv', icon: '🔍', name: 'Erweitern', how: 'Zähler und Nenner mit derselben Zahl malnehmen.' },
  { id: 'kuerzen', track: 'adv', icon: '✂️', name: 'Kürzen', how: 'Zähler und Nenner durch dieselbe Zahl teilen, bis es nicht mehr geht.' },
  { id: 'vergleichen2', track: 'adv', icon: '🔢', name: 'Vergleichen ohne Bild', how: 'Bring beide Brüche auf den gleichen Nenner, dann vergleiche die Zähler.' },
  { id: 'plusminus', track: 'adv', icon: '🧮', name: 'Plus und Minus', how: 'Erst auf einen gemeinsamen Nenner bringen, dann die Zähler rechnen.' },
  { id: 'mal', track: 'adv', icon: '✖️', name: 'Mal nehmen', how: 'Zähler mal Zähler, Nenner mal Nenner. Danach kürzen.' }
];

/* ---------- Aufgaben-Generatoren ----------
   Jede Aufgabe: { prompt, visual, input: 'choice'|'number'|'fraction'|'color',
                   options?, check(answer) -> {ok, note}, solution, explain } */

function fractionAnswerCheck(tn, td, { mustReduce = false } = {}) {
  return ([n, d]) => {
    if (!d) return { ok: false };
    if (!sameValue(n, d, tn, td)) return { ok: false };
    const [rn, rd] = reduce(tn, td);
    if (n === rn && d === rd) return { ok: true };
    if (mustReduce) return { ok: false, note: 'Gleich viel, aber du kannst noch weiter kürzen!' };
    return { ok: true, note: `Gekürzt wäre es ${rn}/${rd}.` };
  };
}

const GEN = {};

GEN.erkennen = (grade) => {
  const n = rnd(2, grade >= 5 ? 12 : 8);
  const k = rnd(1, n - 1);
  const opts = new Map();
  const add = (a, b) => { if (a > 0 && b > 1 && a < b && !opts.has(a + '/' + b)) opts.set(a + '/' + b, [a, b]); };
  add(k, n);
  add(n - k, n); add(k, n + 1); add(k + 1, n); add(k - 1, n); add(k, n - 1); add(k + 1, n + 1);
  const list = [[k, n], ...shuffle([...opts.values()].slice(1)).slice(0, 3)];
  return {
    prompt: 'Welcher Bruch ist bunt?',
    visual: visual(n, k),
    input: 'choice',
    options: shuffle(list).map(([a, b]) => ({ html: fr(a, b), value: a + '/' + b })),
    check: (v) => ({ ok: v === k + '/' + n }),
    solution: fr(k, n),
    explain: `Es sind ${n} gleiche Teile, ${k} davon sind bunt: ${k}/${n}.`
  };
};

GEN.faerben = (grade) => {
  // Manchmal gleichwertiger Bruch: z. B. 1/2 bei 6 Teilen
  let n, k, a, b;
  if (Math.random() < 0.35) {
    [a, b] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]);
    const m = pick([2, 3]);
    n = b * m; k = a * m;
  } else {
    n = rnd(3, grade >= 5 ? 10 : 8); k = rnd(1, n - 1); a = k; b = n;
  }
  return {
    prompt: `Färbe ${fr(a, b, 'inline')} ein!`,
    visual: '',
    input: 'color',
    parts: n,
    check: (count) => ({ ok: count === k }),
    solution: `${k} von ${n} Teilen`,
    explain: a === k ? `Oben steht ${k}, also ${k} Teile färben.` : `${a}/${b} ist genauso viel wie ${k}/${n}. Also ${k} von ${n} Teilen.`
  };
};

function compareTask(a, b, c, d, withVisual) {
  const l = a * d, r = c * b;
  const correct = l > r ? '>' : l < r ? '<' : '=';
  const vis = withVisual
    ? `<div class="cmp-vis"><div>${bar(b, a)}</div><div>${bar(d, c)}</div></div>`
    : '';
  const D = lcm(b, d);
  return {
    prompt: `${fr(a, b, 'big')} <span class="cmp-q">?</span> ${fr(c, d, 'big')}`,
    visual: vis,
    input: 'choice',
    options: [{ html: '&gt;', value: '>' }, { html: '=', value: '=' }, { html: '&lt;', value: '<' }],
    compact: true,
    check: (v) => ({ ok: v === correct }),
    solution: `${fr(a, b)} ${correct === '>' ? '&gt;' : correct === '<' ? '&lt;' : '='} ${fr(c, d)}`,
    explain: b === d
      ? 'Gleicher Nenner: Der größere Zähler gewinnt.'
      : a === c
        ? 'Gleicher Zähler: Je kleiner der Nenner, desto größer die Stücke.'
        : `Mit Nenner ${D}: ${a * D / b}/${D} und ${c * D / d}/${D}.`
  };
}

GEN.vergleichen = () => {
  const r = Math.random();
  if (r < 0.45) { // gleicher Nenner
    const n = rnd(3, 10); let a = rnd(1, n - 1), c = rnd(1, n - 1);
    if (a === c && Math.random() < 0.7) c = a === n - 1 ? a - 1 : a + 1;
    return compareTask(a, n, c, n, true);
  }
  if (r < 0.85) { // gleicher Zähler
    const a = rnd(1, 3); const b = rnd(a + 1, 10); let d = rnd(a + 1, 10);
    if (d === b) d = b === 10 ? b - 1 : b + 1;
    return compareTask(a, b, a, d, true);
  }
  const [a, b] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]);
  const m = pick([2, 3]);
  return Math.random() < 0.5 ? compareTask(a, b, a * m, b * m, true) : compareTask(a * m, b * m, a, b, true);
};

GEN.vergleichen2 = () => {
  const dens = [2, 3, 4, 5, 6, 8, 9, 10, 12];
  let a, b, c, d;
  do {
    b = pick(dens); d = pick(dens);
    a = rnd(1, b - 1); c = rnd(1, d - 1);
  } while (b === d || (a === c));
  if (Math.random() < 0.15) { const m = pick([2, 3]); const [x, y] = reduce(a, b); a = x; b = y; c = x * m; d = y * m; if (b === 1) { a = 1; b = 2; c = m; d = 2 * m; } }
  return compareTask(a, b, c, d, false);
};

GEN['plus-gleich'] = (grade) => {
  const n = rnd(3, 10);
  const maxSum = grade >= 5 ? n + 3 : n;
  const a = rnd(1, n - 1);
  const b = rnd(1, Math.max(1, Math.min(n - 1, maxSum - a)));
  return {
    prompt: `${fr(a, n, 'big')} <span class="op">+</span> ${fr(b, n, 'big')} <span class="op">=</span>`,
    visual: grade < 5 && a + b <= n
      ? `<div class="fbar-wrap"><div class="fbar" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<span class="${i < a ? 'on' : i < a + b ? 'on2' : ''}"></span>`).join('')}</div></div>`
      : '',
    input: 'fraction',
    check: fractionAnswerCheck(a + b, n),
    solution: fr(a + b, n),
    explain: `Nenner bleibt ${n}, Zähler: ${a} + ${b} = ${a + b}.`
  };
};

GEN.erweitern = () => {
  const [a, b] = reduce(rnd(1, 5), rnd(2, 7));
  if (a >= b) return GEN.erweitern();
  const m = rnd(2, 6);
  const askNum = Math.random() < 0.6;
  return {
    prompt: askNum
      ? `${fr(a, b, 'big')} <span class="op">=</span> ${fr('?', b * m, 'big')}`
      : `${fr(a, b, 'big')} <span class="op">=</span> ${fr(a * m, '?', 'big')}`,
    visual: '',
    input: 'number',
    check: (v) => ({ ok: v === (askNum ? a * m : b * m) }),
    solution: fr(a * m, b * m),
    explain: askNum
      ? `Der Nenner wurde mit ${m} malgenommen (${b} · ${m} = ${b * m}), also auch der Zähler: ${a} · ${m} = ${a * m}.`
      : `Der Zähler wurde mit ${m} malgenommen (${a} · ${m} = ${a * m}), also auch der Nenner: ${b} · ${m} = ${b * m}.`
  };
};

GEN.kuerzen = () => {
  let a, b;
  do { a = rnd(1, 7); b = rnd(2, 9); } while (a >= b || gcd(a, b) !== 1);
  const g = pick([2, 2, 3, 3, 4, 5, 6]);
  return {
    prompt: `Kürze so weit es geht: ${fr(a * g, b * g, 'big')} <span class="op">=</span>`,
    visual: '',
    input: 'fraction',
    check: fractionAnswerCheck(a, b, { mustReduce: true }),
    solution: fr(a, b),
    explain: `${a * g} und ${b * g} kann man beide durch ${g} teilen.`
  };
};

GEN.plusminus = () => {
  const pairs = [[2, 4], [2, 3], [3, 6], [3, 4], [4, 8], [2, 5], [4, 6], [2, 6], [3, 9], [5, 10], [4, 12], [6, 8], [3, 5]];
  let [b, d] = pick(pairs);
  if (Math.random() < 0.5) [b, d] = [d, b];
  let a = rnd(1, b - 1), c = rnd(1, d - 1);
  const minus = Math.random() < 0.45;
  if (minus && a * d < c * b) { [a, b, c, d] = [c, d, a, b]; }
  const D = lcm(b, d);
  const A = a * D / b, C = c * D / d;
  const resN = minus ? A - C : A + C;
  if (resN === 0) return GEN.plusminus();
  const sign = minus ? '−' : '+';
  return {
    prompt: `${fr(a, b, 'big')} <span class="op">${sign}</span> ${fr(c, d, 'big')} <span class="op">=</span>`,
    visual: '',
    input: 'fraction',
    check: fractionAnswerCheck(resN, D),
    solution: fr(...reduce(resN, D)),
    explain: `Gemeinsamer Nenner ${D}: ${A}/${D} ${sign} ${C}/${D} = ${resN}/${D}` + (gcd(resN, D) > 1 ? `, gekürzt ${reduce(resN, D).join('/')}.` : '.')
  };
};

GEN.mal = () => {
  const a = rnd(1, 5), b = rnd(a + 1, 9), c = rnd(1, 5), d = rnd(c + 1, 9);
  const withWhole = Math.random() < 0.25;
  if (withWhole) {
    const k = rnd(2, 5);
    return {
      prompt: `${k} <span class="op">·</span> ${fr(a, b, 'big')} <span class="op">=</span>`,
      visual: '',
      input: 'fraction',
      check: fractionAnswerCheck(k * a, b),
      solution: fr(...reduce(k * a, b)),
      explain: `Nur der Zähler wird malgenommen: ${k} · ${a} = ${k * a}, also ${k * a}/${b}.`
    };
  }
  return {
    prompt: `${fr(a, b, 'big')} <span class="op">·</span> ${fr(c, d, 'big')} <span class="op">=</span>`,
    visual: '',
    input: 'fraction',
    check: fractionAnswerCheck(a * c, b * d),
    solution: fr(...reduce(a * c, b * d)),
    explain: `Zähler: ${a} · ${c} = ${a * c}, Nenner: ${b} · ${d} = ${b * d}` + (gcd(a * c, b * d) > 1 ? `, gekürzt ${reduce(a * c, b * d).join('/')}.` : '.')
  };
};

/* ---------- Statistik ---------- */

function topicStat(p, id) {
  return p.stats.frac[id] || { c: 0, w: 0, best: 0 };
}
function topicStars(p, id) {
  const b = topicStat(p, id).best;
  return b >= 100 ? 3 : b >= 75 ? 2 : b >= 50 ? 1 : 0;
}
function fracTrack(p) { return p.grade >= 5 ? 'adv' : 'basic'; }
function fracTopicsFor(p) { return FRAC_TOPICS.filter((t) => t.track === fracTrack(p)); }
function fracStarsTotal(p) { return fracTopicsFor(p).reduce((s, t) => s + topicStars(p, t.id), 0); }

/* ---------- Themen-Auswahl ---------- */

screens.frac = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  // Nur die Übungen für die Klasse des Kindes zeigen (Klasse ändern: ✏️ im Profil)
  const tracks = p.grade >= 5
    ? [{ id: 'adv', name: 'Brüche für Klasse ' + p.grade, hint: 'Aufbau' }]
    : [{ id: 'basic', name: 'Brüche für Klasse ' + p.grade, hint: 'Einstieg' }];

  const section = (t) => `
    <div class="panel">
      <div class="row-head">
        <h2 style="margin:0">${t.name}</h2>
        <span class="muted small">${t.hint}</span>
      </div>
      <div class="topic-list">
        ${FRAC_TOPICS.filter((x) => x.track === t.id).map((x) => {
          const st = topicStars(p, x.id);
          return `
          <button class="topic" data-t="${x.id}">
            <span class="ticon">${x.icon}</span>
            <span class="tbody"><span class="tname">${x.name}</span><span class="thow">${x.how}</span></span>
            <span class="rstars">${'★'.repeat(st)}<span class="off">${'★'.repeat(3 - st)}</span></span>
          </button>`;
        }).join('')}
      </div>
    </div>`;

  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Zurück">⬅️</button>
      <h2 style="margin:0">Brüche</h2>
      <div class="spacer"></div>
      ${starPill(p)}
    </div>
    ${tracks.map(section).join('')}`);
  node.getElementById('back').addEventListener('click', () => history.back());
  node.querySelectorAll('.topic').forEach((b) => b.addEventListener('click', () => go('fracPlay', { profileId: p.id, topic: b.dataset.t })));
  return node;
};

/* ---------- Spiel ---------- */

screens.fracPlay = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  const topic = FRAC_TOPICS.find((t) => t.id === state.params.topic);
  if (!topic) return screens.frac();
  const s = { done: 0, correct: 0, streak: 0, bestStreak: 0, stars: 0, q: null, locked: false, start: Date.now() };

  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="quit" aria-label="Beenden">✖</button>
      <div class="progress"><div class="bar" id="bar"></div></div>
      <span class="stars-pill" id="streak">🔥 0</span>
    </div>
    <div class="fplay">
      <div class="question-card" id="card">
        <div class="fprompt" id="prompt"></div>
        <div class="fvisual" id="visual"></div>
        <div class="fanswer" id="answer"></div>
        <div class="feedback" id="fb"></div>
        <div class="explain" id="explain"></div>
      </div>
      <div class="finput" id="input"></div>
    </div>`);
  // Elemente einmal merken: nach dem Rendern ist das Fragment leer
  const els = {};
  ['quit', 'bar', 'streak', 'card', 'prompt', 'visual', 'answer', 'fb', 'explain', 'input'].forEach((id) => { els[id] = node.getElementById(id); });
  const $ = (id) => els[id];
  attachSpeaker(els.card, () => [els.prompt]);

  function updateBar() {
    $('bar').style.width = (s.done / FRAC_SESSION_LEN * 100) + '%';
    $('streak').textContent = '🔥 ' + s.streak;
  }

  function next() {
    if (s.q && !document.body.contains(els.card)) return; // Runde wurde verlassen
    if (s.done >= FRAC_SESSION_LEN) return finish();
    s.q = GEN[topic.id](p.grade);
    s.locked = false;
    $('card').className = 'question-card';
    $('prompt').innerHTML = s.q.prompt;
    $('visual').innerHTML = s.q.visual || '';
    $('fb').textContent = '';
    $('explain').textContent = '';
    $('answer').innerHTML = '';
    buildInput();
    autoSpeakTask(() => [els.prompt]);
  }

  // ---------- Eingabearten ----------
  function buildInput() {
    s.press = null;
    const q = s.q;
    const box = $('input');
    box.innerHTML = '';
    if (q.input === 'choice') {
      box.innerHTML = `<div class="choices ${q.compact ? 'compact' : ''}">${q.options.map((o) => `<button class="choice-btn" data-v="${o.value}">${o.html}</button>`).join('')}</div>`;
      box.querySelectorAll('.choice-btn').forEach((b) => b.addEventListener('click', () => {
        if (s.locked) return;
        b.classList.add('picked');
        submit(b.dataset.v);
      }));
    } else if (q.input === 'color') {
      $('visual').innerHTML = `<div class="fbar paint" id="paint">${Array.from({ length: q.parts }, (_, i) => `<button data-i="${i}" aria-label="Teil ${i + 1}"></button>`).join('')}</div>`;
      box.innerHTML = `<div class="color-actions"><span class="muted" id="count">0 von ${q.parts} gefärbt</span><button class="btn" id="ok">Fertig ✔</button></div>`;
      const paint = $('visual').querySelector('#paint');
      const upd = () => { box.querySelector('#count').textContent = paint.querySelectorAll('.on').length + ' von ' + q.parts + ' gefärbt'; };
      paint.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (!s.locked) { b.classList.toggle('on'); upd(); } }));
      box.querySelector('#ok').addEventListener('click', () => { if (!s.locked) submit(paint.querySelectorAll('.on').length); });
    } else {
      // Zahl oder Bruch über Ziffernfeld
      const isFrac = q.input === 'fraction';
      const val = { n: '', d: '', field: 'n' };
      $('answer').innerHTML = isFrac
        ? `<span class="frac input"><button class="fn slot active" id="sn">?</button><button class="fd slot" id="sd">?</button></span>`
        : `<span class="slot single active" id="sn">?</span>`;
      box.innerHTML = `
        <div class="pad">
          ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
          <button class="key alt" data-k="del" aria-label="Löschen">⌫</button>
          <button class="key" data-k="0">0</button>
          <button class="key ok" data-k="ok" aria-label="Prüfen">✔</button>
          ${isFrac ? '<button class="key alt swap" data-k="swap">⬆ Zähler / Nenner ⬇</button>' : ''}
        </div>`;
      const draw = () => {
        const sn = $('answer').querySelector('#sn'), sd = $('answer').querySelector('#sd');
        sn.textContent = val.n || '?';
        sn.classList.toggle('active', val.field === 'n');
        if (sd) { sd.textContent = val.d || '?'; sd.classList.toggle('active', val.field === 'd'); }
      };
      const press = (k) => {
        if (s.locked) return;
        const f = val.field;
        if (k === 'del') {
          if (!val[f] && isFrac && f === 'd') val.field = 'n'; else val[f] = val[f].slice(0, -1);
        } else if (k === 'swap') val.field = f === 'n' ? 'd' : 'n';
        else if (k === 'ok') {
          if (isFrac) {
            if (!val.n) { val.field = 'n'; draw(); return; }
            if (!val.d) { val.field = 'd'; draw(); return; }
            submit([Number(val.n), Number(val.d)]);
          } else if (val.n) submit(Number(val.n));
          return;
        } else if (val[f].length < 3) val[f] += k;
        draw();
      };
      s.press = press;
      if (isFrac) {
        $('answer').querySelector('#sn').addEventListener('click', () => { val.field = 'n'; draw(); });
        $('answer').querySelector('#sd').addEventListener('click', () => { val.field = 'd'; draw(); });
      }
      box.querySelectorAll('.key').forEach((b) => b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.classList.add('down');
        setTimeout(() => b.classList.remove('down'), 120);
        press(b.dataset.k);
      }));
    }
  }

  function submit(answer) {
    s.locked = true;
    const res = s.q.check(answer);
    s.done++;
    const st = p.stats.frac[topic.id] || (p.stats.frac[topic.id] = { c: 0, w: 0, best: 0 });
    if (res.ok) {
      st.c++; s.correct++; s.streak++; s.stars++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      $('card').className = 'question-card good';
      $('fb').textContent = praise(s.streak);
      if (res.note) $('explain').textContent = res.note;
      beep('good');
      if (s.q.input === 'choice' || s.q.input === 'color') $('answer').innerHTML = '';
    } else {
      st.w++; s.streak = 0;
      $('card').className = 'question-card bad';
      $('fb').innerHTML = (res.note ? esc(res.note) + ' ' : 'Nicht ganz. ') + 'Richtig ist: ' + s.q.solution;
      $('explain').textContent = s.q.explain;
      speakMistake([els.fb, els.explain]);
      beep('bad');
      // Bei Fehlern selbst weitertippen, damit die Erklärung gelesen werden kann
      $('input').innerHTML = '<div class="color-actions"><span></span><button class="btn" id="next">Weiter ▶</button></div>';
      $('input').querySelector('#next').addEventListener('click', next);
    }
    updateBar();
    save();
    if (res.ok) setTimeout(next, res.note ? 1800 : 900);
  }

  function finish() {
    document.removeEventListener('keydown', onKey);
    const st = p.stats.frac[topic.id] || (p.stats.frac[topic.id] = { c: 0, w: 0, best: 0 });
    const pct = Math.round(s.correct / s.done * 100);
    const before = topicStars(p, topic.id);
    st.best = Math.max(st.best || 0, pct);
    const perfect = s.correct === s.done;
    if (perfect) s.stars += 3;
    const day = finishRound(p, s.stars);
    p.sessions.push({ type: 'frac', topic: topic.id, date: new Date().toISOString(), correct: s.correct, total: s.done, ms: Date.now() - s.start, stars: s.stars });
    if (p.sessions.length > 500) p.sessions = p.sessions.slice(-500);
    p.best = p.best || {};
    p.best.streak = Math.max(p.best.streak || 0, s.bestStreak);
    const nb = [award(p, 'fracFirst')];
    if (perfect) nb.push(award(p, 'perfect'));
    if (s.bestStreak >= 10) nb.push(award(p, 'streak10'));
    const basicDone = FRAC_TOPICS.filter((t) => t.track === 'basic').every((t) => topicStars(p, t.id) >= 2);
    const advDone = FRAC_TOPICS.filter((t) => t.track === 'adv').every((t) => topicStars(p, t.id) >= 2);
    if (basicDone) nb.push(award(p, 'fracBasic'));
    if (advDone) nb.push(award(p, 'fracAdv'));
    save();
    state.screen = 'fracDone';
    state.params = { profileId: p.id, topic: topic.id, correct: s.correct, total: s.done, stars: s.stars, perfect, topicStars: topicStars(p, topic.id), newStars: topicStars(p, topic.id) > before, day, badges: [...nb, ...day.badges].filter(Boolean) };
    history.replaceState({ screen: state.screen, params: state.params }, '');
    render();
    beep('win');
  }

  function onKey(e) {
    if (state.screen !== 'fracPlay') return document.removeEventListener('keydown', onKey);
    if (!s.press) return;
    if (/^[0-9]$/.test(e.key)) s.press(e.key);
    else if (e.key === 'Backspace') s.press('del');
    else if (e.key === 'Enter') s.press('ok');
    else if (e.key === '/' || e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); s.press('swap'); }
  }
  document.addEventListener('keydown', onKey);

  $('quit').addEventListener('click', () => { document.removeEventListener('keydown', onKey); save(); history.back(); });
  next();
  updateBar();
  return node;
};

/* ---------- Ergebnis ---------- */

screens.fracDone = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  const r = state.params;
  const topic = FRAC_TOPICS.find((t) => t.id === r.topic);
  const title = r.perfect ? 'Alles richtig! 💯' : r.correct >= r.total * 0.7 ? 'Gut gemacht! 🎉' : 'Weiter so! 💪';
  const badges = (r.badges || []).map((b) => `<div class="new-badge"><span>${b.icon}</span>${esc(b.name)}</div>`).join('');
  const node = h(`
    <div class="done">
      <div class="confetti" aria-hidden="true">${Array.from('🍕⭐✨🎈🌟'.repeat(4)).map((c, i) => `<span style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.12}s">${c}</span>`).join('')}</div>
      <div class="avatar big">${p.avatar}</div>
      <h1>${title}</h1>
      <p class="sub"><b>${r.correct}</b> von <b>${r.total}</b> richtig bei „${esc(topic.name)}“.</p>
      <div class="earned">+${r.stars} ⭐</div>
      ${dayBannerHtml(r.day)}
      <p class="topic-stars">${'★'.repeat(r.topicStars)}<span class="off">${'★'.repeat(3 - r.topicStars)}</span>${r.newStars ? '<br><span class="small muted">Neuer Stern für dieses Thema!</span>' : ''}</p>
      ${badges ? `<h2>Neues Abzeichen!</h2><div class="badge-row">${badges}</div>` : ''}
      <div class="actions" style="justify-content:center">
        <button class="btn secondary" id="menu">Zur Auswahl</button>
        <button class="btn" id="again">Noch mal ↻</button>
      </div>
    </div>`);
  node.getElementById('menu').addEventListener('click', () => history.back());
  node.getElementById('again').addEventListener('click', () => {
    state.screen = 'fracPlay';
    state.params = { profileId: p.id, topic: r.topic };
    history.replaceState({ screen: state.screen, params: state.params }, '');
    render();
  });
  return node;
};

Object.assign(BADGES, {
  fracFirst: { icon: '🍕', name: 'Erste Bruch-Runde' },
  fracBasic: { icon: '🥧', name: 'Bruch-Einsteiger' },
  fracAdv: { icon: '🎓', name: 'Bruch-Profi' }
});
