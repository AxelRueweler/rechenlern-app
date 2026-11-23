'use strict';
// Gemeinsame Helfer für die Tests: kleiner Webserver + Browser-Seite mit der App.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise((r) => server.close(r))
  })));
}

// Startet Server und Browser einmal pro Testdatei.
async function setup() {
  const server = await startServer();
  const browser = await chromium.launch();
  return {
    server, browser,
    async close() { await browser.close(); await server.close(); }
  };
}

// Öffnet die App in einem frischen Browser-Kontext (leerer Speicher, kein Service Worker).
// data: optionaler Startzustand für localStorage. Seitenfehler werden in page.errors gesammelt.
async function openApp(env, { data, device, viewport } = {}) {
  const ctx = await env.browser.newContext({
    ...(device ? devices[device] : {}),
    ...(viewport ? { viewport } : {}),
    serviceWorkers: 'block',
    locale: 'de-DE'
  });
  // Externe Dateien (Schriftart) nicht laden: Tests laufen auch offline
  await ctx.route((url) => !url.href.startsWith(env.server.url), (r) => r.fulfill({ status: 200, body: '' }));
  if (data) await ctx.addInitScript((d) => { if (!localStorage.getItem('rechenheld:v1')) localStorage.setItem('rechenheld:v1', d); }, JSON.stringify(data));
  // Leise: keine Töne, keine Sprachausgabe
  await ctx.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(env.server.url);
  await page.waitForSelector('#app *');
  page.closeAll = () => ctx.close();
  return page;
}

// Ein Profil im Speicher-Format der App
function profile(over = {}) {
  return {
    id: 'ptest', name: 'Testkind', avatar: '🦊', grade: 3, createdAt: '2026-01-01T10:00:00.000Z',
    stars: 0, badges: [], stats: { mult: {}, frac: {} }, sessions: [], ...over
  };
}
function appData(profiles, settings = {}) {
  return { version: 1, profiles, lastProfileId: null, settings: { sound: false, speech: false, dailyGoal: 2, ...settings } };
}

module.exports = { setup, openApp, profile, appData };
