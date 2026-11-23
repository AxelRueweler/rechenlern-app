'use strict';

/* ============================================================
   Rechenheld – Grundgerüst
   - Profile pro Kind (Name, Avatar, Klasse)
   - Speichern im Gerät (localStorage, dauerhaft angefordert)
   - Sicherung als Datei exportieren / importieren
   - Offline-fähig über Service Worker
   ============================================================ */

const STORAGE_KEY = 'rechenheld:v1';
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄', '🐲', '🐧', '🐯', '🐨', '🦖', '🚀', '⚽', '🎸', '🌟', '🐱'];
const GRADES = [2, 3, 4, 5, 6, 7];

/* ---------- Speicher ---------- */

function emptyData() {
  return { version: 1, profiles: [], lastProfileId: null, settings: { sound: true, dailyGoal: 2 } };
}

function newProfile({ name, avatar, grade }) {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, avatar, grade,
    createdAt: new Date().toISOString(),
    stars: 0,
    badges: [],
    // Platz für spätere Module: Statistik pro Aufgabe und Sitzungsverlauf
    stats: { mult: {}, frac: {} },
    sessions: []
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.profiles)) return emptyData();
    data.settings = data.settings || { sound: true };
    return data;
  } catch (e) {
    console.warn('Laden fehlgeschlagen', e);
    return emptyData();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (e) {
    toast('Speichern hat nicht geklappt 😕');
  }
}

// Bittet den Browser, die Daten nicht automatisch zu löschen.
function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

/* ---------- Sterne: Tageszähler und Gesamtsumme ---------- */

// Lokales Datum (nicht UTC), damit der Tag um Mitternacht wechselt
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Sterne von heute; setzt sich jeden Tag automatisch auf 0 zurück
function todayStars(p) {
  return p.today && p.today.date === todayKey() ? p.today.stars : 0;
}

// Neue Sterne zählen für heute und für die Gesamtsumme (die nie zurückgesetzt wird)
function addStars(p, n) {
  if (!p.today || p.today.date !== todayKey()) p.today = { date: todayKey(), stars: 0 };
  p.today.stars += n;
  p.stars += n;
}

function starPill(p) {
  return `<span class="stars-pill" title="Gesamt: ${p.stars} Sterne">⭐ ${todayStars(p)} heute</span>`;
}

/* ---------- Zustand & Navigation ---------- */

const state = {
  data: load(),
  screen: 'profiles',
  params: {}
};

function go(screen, params = {}) {
  state.screen = screen;
  state.params = params;
  history.pushState({ screen, params }, '');
  render();
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
  const s = e.state || { screen: 'profiles', params: {} };
  state.screen = s.screen;
  state.params = s.params || {};
  render();
});

function currentProfile() {
  return state.data.profiles.find((p) => p.id === state.params.profileId) || null;
}

/* ---------- Hilfsfunktionen ---------- */

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Bildschirme ---------- */

const screens = {};

screens.profiles = () => {
  const ps = state.data.profiles;
  const cards = ps.map((p) => `
    <button class="profile-card" data-id="${p.id}">
      <span class="avatar">${p.avatar}</span>
      <span class="name">${esc(p.name)}</span>
      <span class="meta">Klasse ${p.grade} · ⭐ ${todayStars(p)} heute</span>
    </button>`).join('');
  const node = h(`
    <div class="topbar">
      <div class="spacer"></div>
      <button class="icon-btn" id="parents" aria-label="Eltern-Bereich">⚙️</button>
    </div>
    <h1>Wer rechnet heute? 🧮</h1>
    <p class="sub">${ps.length ? 'Tippe auf dein Profil.' : 'Lege zuerst ein Profil an.'}</p>
    <div class="profiles">
      ${cards}
      <button class="profile-card add" id="add">
        <span class="avatar">➕</span>
        <span class="name">Neues Profil</span>
      </button>
    </div>`);
  node.querySelectorAll('.profile-card[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      state.data.lastProfileId = b.dataset.id;
      save();
      go('home', { profileId: b.dataset.id });
    }));
  node.getElementById('add').addEventListener('click', () => go('editProfile'));
  node.getElementById('parents').addEventListener('click', () => go('parents'));
  return node;
};

