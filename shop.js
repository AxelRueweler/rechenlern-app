'use strict';

/* ============================================================
   Belohnungen der Eltern zum Einlösen
   - Eltern legen im Eltern-Bereich beliebig viele Belohnungen mit Sterne-Preis an
   - Kinder sehen auf ihrer Startseite, wie viele Sterne noch fehlen, und lösen ein
   - Eingelöste Sterne werden vom Sterne-Konto abgezogen. Die Gesamtsumme
     (für Avatare und Statistik) bleibt unverändert.
   ============================================================ */

const SHOP_EMOJIS = ['🎁', '🍦', '🍫', '🎮', '📺', '🎬', '📚', '⚽', '🛝', '🧸', '🍕', '🎨', '🚲', '🏊', '🌙', '💶'];

function shopRewards() {
  state.data.settings.rewards = state.data.settings.rewards || [];
  return state.data.settings.rewards;
}
function starBalance(p) { return Math.max(0, p.stars - (p.spent || 0)); }

/* ---------- Kinder-Ansicht (Startseite) ---------- */

function shopSectionHtml(p) {
  const list = shopRewards().slice().sort((a, b) => a.cost - b.cost);
  const bal = starBalance(p);
  const cards = list.map((r) => {
    const pct = Math.min(100, Math.round(bal / r.cost * 100));
    const can = bal >= r.cost;
    return `
      <div class="reward-card ${can ? 'ready' : ''}" data-rid="${r.id}">
        <span class="remoji">${r.emoji}</span>
        <div class="rbody">
          <b class="rname">${esc(r.name)}</b>
          <span class="rcost">${r.cost} ⭐</span>
          <div class="goalbar"><span style="width:${pct}%"></span></div>
        </div>
        ${can
          ? `<button class="btn rbtn" data-redeem="${r.id}">Einlösen</button>`
          : `<span class="rleft">Noch <b>${r.cost - bal}</b> ⭐</span>`}
      </div>`;
  }).join('');
  return `
    <section class="shop">
      <div class="row-head">
        <h2 style="margin:0">Meine Belohnungen</h2>
        <span class="balance">⭐ ${bal} zum Einlösen</span>
      </div>
      ${cards ? `<div class="reward-list">${cards}</div>` : '<p class="muted" style="margin:0">Noch keine Belohnungen. Frag deine Eltern, ob sie im Eltern-Bereich ⚙️ welche eintragen.</p>'}
    </section>`;
}

function bindShop(node, p) {
  node.querySelectorAll('[data-redeem]').forEach((b) => b.addEventListener('click', () => {
    const r = shopRewards().find((x) => x.id === b.dataset.redeem);
    if (!r) return;
    const card = b.closest('.reward-card');
    const pin = state.data.settings.parentPin;
    card.classList.add('confirming');
    card.innerHTML = `
      <span class="remoji">${r.emoji}</span>
      <div class="rbody">
        <b class="rname">${esc(r.name)} für ${r.cost} ⭐ einlösen?</b>
        ${pin
          ? `<label class="small muted" for="pin-${r.id}">Eltern-PIN eingeben</label>
             <input class="text pin" id="pin-${r.id}" type="password" inputmode="numeric" maxlength="4" autocomplete="off">`
          : '<span class="small muted">Zeig das deinen Eltern!</span>'}
      </div>
      <div class="ractions">
        <button class="btn secondary" data-cancel>Abbrechen</button>
        <button class="btn" data-ok>Ja, einlösen</button>
      </div>`;
    const pinEl = card.querySelector('.pin');
    if (pinEl) setTimeout(() => pinEl.focus(), 50);
    card.querySelector('[data-cancel]').addEventListener('click', () => render());
    card.querySelector('[data-ok]').addEventListener('click', () => {
      if (pin && (!pinEl || pinEl.value !== pin)) {
        pinEl.value = '';
        pinEl.classList.add('wrong');
        toast('PIN stimmt nicht');
        return;
      }
      if (starBalance(p) < r.cost) { render(); return; }
      p.spent = (p.spent || 0) + r.cost;
      p.redemptions = p.redemptions || [];
      p.redemptions.push({ id: r.id, emoji: r.emoji, name: r.name, cost: r.cost, date: new Date().toISOString() });
      save();
      toast(`🎉 Eingelöst: ${r.name}`);
      if (typeof beep === 'function') beep('win');
      render();
    });
  }));
}

/* ---------- Eltern-Bereich ---------- */

