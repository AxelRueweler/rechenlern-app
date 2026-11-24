'use strict';
// Abläufe wie ein Kind sie am Tablet macht: tippen, rechnen, einlösen.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, openApp, profile, appData } = require('./helpers');

let env;
before(async () => { env = await setup(); });
after(async () => { await env.close(); });

const TABLET = { device: 'Galaxy Tab S9' };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('rechenheld:v1')));
const tapKeys = async (page, keys) => { for (const k of keys) await page.locator(`.key[data-k="${k}"]`).click(); };

test('Profil anlegen und Startseite sehen', async () => {
  const page = await openApp(env, TABLET);
  await page.getByText('Neues Profil').click();
  await page.fill('#name', 'Mia');
  await page.locator('#grades [data-g="6"]').click();
  await page.locator('#save').click();
  await page.waitForSelector('.tiles');
  assert.match(await page.locator('.hello h1').innerText(), /Mia/);
  const d = await stored(page);
  assert.equal(d.profiles.length, 1);
  assert.equal(d.profiles[0].grade, 6);
  assert.deepEqual(page.errors, []);
  await page.closeAll();
});

test('Einmaleins-Runde: 10 von 10 richtig gibt Sterne und Tagesrunde', async () => {
  const p = profile({ multPrefs: { rows: [2, 5], div: true }, challenge: { date: '', done: false } });
  const page = await openApp(env, { ...TABLET, data: appData([p]) });
  await page.locator('.profile-card[data-id="ptest"]').click();
  await page.locator('.tile[data-go="mult"]').click();
  await page.evaluate(() => go('multPlay', { profileId: 'ptest', mode: 'rows' }));
  for (let i = 0; i < 10; i++) {
    const q = await page.locator('#q').innerText();
    const [a, op, b] = q.replace('=', '').trim().split(' ');
    const ans = op === '·' ? a * b : a / b;
    await tapKeys(page, [...String(ans), 'ok']);
    if (i < 9) {
      await page.waitForSelector('.question-card.good');
      await page.waitForSelector('.question-card:not(.good)');
    }
  }
  await page.waitForFunction(() => state.screen === 'multDone', null, { timeout: 5000 });
  const d = await stored(page);
  const kid = d.profiles[0];
  assert.equal(kid.sessions.at(-1).correct, 10);
  assert.ok(kid.stars >= 13, `Sterne: ${kid.stars}`); // 10 + 3 für perfekt (+ evtl. Tagesaufgabe)
  assert.equal(Object.values(kid.days)[0].rounds, 1);
  assert.deepEqual(page.errors, []);
  await page.closeAll();
});

test('Einmaleins: falsche Antwort zeigt die Lösung', async () => {
  const p = profile({ multPrefs: { rows: [3], div: false } });
  const page = await openApp(env, { ...TABLET, data: appData([p]) });
  await page.evaluate(() => go('multPlay', { profileId: 'ptest', mode: 'rows' }));
  const q = await page.locator('#q').innerText();
  await tapKeys(page, ['0', 'ok']);
  await page.waitForSelector('.question-card.bad');
  assert.match(await page.locator('#fb').innerText(), new RegExp('Merk dir: ' + q.replace(' =', '').replace(/[·]/g, '.')));
  // Lösung bleibt stehen, bis das Kind aktiv bestätigt
  await page.waitForTimeout(2500);
  assert.equal(await page.locator('.question-card.bad').count(), 1);
  assert.equal(await page.locator('#q').innerText(), q);
  assert.equal(await page.locator('#pad').isVisible(), false);
  await page.locator('#next').click();
  await page.waitForSelector('.question-card:not(.bad)');
  assert.equal(await page.locator('#pad').isVisible(), true);
  assert.equal(await page.locator('#next').isVisible(), false);
  assert.deepEqual(page.errors, []);
  await page.closeAll();
});

