'use strict';

/* ============================================================
   Fortschritt
   - Tagesziel (Anzahl Runden, im Eltern-Bereich einstellbar)
   - Tages-Streak: wie viele Tage in Folge das Tagesziel geschafft wurde
   - Übersicht: Kalender, Einmaleins-Tafel, Bruch-Themen, Abzeichen
   ============================================================ */

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function dailyGoal() { return (state.data.settings && state.data.settings.dailyGoal) || 2; }

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysAgo(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; }

function dayInfo(p, key) { return (p.days && p.days[key]) || { rounds: 0, stars: 0, met: false }; }

// Streak zählt Tage mit geschafftem Tagesziel. Ist heute noch offen, zählt der Streak bis gestern weiter.
function currentStreak(p) {
  let i = dayInfo(p, dateKey(daysAgo(0))).met ? 0 : 1;
  let n = 0;
  while (dayInfo(p, dateKey(daysAgo(i))).met) { n++; i++; }
  return n;
}

function todayDone(p) { return dayInfo(p, todayKey()).met; }

/* Wird am Ende jeder fertigen Runde aufgerufen (Einmaleins und Brüche) */
function finishRound(p, stars) {
  addStars(p, stars);
  p.days = p.days || {};
  const key = todayKey();
  const d = p.days[key] || (p.days[key] = { rounds: 0, stars: 0, met: false });
  d.rounds++;
  d.stars += stars;
  let goalJustReached = false;
  if (!d.met && d.rounds >= dailyGoal()) { d.met = true; goalJustReached = true; }
  const streak = currentStreak(p);
  p.best = p.best || {};
  p.best.dayStreak = Math.max(p.best.dayStreak || 0, streak);
  // Alte Tage aufräumen (ein Jahr reicht)
  const keys = Object.keys(p.days).sort();
  if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete p.days[k]);

  const badges = [];
  if (goalJustReached) {
    badges.push(award(p, 'day1'));
    if (streak >= 3) badges.push(award(p, 'days3'));
    if (streak >= 7) badges.push(award(p, 'days7'));
    if (streak >= 14) badges.push(award(p, 'days14'));
    if (streak >= 30) badges.push(award(p, 'days30'));
  }
  return { goalJustReached, streak, rounds: d.rounds, goal: dailyGoal(), met: d.met, badges: badges.filter(Boolean) };
}

Object.assign(BADGES, {
  day1: { icon: '✅', name: 'Erstes Tagesziel' },
  days3: { icon: '🔥', name: '3 Tage in Folge' },
  days7: { icon: '📅', name: '7 Tage in Folge' },
  days14: { icon: '🚀', name: '14 Tage in Folge' },
  days30: { icon: '🏅', name: '30 Tage in Folge' }
});

/* ---------- Bausteine ---------- */

function weekStrip(p) {
  const today = daysAgo(0);
  const dow = (today.getDay() + 6) % 7; // Montag = 0
  return `<div class="week">${WEEKDAYS.map((w, i) => {
    const offset = dow - i;
    const d = daysAgo(offset);
    const info = dayInfo(p, dateKey(d));
    const cls = offset < 0 ? 'future' : info.met ? 'met' : offset === 0 ? 'today' : info.rounds ? 'partial' : 'missed';
    const mark = info.met ? '🔥' : offset === 0 ? (info.rounds ? info.rounds + '/' + dailyGoal() : '·') : '';
    return `<div class="wday ${cls}"><span class="wname">${w}</span><span class="wdot">${mark}</span></div>`;
  }).join('')}</div>`;
}

function streakCardHtml(p) {
  const streak = currentStreak(p);
  const info = dayInfo(p, todayKey());
  const goal = dailyGoal();
  const left = Math.max(0, goal - info.rounds);
  const msg = info.met
    ? 'Tagesziel geschafft! Morgen geht es weiter.'
    : streak > 0
      ? `Noch ${left} ${left === 1 ? 'Runde' : 'Runden'}, dann hält dein Streak!`
      : `Schaffe heute ${goal} ${goal === 1 ? 'Runde' : 'Runden'} und starte einen Streak!`;
  const pct = Math.min(100, Math.round(info.rounds / goal * 100));
  return `
    <div class="streak-card ${info.met ? 'done' : ''}">
      <div class="flame ${streak ? '' : 'cold'}">🔥<span class="fnum">${streak}</span></div>
      <div class="sbody">
        <div class="stitle">${streak === 1 ? '1 Tag' : streak + ' Tage'} in Folge</div>
        <div class="smsg">${msg}</div>
        <div class="goalbar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(info.rounds, goal)}"><span style="width:${pct}%"></span></div>
      </div>
      ${weekStrip(p)}
    </div>`;
}

function dayBannerHtml(day) {
  if (!day) return '';
  if (day.goalJustReached) {
    return `<div class="day-banner win">🔥 Tagesziel geschafft! <b>${day.streak === 1 ? '1 Tag' : day.streak + ' Tage'}</b> in Folge.</div>`;
  }
  if (!day.met) {
    const left = day.goal - day.rounds;
    return `<div class="day-banner">Noch <b>${left} ${left === 1 ? 'Runde' : 'Runden'}</b> bis zum Tagesziel.</div>`;
  }
  return '';
}