function shopAdminHtml() {
  const list = shopRewards();
  const rows = list.map((r) => `
    <div class="list-row">
      <span style="font-size:36px">${r.emoji}</span>
      <div class="grow"><b>${esc(r.name)}</b><br><span class="muted small">${r.cost} Sterne</span></div>
      <button class="btn secondary small-btn" data-redit="${r.id}">Ändern</button>
      <button class="btn danger small-btn" data-rdel="${r.id}">Löschen</button>
    </div>`).join('') || '<p class="muted">Noch keine Belohnungen angelegt.</p>';

  const history = state.data.profiles.map((p) => {
    const rs = (p.redemptions || []).slice(-8).reverse();
    return `<div class="hist"><b>${p.avatar} ${esc(p.name)}</b> <span class="muted small">· ${starBalance(p)} Sterne zum Einlösen</span>
      ${rs.length ? `<ul>${rs.map((x) => `<li>${x.emoji} ${esc(x.name)} <span class="muted small">(${x.cost} ⭐, ${new Date(x.date).toLocaleDateString('de-DE')})</span></li>`).join('')}</ul>` : '<p class="muted small" style="margin:4px 0 0">Noch nichts eingelöst.</p>'}</div>`;
  }).join('');

  return `
    <div class="panel" id="shop-admin">
      <h2>Belohnungen zum Einlösen</h2>
      <p class="muted small" style="margin-top:0">Die Kinder sehen diese Belohnungen auf ihrer Startseite und können sie mit ihren Sternen einlösen.</p>
      ${rows}
      <div class="reward-form">
        <h3 id="rf-title" style="margin:18px 0 10px">Neue Belohnung</h3>
        <div class="choice-grid emoji-grid" id="rf-emoji">
          ${SHOP_EMOJIS.map((e, i) => `<button class="choice" data-e="${e}" aria-pressed="${i === 0}">${e}</button>`).join('')}
        </div>
        <div class="rf-fields">
          <label class="rf-name"><span class="field">Belohnung</span><input class="text" id="rf-name" maxlength="40" placeholder="z. B. 30 Minuten Tablet" autocomplete="off"></label>
          <label class="rf-cost"><span class="field">Sterne</span><input class="text" id="rf-cost" type="number" inputmode="numeric" min="1" max="99999" placeholder="100"></label>
        </div>
        <div class="actions" style="justify-content:flex-start">
          <button class="btn" id="rf-save">Hinzufügen</button>
          <button class="btn secondary" id="rf-cancel" hidden>Abbrechen</button>
        </div>
      </div>
      <h3 style="margin:24px 0 8px">Eltern-PIN fürs Einlösen</h3>
      <p class="muted small" style="margin-top:0">${state.data.settings.parentPin ? 'Eine PIN ist gesetzt. Ohne PIN können die Kinder nicht einlösen.' : 'Ohne PIN können die Kinder selbst einlösen. Mit PIN muss ein Elternteil bestätigen.'}</p>
      <div class="rf-fields">
        <label class="rf-name"><span class="field">PIN (4 Ziffern)</span><input class="text" id="pin-set" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="${state.data.settings.parentPin ? '••••' : '1234'}"></label>
      </div>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn secondary" id="pin-save">PIN speichern</button>
        ${state.data.settings.parentPin ? '<button class="btn secondary" id="pin-clear">PIN entfernen</button>' : ''}
      </div>
      <h3 style="margin:24px 0 8px">Zuletzt eingelöst</h3>
      ${history || '<p class="muted">Noch keine Profile.</p>'}
    </div>`;
}

function bindShopAdmin(node) {
  const root = node.getElementById ? node.getElementById('shop-admin') : node.querySelector('#shop-admin');
  if (!root) return;
  let editId = null;
  let emoji = SHOP_EMOJIS[0];
  const nameEl = root.querySelector('#rf-name'), costEl = root.querySelector('#rf-cost');
  const saveBtn = root.querySelector('#rf-save'), cancelBtn = root.querySelector('#rf-cancel'), title = root.querySelector('#rf-title');
  const pickEmoji = (e) => {
    emoji = e;
    root.querySelectorAll('#rf-emoji .choice').forEach((x) => x.setAttribute('aria-pressed', x.dataset.e === e));
  };
  root.querySelectorAll('#rf-emoji .choice').forEach((b) => b.addEventListener('click', () => pickEmoji(b.dataset.e)));

  saveBtn.addEventListener('click', () => {
    const name = nameEl.value.trim();
    const cost = Math.round(Number(costEl.value));
    if (!name) { toast('Bitte einen Namen eingeben'); nameEl.focus(); return; }
    if (!(cost >= 1)) { toast('Bitte die Anzahl Sterne eingeben'); costEl.focus(); return; }
    const list = shopRewards();
    if (editId) {
      Object.assign(list.find((r) => r.id === editId) || {}, { name, cost, emoji });
      toast('Belohnung gespeichert');
    } else {
      list.push({ id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, cost, emoji });
      toast('Belohnung hinzugefügt');
    }
    save();
    render();
  });
  cancelBtn.addEventListener('click', () => render());

  root.querySelectorAll('[data-redit]').forEach((b) => b.addEventListener('click', () => {
    const r = shopRewards().find((x) => x.id === b.dataset.redit);
    if (!r) return;
    editId = r.id;
    nameEl.value = r.name;
    costEl.value = r.cost;
    if (!SHOP_EMOJIS.includes(r.emoji)) SHOP_EMOJIS.unshift(r.emoji);
    pickEmoji(r.emoji);
    title.textContent = 'Belohnung ändern';
    saveBtn.textContent = 'Speichern';
    cancelBtn.hidden = false;
    nameEl.focus();
  }));
  root.querySelectorAll('[data-rdel]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.armed) {
      state.data.settings.rewards = shopRewards().filter((r) => r.id !== b.dataset.rdel);
      save();
      toast('Belohnung gelöscht');
      render();
    } else {
      b.dataset.armed = '1';
      b.textContent = 'Sicher?';
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Löschen'; } }, 3000);
    }
  }));

  root.querySelector('#pin-save').addEventListener('click', () => {
    const v = root.querySelector('#pin-set').value.trim();
    if (!/^\d{4}$/.test(v)) { toast('Die PIN braucht genau 4 Ziffern'); return; }
    state.data.settings.parentPin = v;
    save();
    toast('PIN gespeichert');
    render();
  });
  const clr = root.querySelector('#pin-clear');
  if (clr) clr.addEventListener('click', () => { state.data.settings.parentPin = ''; save(); toast('PIN entfernt'); render(); });
}