test('Teilen mit Rest: Ergebnis und Rest eintippen', async () => {
  const page = await openApp(env, { ...TABLET, data: appData([profile()]) });
  await page.evaluate(() => go('restPlay', { profileId: 'ptest' }));
  for (let i = 0; i < 10; i++) {
    if (i) await page.waitForSelector('.question-card:not(.good)');
    const [n, d] = (await page.locator('#task').innerText()).split(' : ').map(Number);
    const q = Math.floor(n / d), r = n % d;
    await tapKeys(page, [...String(q)]);
    if (q < 10) await page.locator('.key[data-k="swap"]').click();
    await tapKeys(page, [...String(r), 'ok']);
    await page.waitForSelector('.question-card.good, .question-card.bad');
    assert.equal(await page.locator('.question-card.bad').count(), 0, `${n} : ${d} wurde als falsch gewertet`);
  }
  await page.waitForFunction(() => state.screen === 'multDone', null, { timeout: 5000 });
  const kid = (await stored(page)).profiles[0];
  assert.equal(kid.stats.rest.best, 100);
  assert.deepEqual(page.errors, []);
  await page.closeAll();
});

test('Brüche mal nehmen: Schritt 1 rechnen, Schritt 2 kürzen', async () => {
  const page = await openApp(env, { ...TABLET, data: appData([profile({ grade: 6 })]) });
  await page.evaluate(() => go('fracPlay', { profileId: 'ptest', topic: 'mal' }));
  const typeFrac = async (n, d) => {
    await tapKeys(page, [...String(n)]);
    await page.locator('#sd').click();
    await tapKeys(page, [...String(d), 'ok']);
  };
  let twoSteps = 0;
  for (let i = 0; i < 8; i++) {
    if (i) await page.waitForSelector('#card:not(.good)');
    const nums = await page.locator('#prompt').evaluate((el) => {
      const fr = [...el.querySelectorAll('.frac')].map((f) => [Number(f.querySelector('.fn').textContent), Number(f.querySelector('.fd').textContent)]);
      const k = /^\s*(?:Schritt 1 von 2)?\s*(\d+)\s*·/.exec(el.textContent);
      return { fr, k: k ? Number(k[1]) : null };
    });
    const [n, d] = nums.fr.length === 2 ? [nums.fr[0][0] * nums.fr[1][0], nums.fr[0][1] * nums.fr[1][1]] : [nums.k * nums.fr[0][0], nums.fr[0][1]];
    await typeFrac(n, d);
    await page.waitForSelector('#card.good');
    const g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(n, d);
    if (g > 1) {
      twoSteps++;
      assert.match(await page.locator('#fb').innerText(), /Jetzt noch kürzen/);
      await page.waitForSelector('.step-label:text("Schritt 2 von 2")');
      // Nur halb gekürzt zählt nicht, wenn weiter gekürzt werden kann – hier direkt richtig
      await typeFrac(n / g, d / g);
      await page.waitForSelector('#card.good');
    }
  }
  await page.waitForFunction(() => state.screen === 'fracDone', null, { timeout: 5000 });
  const kid = (await stored(page)).profiles[0];
  assert.equal(kid.stats.frac.mal.c, 8, 'alle 8 Aufgaben richtig, Schritt 2 zählt nicht extra');
  assert.ok(twoSteps > 0, 'mindestens eine Aufgabe mit Kürzen');
  assert.deepEqual(page.errors, []);
  await page.closeAll();
});

test('Belohnung anlegen, PIN setzen und mit PIN einlösen', async () => {
  const page = await openApp(env, { ...TABLET, data: appData([profile({ stars: 120, spent: 0 })]) });
  await page.locator('#parents').click();
  await page.locator('#rf-emoji .choice').nth(1).click();
  await page.fill('#rf-name', 'Eis essen');
  await page.fill('#rf-cost', '100');
  await page.locator('#rf-save').click();
  await page.fill('#pin-set', '4711');
  await page.locator('#pin-save').click();
  let d = await stored(page);
  assert.equal(d.settings.rewards.length, 1);
  assert.equal(d.settings.parentPin, '4711');

  await page.evaluate(() => go('home', { profileId: 'ptest' }));
  await page.waitForSelector('[data-redeem]');
  assert.match(await page.locator('.shop .balance').innerText(), /120/);
  await page.locator('[data-redeem]').click();
  await page.fill('.reward-card input.pin', '0000');
  await page.locator('[data-ok]').click();
  assert.equal((await stored(page)).profiles[0].spent || 0, 0, 'falsche PIN darf nichts abbuchen');
  await page.fill('.reward-card input.pin', '4711');
  await page.locator('[data-ok]').click();
  await page.waitForSelector('.shop .balance:text("20")');
  d = await stored(page);
  assert.equal(d.profiles[0].spent, 100);
  assert.equal(d.profiles[0].stars, 120, 'Gesamtsumme bleibt');
  assert.equal(d.profiles[0].redemptions[0].name, 'Eis essen');
  assert.match(await page.locator('.reward-card').innerText(), /Noch 80/);
  assert.deepEqual(page.errors, []);
  await page.closeAll();
});

