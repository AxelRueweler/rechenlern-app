'use strict';

/* ============================================================
   Tagesaufgabe und Belohnungen
   - Jeden Tag eine Aufgabe passend zur Klasse, +10 Bonussterne
   - Neue Avatare werden mit den gesammelten Sternen (Gesamtsumme) freigeschaltet
   ============================================================ */

const CHALLENGE_BONUS = 10;

const REWARD_AVATARS = [
  [50, '🦉'], [100, '🐳'], [150, '🦋'], [200, '🐝'], [300, '🦩'], [400, '🐉'],
  [500, '🦸'], [650, '🧙'], [800, '🤖'], [1000, '👽'], [1250, '🦕'], [1500, '👑']
];

function isUnlocked(p, avatar) {
  const r = REWARD_AVATARS.find(([, a]) => a === avatar);
  return !r || (p && p.stars >= r[0]);
}

function newlyUnlocked(before, after) {
  return REWARD_AVATARS.filter(([t]) => before < t && after >= t).map(([, a]) => a);
}

function nextReward(p) { return REWARD_AVATARS.find(([t]) => p.stars < t) || null; }

/* ---------- Tagesaufgaben ---------- */

function challengeList(p) {
  const list = [];
  const blitzGoal = p.grade >= 5 ? 12 : 6;
  list.push({
    id: 'blitz', icon: '⚡', text: `Schaffe in der Blitzrunde mindestens ${blitzGoal} Aufgaben.`,
    start: { screen: 'multPlay', params: { mode: 'blitz' } },
    ok: (i) => i.type === 'mult' && i.mode === 'blitz' && i.correct >= blitzGoal
  });
  list.push({
    id: 'mix', icon: '🎲', text: 'Rechne im Einmaleins-Mix mindestens 9 von 10 richtig.',
    start: { screen: 'multPlay', params: { mode: 'mix' } },
    ok: (i) => i.type === 'mult' && i.mode === 'mix' && i.correct >= 9
  });
  if (p.grade >= 3) {
    list.push({
      id: 'rest', icon: '🧩', text: 'Teilen mit Rest: mindestens 8 von 10 richtig.',
      start: { screen: 'restPlay', params: {} },
      ok: (i) => i.type === 'rest' && i.correct >= 8
    });
  }
  const need = p.grade >= 5 ? 7 : 6;
  fracTopicsFor(p).forEach((t) => list.push({
    id: 'frac-' + t.id, icon: t.icon, text: `Brüche „${t.name}“: mindestens ${need} von 8 richtig.`,
    start: { screen: 'fracPlay', params: { topic: t.id } },
    ok: (i) => i.type === 'frac' && i.topic === t.id && i.correct >= need
  }));
  return list;
}

// Gleiche Aufgabe den ganzen Tag, für jedes Kind eine andere
function hashStr(s) { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; }

function todaysChallenge(p) {
  const list = challengeList(p);
  const c = list[hashStr(todayKey() + p.id) % list.length];
  const done = p.challenge && p.challenge.date === todayKey() && p.challenge.done;
  return { ...c, done };
}

function checkChallenge(p, info) {
  const c = todaysChallenge(p);
  if (c.done || !info || !c.ok(info)) return null;
  p.challenge = { date: todayKey(), id: c.id, done: true };
  p.challengeCount = (p.challengeCount || 0) + 1;
  return { id: c.id, bonus: CHALLENGE_BONUS };
}

function challengeCardHtml(p) {
  const c = todaysChallenge(p);
  if (c.done) {
    return `<div class="challenge done"><span class="cicon">✅</span><div class="cbody"><b>Tagesaufgabe geschafft!</b><span class="muted small">Morgen wartet eine neue Aufgabe.</span></div></div>`;
  }
  return `
    <div class="challenge">
      <span class="cicon">🎯</span>
      <div class="cbody"><b>Tagesaufgabe</b><span>${c.icon} ${esc(c.text)}</span><span class="muted small">Belohnung: +${CHALLENGE_BONUS} ⭐</span></div>
      <button class="btn" id="challenge-go">Los ▶</button>
    </div>`;
}

function bindChallenge(node, p) {
  const b = node.querySelector('#challenge-go');
  if (!b) return;
  b.addEventListener('click', () => {
    const c = todaysChallenge(p);
    p.multPrefs = p.multPrefs || { rows: [2, 5, 10], div: p.grade >= 4 };
    go(c.start.screen, { profileId: p.id, ...c.start.params });
  });
}

/* ---------- Belohnungen anzeigen ---------- */

function rewardPanelHtml(p) {
  const nx = nextReward(p);
  const prev = REWARD_AVATARS.filter(([t]) => p.stars >= t).pop();
  const from = prev ? prev[0] : 0;
  const pct = nx ? Math.round((p.stars - from) / (nx[0] - from) * 100) : 100;
  return `
    <div class="panel">
      <div class="row-head"><h2 style="margin:0">Belohnungen</h2><span class="muted small">${REWARD_AVATARS.filter(([t]) => p.stars >= t).length} von ${REWARD_AVATARS.length} freigeschaltet</span></div>
      ${nx ? `<p style="margin:0 0 8px">Noch <b>${nx[0] - p.stars} ⭐</b> bis <span style="font-size:28px">${nx[1]}</span></p>
      <div class="goalbar" style="max-width:none;margin-bottom:16px"><span style="width:${pct}%"></span></div>` : '<p>Du hast alle Avatare freigeschaltet! 👑</p>'}
      <div class="reward-grid">
        ${REWARD_AVATARS.map(([t, a]) => `<div class="rslot ${p.stars >= t ? 'has' : ''}"><span>${a}</span>${p.stars >= t ? 'frei' : t + ' ⭐'}</div>`).join('')}
      </div>
      <p class="muted small">Freigeschaltete Avatare kannst du über ✏️ auf deiner Startseite auswählen.</p>
    </div>`;
}

Object.assign(BADGES, {
  challenge1: { icon: '🎯', name: 'Erste Tagesaufgabe' }
});
