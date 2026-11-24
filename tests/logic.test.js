'use strict';
// Rechenlogik: läuft direkt im Browser mit den echten App-Dateien.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, openApp, profile, appData } = require('./helpers');

let env, page;
before(async () => { env = await setup(); page = await openApp(env, { data: appData([profile()]) }); });
after(async () => { await page.closeAll(); await env.close(); });

const run = (fn, arg) => page.evaluate(fn, arg);

test('Mathe-Helfer: ggT, kgV, kürzen', async () => {
  const r = await run(() => ({ g: gcd(12, 18), g1: gcd(7, 13), l: lcm(4, 6), red: reduce(12, 16), red1: reduce(5, 7), same: sameValue(1, 2, 3, 6), notSame: sameValue(1, 2, 2, 3) }));
  assert.deepEqual(r, { g: 6, g1: 1, l: 12, red: [3, 4], red1: [5, 7], same: true, notSame: false });
});

test('Einmaleins: Aufgaben und Lösungen stimmen', async () => {
  const bad = await run(() => {
    const p = state.data.profiles[0];
    p.stats.mult = {};
    const errors = [];
    let q = null;
    for (let i = 0; i < 500; i++) {
      q = makeQuestion(p, MULT_ROWS, true, q);
      const [x, op, y] = q.text.split(' ');
      const val = op === '·' ? Number(x) * Number(y) : Number(x) / Number(y);
      if (val !== q.answer || !Number.isInteger(q.answer) || q.answer < 1 || q.answer > 100) errors.push(q);
    }
    return errors;
  });
  assert.deepEqual(bad, []);
});

test('Einmaleins: nur gewählte Reihen', async () => {
  const rows = await run(() => {
    const p = state.data.profiles[0];
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(makeQuestion(p, [3, 7], false).a);
    return [...seen].sort();
  });
  assert.deepEqual(rows, [3, 7]);
});

test('Teilen mit Rest: n = Teiler · Ergebnis + Rest, Rest kleiner als Teiler', async () => {
  const bad = await run(() => {
    const errors = [];
    let t = null, zero = 0;
    for (let i = 0; i < 1000; i++) {
      t = makeRestTask(t);
      if (t.n !== t.d * t.q + t.r || t.r < 0 || t.r >= t.d || t.d < 2 || t.d > 10 || t.q < 1 || t.q > 10) errors.push(t);
      if (t.r === 0) zero++;
    }
    if (zero === 0 || zero > 300) errors.push({ zero });
    return errors;
  });
  assert.deepEqual(bad, []);
});

test('Brüche: jede Aufgabe hat genau eine richtige Antwort', async () => {
  const report = await run(() => {
    const problems = [];
    const parseVal = (html) => {
      const m = /class="fn">(\d+)<\/span><span class="fd">(\d+)</.exec(html);
      if (m) return [Number(m[1]), Number(m[2])];
      const n = Number(String(html).trim());
      return Number.isFinite(n) ? [n, 1] : null;
    };
    for (const topic of FRAC_TOPICS) {
      for (const grade of [3, 4, 5, 6]) {
        for (let i = 0; i < 40; i++) {
          const q = GEN[topic.id](grade);
          const where = `${topic.id} (Kl. ${grade}): ${q.prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}`;
          const texts = [q.prompt, q.visual, q.solution, q.explain, ...(q.options || []).map((o) => o.html + o.value)].join(' ');
          if (/NaN|undefined|null|Infinity/.test(texts)) problems.push(where + ' → Text enthält NaN/undefined');
          if (q.input === 'choice') {
            const vals = q.options.map((o) => o.value);
            const right = vals.filter((v) => q.check(v).ok);
            if (right.length !== 1) problems.push(`${where} → ${right.length} richtige Optionen`);
            if (new Set(vals).size !== vals.length) problems.push(where + ' → doppelte Optionen');
            if (vals.length < 2) problems.push(where + ' → zu wenige Optionen');
          } else if (q.input === 'number') {
            const right = [];
            for (let v = 0; v <= 300; v++) if (q.check(v).ok) right.push(v);
            if (right.length !== 1) problems.push(`${where} → ${right.length} richtige Zahlen`);
          } else if (q.input === 'color') {
            const right = [];
            for (let c = 0; c <= q.parts; c++) if (q.check(c).ok) right.push(c);
            if (right.length !== 1 || right[0] < 1 || right[0] >= q.parts) problems.push(`${where} → färben: ${right}`);
          } else if (q.input === 'fraction') {
            const sol = parseVal(q.solution);
            if (!sol) { problems.push(where + ' → Lösung nicht lesbar'); continue; }
            let accepted = 0;
            for (let d = 1; d <= 100; d++) for (let n = 0; n <= 150; n++) {
              if (!q.check([n, d]).ok) continue;
              accepted++;
              if (!sameValue(n, d, sol[0], sol[1])) { problems.push(`${where} → ${n}/${d} angenommen, Lösung ${sol.join('/')}`); d = 999; break; }
            }
            if (!accepted) problems.push(where + ' → keine Antwort wird angenommen');
            if (topic.id === 'kuerzen' && accepted !== 1) problems.push(where + ' → Kürzen nimmt ungekürzte Antworten an');
            if (q.check([sol[0], 0]).ok) problems.push(where + ' → Nenner 0 angenommen');
          } else problems.push(where + ' → unbekannte Eingabeart ' + q.input);
        }
      }
    }
    return [...new Set(problems)].slice(0, 20);
  });
  assert.deepEqual(report, []);
});