screens.editProfile = () => {
  const existing = state.params.profileId ? currentProfile() : null;
  const draft = {
    name: existing ? existing.name : '',
    avatar: existing ? existing.avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)],
    grade: existing ? existing.grade : 3
  };
  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Zurück">⬅️</button>
      <h2 style="margin:0">${existing ? 'Profil ändern' : 'Neues Profil'}</h2>
    </div>
    <div class="panel">
      <label class="field" for="name">Wie heißt du?</label>
      <input class="text" id="name" maxlength="20" autocomplete="off" placeholder="Dein Name" value="${esc(draft.name)}">
    </div>
    <div class="panel">
      <label class="field">Such dir ein Tier aus</label>
      <div class="choice-grid" id="avatars">
        ${AVATARS.map((a) => `<button class="choice" data-a="${a}" aria-pressed="${a === draft.avatar}">${a}</button>`).join('')}
      </div>
    </div>
    <div class="panel">
      <label class="field">In welche Klasse gehst du?</label>
      <div class="choice-grid" id="grades">
        ${GRADES.map((g) => `<button class="choice text" data-g="${g}" aria-pressed="${g === draft.grade}">${g}</button>`).join('')}
      </div>
    </div>
    <div class="actions">
      <button class="btn" id="save">Fertig ✔</button>
    </div>`);

  const nameEl = node.getElementById('name');
  const saveBtn = node.getElementById('save');
  const sync = () => { saveBtn.disabled = !nameEl.value.trim(); };
  nameEl.addEventListener('input', sync);
  sync();

  node.querySelectorAll('#avatars .choice').forEach((b) => b.addEventListener('click', () => {
    draft.avatar = b.dataset.a;
    b.parentElement.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  node.querySelectorAll('#grades .choice').forEach((b) => b.addEventListener('click', () => {
    draft.grade = Number(b.dataset.g);
    b.parentElement.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  node.getElementById('back').addEventListener('click', () => history.back());
  saveBtn.addEventListener('click', () => {
    const name = nameEl.value.trim();
    if (!name) return;
    if (existing) {
      Object.assign(existing, { name, avatar: draft.avatar, grade: draft.grade });
      save();
      history.back();
    } else {
      const p = newProfile({ name, avatar: draft.avatar, grade: draft.grade });
      state.data.profiles.push(p);
      state.data.lastProfileId = p.id;
      save();
      requestPersistence();
      toast(`Hallo ${name}! ${draft.avatar}`);
      // Profil-Formular durch Startseite ersetzen, damit "Zurück" zur Auswahl führt
      state.screen = 'home';
      state.params = { profileId: p.id };
      history.replaceState({ screen: 'home', params: state.params }, '');
      render();
    }
  });
  return node;
};

screens.home = () => {
  const p = currentProfile();
  if (!p) { state.screen = 'profiles'; return screens.profiles(); }
  const greet = greeting();
  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="switch" aria-label="Profil wechseln">👥</button>
      <div class="spacer"></div>
      ${starPill(p)}
      <button class="icon-btn" id="edit" aria-label="Profil ändern">✏️</button>
    </div>
    <div class="hello">
      <span class="avatar">${p.avatar}</span>
      <div>
        <h1 style="margin:0">${greet}, ${esc(p.name)}!</h1>
        <p class="sub" style="margin:0">Was möchtest du heute üben? <span class="total-stars">🏆 ${p.stars} Sterne insgesamt</span></p>
      </div>
    </div>
    ${typeof streakCardHtml === 'function' ? streakCardHtml(p) : ''}
    <div class="tiles">
      <button class="tile t-1x1" data-go="mult">
        <span class="emoji">✖️</span>
        <span><span class="title">Einmaleins</span><br><span class="desc">${typeof masteredCount === 'function' ? masteredCount(p) : 0} von 100 Aufgaben gemeistert</span></span>
      </button>
      <button class="tile t-frac" data-go="frac">
        <span class="emoji">🍕</span>
        <span><span class="title">Brüche</span><br><span class="desc">${p.grade >= 5 ? 'Kürzen, erweitern, rechnen mit Brüchen' : 'Brüche erkennen und vergleichen'}${typeof fracStarsTotal === 'function' ? ` · ★ ${fracStarsTotal(p)} von ${fracTopicsFor(p).length * 3}` : ''}</span></span>
      </button>
      <button class="tile t-prog" data-go="progress">
        <span class="emoji">🏆</span>
        <span><span class="title">Mein Fortschritt</span><br><span class="desc">Was du schon kannst und deine Abzeichen</span></span>
      </button>
    </div>`);
  node.getElementById('switch').addEventListener('click', () => go('profiles'));
  node.getElementById('edit').addEventListener('click', () => go('editProfile', { profileId: p.id }));
  node.querySelectorAll('.tile').forEach((t) => t.addEventListener('click', () => {
    if (screens[t.dataset.go]) go(t.dataset.go, { profileId: p.id });
    else toast('Das baue ich gerade noch 🔧');
  }));
  return node;
};