test('Brüche zeigen nur Themen der eigenen Klasse', async () => {
  const page = await openApp(env, { ...TABLET, data: appData([profile({ id: 'k3', grade: 3 }), profile({ id: 'k6', grade: 6 })]) });
  await page.evaluate(() => go('frac', { profileId: 'k3' }));
  const t3 = await page.locator('#app').innerText();
  await page.evaluate(() => go('frac', { profileId: 'k6' }));
  const t6 = await page.locator('#app').innerText();
  assert.match(t3, /Brüche erkennen/);
  assert.doesNotMatch(t3, /Kürzen|Dezimalzahlen/);
  assert.match(t6, /Kürzen/);
  assert.doesNotMatch(t6, /Brüche erkennen/);
  await page.closeAll();
});

// Alle Bildschirme auf Handy und Tablet: nichts darf seitlich überstehen.
const SCREENS = [
  ['profiles', {}], ['home', { profileId: 'ptest' }], ['mult', { profileId: 'ptest' }], ['frac', { profileId: 'ptest' }],
  ['progress', { profileId: 'ptest' }], ['parents', {}], ['editProfile', { profileId: 'ptest' }],
  ['multPlay', { profileId: 'ptest', mode: 'mix' }], ['restPlay', { profileId: 'ptest' }],
  ['fracPlay', { profileId: 'ptest', topic: 'plusminus' }], ['fracPlay', { profileId: 'ptest', topic: 'vergleichen2' }]
];
for (const device of ['Galaxy S9+', 'Galaxy Tab S9', 'Galaxy Tab S9 landscape']) {
  test(`Layout ohne seitliches Überstehen: ${device}`, async () => {
    const p = profile({ grade: 6, stars: 260, multPrefs: { rows: [2, 3], div: true } });
    const page = await openApp(env, { device, data: appData([p], { rewards: [{ id: 'r1', emoji: '🍦', name: 'Ein großes Eis am Wochenende', cost: 300 }] }) });
    const over = [];
    for (const [screen, params] of SCREENS) {
      await page.evaluate(([s, pr]) => go(s, pr), [screen, params]);
      await page.waitForTimeout(50);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (extra > 1) over.push(`${screen}${params.topic ? '/' + params.topic : ''}: ${extra}px`);
    }
    assert.deepEqual(over, [], 'Seiten stehen seitlich über');
    assert.deepEqual(page.errors, []);
    await page.closeAll();
  });
}

test('Fehler beim Anzeigen: App lädt einmal frisch und zeigt sonst einen Neu-laden-Knopf', async () => {
  const page = await openApp(env, { ...TABLET, data: appData([profile()]) });
  await page.evaluate(() => { screens.kaputt = () => { throw new Error('test'); }; go('kaputt'); });
  await page.waitForLoadState('load');
  await page.waitForSelector('#app *');
  // Nach dem automatischen Neuladen noch einmal kaputt: jetzt kommt der Knopf
  await page.evaluate(() => { screens.kaputt = () => { throw new Error('test'); }; go('kaputt'); });
  await page.waitForSelector('#fresh');
  assert.match(await page.locator('#app').innerText(), /Fortschritt bleibt erhalten/);
  assert.equal((await stored(page)).profiles.length, 1);
  await page.closeAll();
});
