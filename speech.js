'use strict';

/* ============================================================
   Sprachausgabe (Vorlesen) über die eingebaute Sprachausgabe des Browsers
   - 🔊-Knopf auf jeder Aufgabenkarte
   - optional jede neue Aufgabe automatisch vorlesen
   - bei Fehlern Lösung und Erklärung vorlesen
   ============================================================ */

const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function speechSettings() {
  const st = state.data.settings || {};
  return {
    on: st.speech !== false,
    auto: st.speechAuto === true,
    mistakes: st.speechMistakes !== false,
    slow: st.speechSlow === true
  };
}

let germanVoice = null;
function pickVoice() {
  if (!canSpeak) return;
  const voices = speechSynthesis.getVoices();
  const de = voices.filter((v) => /^de(-|_|$)/i.test(v.lang));
  germanVoice = de.find((v) => /google/i.test(v.name)) || de.find((v) => /de-DE/i.test(v.lang)) || de[0] || null;
}
if (canSpeak) {
  pickVoice();
  speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

function stopSpeaking() { if (canSpeak) speechSynthesis.cancel(); }

function speakText(text) {
  if (!canSpeak || !speechSettings().on || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (germanVoice) u.voice = germanVoice;
  u.rate = speechSettings().slow ? 0.75 : 0.95;
  u.pitch = 1.05;
  speechSynthesis.speak(u);
}

/* ---------- Text kindgerecht aussprechbar machen ---------- */

const DENOM = { 1: 'Ganze', 2: 'Halbe', 3: 'Drittel', 4: 'Viertel', 5: 'Fünftel', 6: 'Sechstel', 7: 'Siebtel', 8: 'Achtel', 9: 'Neuntel', 10: 'Zehntel', 11: 'Elftel', 12: 'Zwölftel' };

const ONES = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
function numberWord(n) {
  if (n < 20) return ONES[n];
  if (n === 100) return 'hundert';
  const t = Math.floor(n / 10), o = n % 10;
  return (o ? ONES[o] + 'und' : '') + TENS[t];
}
// Nenner als Wort: 14 → Vierzehntel, 24 → Vierundzwanzigstel
function denomWord(d) {
  if (DENOM[d]) return DENOM[d];
  if (d > 100) return d + 'stel';
  const w = numberWord(d);
  return w.charAt(0).toUpperCase() + w.slice(1) + (d < 20 ? 'tel' : 'stel');
}

function fracWords(n, d) {
  n = String(n).trim(); d = String(d).trim();
  if (d === '?') return `${n === '1' ? 'eins' : n} durch wie viel`;
  const dn = Number(d);
  const dw = denomWord(dn);
  if (n === '?') return 'wie viele ' + dw;
  if (n === '1') return dn === 2 ? 'ein Halb' : 'ein ' + dw;
  return n + ' ' + dw;
}

function textToSpeech(t) {
  t = t.replace(/(\d+|\?)\s*\/\s*(\d+|\?)/g, (m, a, b) => fracWords(a, b));
  t = t.replace(/·|×/g, ' mal ')
    .replace(/(\d)\s+:\s+(\d)/g, '$1 geteilt durch $2')
    .replace(/\s:\s/g, ' geteilt durch ')
    .replace(/−|–/g, ' minus ')
    .replace(/\+/g, ' plus ')
    .replace(/\s<\s/g, ' ist kleiner als ')
    .replace(/\s>\s/g, ' ist größer als ')
    .replace(/[⭐✨🎯👍💪🔥🚀]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  // "7 mal 8 =" am Ende wird zur Frage
  if (/=\s*$/.test(t)) {
    t = t.replace(/=\s*$/, '').trim();
    t = /^\d/.test(t) ? 'Wie viel ist ' + t + '?' : t + '?';
  }
  t = t.replace(/=/g, ' ist ').replace(/\s+/g, ' ').trim();
  if (/wie viel/i.test(t) && !/[?.!]$/.test(t)) t += '?';
  return t;
}

// Liest den Text eines Elements; Brüche (.frac) werden als Wörter gesprochen
function elementToSpeech(el) {
  if (!el) return '';
  const c = el.cloneNode(true);
  c.querySelectorAll('.frac').forEach((f) => {
    const n = f.querySelector('.fn'), d = f.querySelector('.fd');
    f.replaceWith(' ' + fracWords(n ? n.textContent : '', d ? d.textContent : '') + ' ');
  });
  let compare = false;
  c.querySelectorAll('.cmp-q').forEach((q) => { compare = true; q.replaceWith(' oder '); });
  c.querySelectorAll('s').forEach((x) => x.remove());
  let t = textToSpeech(c.textContent);
  if (compare) t += '. Was ist größer?';
  return t;
}

function speakElements(els, prefix = '') {
  const parts = els.map(elementToSpeech).filter(Boolean);
  speakText((prefix ? prefix + ' ' : '') + parts.join('. '));
}

/* ---------- Einbau in die Aufgabenkarten ---------- */

// Setzt den 🔊-Knopf in die Karte. getEls liefert die Elemente der Aufgabe.
function attachSpeaker(card, getEls, suffix = '') {
  if (!canSpeak || !speechSettings().on) return;
  card.classList.add('has-speaker');
  const b = document.createElement('button');
  b.className = 'speak-btn';
  b.setAttribute('aria-label', 'Aufgabe vorlesen');
  b.textContent = '🔊';
  b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); speakText(elementsText(getEls()) + suffix); });
  card.appendChild(b);
}
function elementsText(els) { return els.map(elementToSpeech).filter(Boolean).join('. '); }

function autoSpeakTask(getEls, suffix = '') {
  if (speechSettings().on && speechSettings().auto) setTimeout(() => speakText(elementsText(getEls()) + suffix), 250);
}

function speakMistake(els) {
  if (speechSettings().on && speechSettings().mistakes) setTimeout(() => speakText(elementsText(els)), 350);
}