test('Brüche mal: erst ungekürzt rechnen, dann vollständig kürzen', async () => {
  const r = await run(() => {
    const t = twoStepTask('x', 6, 15, '');
    const step1 = t.check([6, 15]);
    const step2 = step1.followUp;
    return {
      label: t.stepLabel,
      step1ok: step1.ok, hasFollow: !!step2, step2label: step2 && step2.stepLabel,
      alreadyReduced: t.check([2, 5]),
      wrong: t.check([4, 10]).ok,
      s2right: step2.check([2, 5]).ok,
      s2notFull: step2.check([4, 10]),
      s2wrong: step2.check([3, 5]).ok,
      noReduce: twoStepTask('x', 2, 15, ''),
    };
  });
  assert.equal(r.label, 'Schritt 1 von 2');
  assert.ok(r.step1ok && r.hasFollow);
  assert.equal(r.step2label, 'Schritt 2 von 2');
  assert.deepEqual(r.alreadyReduced, { ok: true, note: 'Schon fertig gekürzt, super!' });
  assert.equal(r.wrong, false);
  assert.equal(r.s2right, true);
  assert.equal(r.s2notFull.ok, false);
  assert.match(r.s2notFull.note, /weiter kürzen/);
  assert.equal(r.s2wrong, false);
  assert.equal(r.noReduce.stepLabel, '');
  const noRed = await run(() => twoStepTask('x', 2, 15, '').check([2, 15]));
  assert.deepEqual(noRed, { ok: true });
});

test('Brüche: Themen passend zur Klasse', async () => {
  const r = await run(() => [3, 4, 5, 6].map((g) => fracTopicsFor({ grade: g }).map((t) => t.track)));
  assert.ok(r[0].every((t) => t === 'basic') && r[1].every((t) => t === 'basic'));
  assert.ok(r[2].every((t) => t === 'adv') && r[3].every((t) => t === 'adv'));
});

test('Vorlesen: Rechnungen werden in Worte übersetzt', async () => {
  const r = await run(() => ({
    mal: textToSpeech('7 · 8 ='),
    geteilt: textToSpeech('56 : 7 ='),
    frac: fracWords(3, 4),
    big: fracWords(5, 28),
    nenner: textToSpeech('Nenner 24: 8'),
  }));
  assert.match(r.mal, /7 mal 8/);
  assert.match(r.mal, /Wie viel ist/);
  assert.match(r.geteilt, /56 geteilt durch 7/);
  assert.match(r.frac.toLowerCase(), /3 viertel/);
  assert.match(r.big.toLowerCase(), /achtundzwanzigstel/);
  assert.doesNotMatch(r.nenner, /geteilt/);
});

test('Sterne: Tagessterne setzen sich am nächsten Tag zurück, Gesamtsumme bleibt', async () => {
  const r = await run(() => {
    const p = { stars: 40, today: { date: '2020-01-01', stars: 15 } };
    const before = todayStars(p);
    addStars(p, 5);
    return { before, after: todayStars(p), total: p.stars };
  });
  assert.deepEqual(r, { before: 0, after: 5, total: 45 });
});

test('Streak: zählt Tage mit Tagesziel, offener heutiger Tag bricht ihn nicht', async () => {
  const r = await run(() => {
    const k = (n) => dateKey(daysAgo(n));
    const met = { rounds: 2, stars: 5, met: true };
    const a = { days: { [k(1)]: met, [k(2)]: met, [k(3)]: met } };
    const b = { days: { [k(0)]: met, [k(1)]: met } };
    const c = { days: { [k(2)]: met, [k(3)]: met } };
    return [currentStreak(a), currentStreak(b), currentStreak(c)];
  });
  assert.deepEqual(r, [3, 2, 0]);
});

test('Runde beenden: Tagesziel nach 2 Runden erreicht, Abzeichen und Sterne', async () => {
  const r = await run(() => {
    state.data.settings.dailyGoal = 2;
    const p = { id: 'x', grade: 3, stars: 0, badges: [], stats: { mult: {}, frac: {} }, sessions: [] };
    p.challenge = { date: todayKey(), id: 'egal', done: true }; // Tagesaufgabe raushalten
    const r1 = finishRound(p, 4, { type: 'mult', mode: 'rows', correct: 4, total: 10 });
    const r2 = finishRound(p, 6, { type: 'mult', mode: 'rows', correct: 6, total: 10 });
    const r3 = finishRound(p, 1, { type: 'mult', mode: 'rows', correct: 1, total: 10 });
    return { r1: [r1.goalJustReached, r1.met], r2: [r2.goalJustReached, r2.met, r2.streak], r3: r3.goalJustReached, stars: p.stars, today: todayStars(p), day: p.days[todayKey()], badges: p.badges.map((b) => b.id || b) };
  });
  assert.deepEqual(r.r1, [false, false]);
  assert.deepEqual(r.r2, [true, true, 1]);
  assert.equal(r.r3, false);
  assert.equal(r.stars, 11);
  assert.equal(r.today, 11);
  assert.deepEqual(r.day, { rounds: 3, stars: 11, met: true });
  assert.ok(JSON.stringify(r.badges).includes('day1'));
});