screens.parents = () => {
  const ps = state.data.profiles;
  const rows = ps.map((p) => `
    <div class="list-row">
      <span style="font-size:40px">${p.avatar}</span>
      <div class="grow"><b>${esc(p.name)}</b><br><span class="muted small">Klasse ${p.grade} · ⭐ ${todayStars(p)} heute · ${p.stars} gesamt · seit ${new Date(p.createdAt).toLocaleDateString('de-DE')}</span></div>
      <button class="btn secondary" data-edit="${p.id}" style="min-height:52px;padding:8px 18px;font-size:18px">Ändern</button>
      <button class="btn danger" data-del="${p.id}" style="min-height:52px;padding:8px 18px;font-size:18px">Löschen</button>
    </div>`).join('') || '<p class="muted">Noch keine Profile.</p>';

  const node = h(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Zurück">⬅️</button>
      <h2 style="margin:0">Eltern-Bereich</h2>
    </div>
    <div class="panel">
      <h2>Profile</h2>
      ${rows}
    </div>
    <div class="panel">
      <h2>Einstellungen</h2>
      <label class="toggle">
        <input type="checkbox" id="sound" ${state.data.settings.sound !== false ? 'checked' : ''}>
        <span>Töne bei richtigen und falschen Antworten</span>
      </label>
      <label class="field" style="margin-top:20px">Tagesziel: Runden pro Tag für den Streak</label>
      <div class="choice-grid" id="goal" style="max-width:420px">
        ${[1, 2, 3, 4, 5].map((g) => `<button class="choice text" data-goal="${g}" aria-pressed="${(state.data.settings.dailyGoal || 2) === g}">${g}</button>`).join('')}
      </div>
      <p class="muted small">Eine Runde sind 10 Einmaleins-Aufgaben, 8 Bruch-Aufgaben oder eine Blitzrunde.</p>
    </div>
    <div class="panel">
      <h2>Sicherung</h2>
      <p class="muted small" style="margin-top:0">Der Fortschritt wird nur auf diesem Gerät gespeichert. Mit einer Sicherungsdatei kannst du ihn auf ein neues Gerät umziehen oder vor dem Löschen der Browserdaten retten.</p>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn" id="export">💾 Sicherung speichern</button>
        <button class="btn secondary" id="import">📂 Sicherung laden</button>
        <input type="file" id="file" accept="application/json,.json" hidden>
      </div>
    </div>
    <p class="muted small" style="text-align:center">Rechenheld · Daten bleiben auf diesem Gerät</p>`);

  node.getElementById('back').addEventListener('click', () => history.back());
  node.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => go('editProfile', { profileId: b.dataset.edit })));
  node.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    // Zweimal tippen zum Löschen, statt eines Browser-Dialogs
    if (b.dataset.armed) {
      state.data.profiles = state.data.profiles.filter((p) => p.id !== b.dataset.del);
      save();
      toast('Profil gelöscht');
      render();
    } else {
      b.dataset.armed = '1';
      b.textContent = 'Sicher?';
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Löschen'; } }, 3000);
    }
  }));
  node.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    state.data.settings.dailyGoal = Number(b.dataset.goal);
    save();
    b.parentElement.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', x === b));
    toast('Tagesziel: ' + b.dataset.goal + (b.dataset.goal === '1' ? ' Runde' : ' Runden'));
  }));
  node.getElementById('sound').addEventListener('change', (e) => { state.data.settings.sound = e.target.checked; save(); });
  node.getElementById('export').addEventListener('click', exportBackup);
  const fileEl = node.getElementById('file');
  node.getElementById('import').addEventListener('click', () => fileEl.click());
  fileEl.addEventListener('change', () => fileEl.files[0] && importBackup(fileEl.files[0]));
  return node;
};

function greeting() {
  const hr = new Date().getHours();
  if (hr < 11) return 'Guten Morgen';
  if (hr < 17) return 'Hallo';
  return 'Guten Abend';
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rechenheld-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Sicherung gespeichert');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.profiles)) throw new Error('Format');
      // Zusammenführen: Profile mit gleicher ID werden ersetzt
      const byId = new Map(state.data.profiles.map((p) => [p.id, p]));
      data.profiles.forEach((p) => byId.set(p.id, p));
      state.data.profiles = [...byId.values()];
      save();
      toast(`${data.profiles.length} Profil(e) geladen`);
      render();
    } catch (e) {
      toast('Diese Datei passt nicht 😕');
    }
  };
  reader.readAsText(file);
}

/* ---------- Rendern ---------- */

function render() {
  const app = document.getElementById('app');
  const fn = screens[state.screen] || screens.profiles;
  app.replaceChildren(fn());
}

/* ---------- Start ---------- */

// Erst starten, wenn alle Module (Einmaleins, Brüche, Fortschritt) geladen sind
function start() {
  history.replaceState({ screen: 'profiles', params: {} }, '');
  // Zuletzt benutztes Profil direkt öffnen
  const last = state.data.profiles.find((p) => p.id === state.data.lastProfileId);
  if (last) {
    state.screen = 'home';
    state.params = { profileId: last.id };
    history.pushState({ screen: 'home', params: state.params }, '');
  }
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else setTimeout(start, 0);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