/* ---------- Fortschritts-Seite ---------- */

screens.progress = () => {
  const p = currentProfile();
  if (!p) return screens.profiles();
  const streak = currentStreak(p);
  const best = (p.best && p.best.dayStreak) || 0;

  // Kalender: letzte 4 Wochen, Montag bis Sonntag
  const dow = (daysAgo(0).getDay() + 6) % 7;
  const start = dow + 21;
  let cal = '';
  for (let i = start; i >= -(6 - dow); i--) {
    const d = daysAgo(i);
    const info = dayInfo(p, dateKey(d));
    const cls = i < 0 ? 'future' : info.met ? 'met' : info.rounds ? 'partial' : 'none';
    cal += `<span class="cday ${cls} ${i === 0 ? 'is-today' : ''}" title="${d.toLocaleDateString('de-DE')}: ${info.rounds} Runden">${d.getDate()}</span>`;
  }

  // Einmaleins-Tafel 10 × 10
  let grid = '<span class="gh"></span>' + MULT_ROWS.map((b) => `<span class="gh">${b}</span>`).join('');
  MULT_ROWS.forEach((a) => {
    grid += `<span class="gh">${a}</span>`;
    MULT_ROWS.forEach((b) => {
      const st = factStat(p, a, b);
      const cls = st.s >= MASTERED_STREAK ? 'm' : st.c + st.w === 0 ? 'u' : st.w > st.c ? 'w' : 'l';
      grid += `<span class="gc ${cls}" title="${a} · ${b} = ${a * b}">${a * b}</span>`;
    });
  });

  const fracRows = fracTopicsFor(p).map((t) => {
    const st = topicStars(p, t.id);
    const ts = topicStat(p, t.id);
    return `<div class="list-row"><span style="font-size:32px">${t.icon}</span><div class="grow"><b>${t.name}</b><br><span class="muted small">${ts.c} richtig · ${ts.w} falsch</span></div><span class="rstars big">${'★'.repeat(st)}<span class="off">${'★'.repeat(3 - st)}</span></span></div>`;
  }).join('');

  const badges = Object.entries(BADGES).map(([id, b]) => {
    const has = p.badges.includes(id);
    return `<div class="bslot ${has ? 'has' : ''}"><span>${has ? b.icon : '🔒'}</span>${esc(b.name)}</div>`;
  }).join('');

  const rounds = p.sessions.length;
  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Zurück">⬅️</button>
      <h2 style="margin:0">Mein Fortschritt</h2>
      <div class="spacer"></div>
      ${starPill(p)}
    </div>

    ${streakCardHtml(p)}

    <div class="stat-row">
      <div class="stat"><span class="sv">${p.stars}</span><span class="sl">Sterne insgesamt</span></div>
      <div class="stat"><span class="sv">${best}</span><span class="sl">Längster Streak (Tage)</span></div>
      <div class="stat"><span class="sv">${rounds}</span><span class="sl">Runden gespielt</span></div>
      <div class="stat"><span class="sv">${(p.best && p.best.blitz) || 0}</span><span class="sl">Blitz-Rekord</span></div>
    </div>

    <div class="prog-grid">
      <div class="panel">
        <h2>Die letzten 4 Wochen</h2>
        <div class="cal">${WEEKDAYS.map((w) => `<span class="ch">${w}</span>`).join('')}${cal}</div>
        <div class="legend"><span><i class="lg met"></i>Ziel geschafft</span><span><i class="lg partial"></i>geübt</span><span><i class="lg none"></i>nicht geübt</span></div>
      </div>
      <div class="panel">
        <div class="row-head"><h2 style="margin:0">Einmaleins</h2><span class="muted small">${masteredCount(p)} von 100 gemeistert</span></div>
        <div class="mgrid">${grid}</div>
        <div class="legend"><span><i class="lg m"></i>sitzt</span><span><i class="lg l"></i>am Lernen</span><span><i class="lg w"></i>noch schwer</span><span><i class="lg u"></i>neu</span></div>
        ${p.grade >= 3 && typeof restStat === 'function' ? `<div class="list-row" style="margin-top:12px;border-top:2px solid var(--line)"><span style="font-size:32px">🧩</span><div class="grow"><b>Teilen mit Rest</b><br><span class="muted small">${restStat(p).c} richtig · ${restStat(p).w} falsch</span></div><span class="rstars big">${'★'.repeat(restStars(p))}<span class="off">${'★'.repeat(3 - restStars(p))}</span></span></div>` : ''}
      </div>
    </div>

    <div class="panel">
      <h2>Brüche (Klasse ${p.grade})</h2>
      ${fracRows}
    </div>

    <div class="panel">
      <div class="row-head"><h2 style="margin:0">Abzeichen</h2><span class="muted small">${p.badges.filter((id) => BADGES[id]).length} von ${Object.keys(BADGES).length}</span></div>
      <div class="badge-grid">${badges}</div>
    </div>`);
  node.getElementById('back').addEventListener('click', () => history.back());
  return node;
};