test('Tagesaufgabe: Bonus nur einmal pro Tag', async () => {
  const r = await run(() => {
    const p = { id: 'kind-a', grade: 6, stars: 0, badges: [], stats: { mult: {}, frac: {} }, sessions: [] };
    const c = todaysChallenge(p);
    const same = todaysChallenge(p).id === c.id;
    // Passende Runde zur heutigen Aufgabe bauen
    const info = c.id === 'blitz' ? { type: 'mult', mode: 'blitz', correct: 30 }
      : c.id === 'mix' ? { type: 'mult', mode: 'mix', correct: 10 }
      : c.id === 'rest' ? { type: 'rest', correct: 10 }
      : { type: 'frac', topic: c.id.slice(5), correct: 8 };
    const wrong = checkChallenge(p, { type: 'mult', mode: 'rows', correct: 0 });
    const first = checkChallenge(p, info);
    const second = checkChallenge(p, info);
    return { same, wrong, first, second, done: todaysChallenge(p).done };
  });
  assert.ok(r.same);
  assert.equal(r.wrong, null);
  assert.equal(r.first.bonus, 10);
  assert.equal(r.second, null);
  assert.equal(r.done, true);
});

test('Belohnungs-Avatare und Sterne-Konto', async () => {
  const r = await run(() => ({
    unlocked: newlyUnlocked(40, 120),
    none: newlyUnlocked(120, 140),
    owl: isUnlocked({ stars: 49 }, '🦉'),
    owl2: isUnlocked({ stars: 50 }, '🦉'),
    normal: isUnlocked({ stars: 0 }, '🦊'),
    bal: starBalance({ stars: 100, spent: 30 }),
    balMin: starBalance({ stars: 10, spent: 30 }),
    balNew: starBalance({ stars: 7 }),
  }));
  assert.deepEqual(r.unlocked, ['🦉', '🐳']);
  assert.deepEqual(r.none, []);
  assert.equal(r.owl, false);
  assert.equal(r.owl2, true);
  assert.equal(r.normal, true);
  assert.equal(r.bal, 70);
  assert.equal(r.balMin, 0);
  assert.equal(r.balNew, 7);
});

test('Keine Fehler in der Konsole', () => {
  assert.deepEqual(page.errors, []);
});

test('Einmaleins gemeistert: 7·8 und 8·7 zählen zusammen, 2× richtig reicht', async () => {
  const r = await run(() => {
    const p = { stats: { mult: {} } };
    recordFact(p, 7, 8, true);
    const after1 = masteredCount(p);
    recordFact(p, 8, 7, true);              // andere Reihenfolge, gleiche Aufgabe
    const after2 = masteredCount(p);
    recordFact(p, 56 / 8, 8, false);        // Fehler setzt zurück
    const afterWrong = masteredCount(p);
    return { total: MULT_TOTAL, after1, after2, afterWrong, practiced: practicedCount(p), keys: Object.keys(p.stats.mult) };
  });
  assert.deepEqual(r, { total: 55, after1: 0, after2: 1, afterWrong: 0, practiced: 1, keys: ['7x8'] });
});

test('Einmaleins: alte getrennte Statistik wird zusammengeführt', async () => {
  const r = await run(() => {
    const p = { stats: { mult: { '8x7': { c: 2, w: 1, s: 2, t: 5 }, '7x8': { c: 3, w: 0, s: 1, t: 9 }, '3x3': { c: 1, w: 0, s: 1, t: 1 } } } };
    const changed = migrateMultStats(p);
    const again = migrateMultStats(p);
    return { changed, again, mult: p.stats.mult, m: masteredCount(p) };
  });
  assert.equal(r.changed, true);
  assert.equal(r.again, false);
  assert.deepEqual(r.mult, { '7x8': { c: 5, w: 1, s: 2, t: 9 }, '3x3': { c: 1, w: 0, s: 1, t: 1 } });
  assert.equal(r.m, 1);
});

test('Sprachausgabe: Vorlesetempo ist 20 % langsamer als früher', async () => {
  const r = await run(() => ({ normal: speechRate(false), slow: speechRate(true) }));
  assert.ok(Math.abs(r.normal - 0.76) < 1e-9, `normal: ${r.normal}`); // vorher 0,95
  assert.ok(Math.abs(r.slow - 0.6) < 1e-9, `langsam: ${r.slow}`);     // vorher 0,75
});
