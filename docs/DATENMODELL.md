# Datenmodell im Browser-Speicher

Alle Daten liegen auf dem Gerät im `localStorage` unter **einem** Schlüssel:

```
rechenheld:v1
```

Der Wert ist ein JSON-Objekt. Gespeichert wird nach jeder Antwort und jeder Änderung (`save()` in `app.js`). Die Sicherungsdatei im Eltern-Bereich enthält genau dieses Objekt.

Mit Chrome kannst du es ansehen: Entwicklertools → Application → Local Storage → `rechenheld:v1`.

## Übersicht

```
{
  version: 1,
  lastProfileId: "p…",
  settings: { … },        // gilt für das ganze Gerät
  profiles: [ { … } ]     // ein Eintrag pro Kind
}
```

## `settings` (Einstellungen des Geräts)

| Feld | Typ | Standard | Bedeutung |
|---|---|---|---|
| `sound` | bool | `true` | Töne bei richtig/falsch |
| `dailyGoal` | Zahl 1–5 | `2` | Runden pro Tag, damit der Tag für den Streak zählt |
| `speech` | bool | `true` | 🔊-Knopf anzeigen |
| `speechAuto` | bool | `false` | Jede Aufgabe automatisch vorlesen |
| `speechMistakes` | bool | `true` | Bei Fehlern Lösung und Erklärung vorlesen |
| `speechSlow` | bool | `false` | Langsamer sprechen |
| `rewards` | Liste | `[]` | Belohnungen der Eltern, siehe unten |
| `parentPin` | Text | `""` | 4-stellige PIN fürs Einlösen (leer = keine PIN) |

Fehlende Felder bedeuten den Standardwert.

`rewards[]`:

| Feld | Bedeutung |
|---|---|
| `id` | z. B. `"rlx3k9a2b"` |
| `emoji` | z. B. `"🍦"` |
| `name` | z. B. `"Eis essen"` |
| `cost` | Sterne, die zum Einlösen nötig sind |

## `profiles[]` (ein Kind)

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | Text | z. B. `"plx3k9a2b1c"` |
| `name`, `avatar` | Text | Name und Emoji |
| `grade` | Zahl 2–7 | Klasse. Ab 5 gibt es die Bruch-Themen für Fortgeschrittene, ab 3 Teilen mit Rest |
| `createdAt` | ISO-Datum | Anlage des Profils |
| `stars` | Zahl | **Gesamtsumme** aller Sterne, wird nie kleiner. Davon hängen die freigeschalteten Avatare ab |
| `spent` | Zahl | Für Belohnungen ausgegebene Sterne. **Sterne-Konto** = `stars − spent` |
| `today` | `{date, stars}` | Sterne von heute. Ist `date` nicht heute, gilt der Wert als 0 |
| `badges` | Liste von Texten | Abzeichen-IDs, z. B. `"first"`, `"perfect"`, `"day1"`, `"days7"`, `"restFirst"` |
| `stats` | Objekt | Statistik pro Aufgabe, siehe unten |
| `sessions` | Liste | Alle beendeten Runden (höchstens 500) |
| `days` | Objekt | Ein Eintrag pro Übungstag (höchstens 400 Tage) |
| `best` | Objekt | Bestwerte |
| `multPrefs` | `{rows, div}` | Gewählte Einmaleins-Reihen und ob Geteilt-Aufgaben dabei sind |
| `challenge` | `{date, id, done}` | Tagesaufgabe von heute |
| `challengeCount` | Zahl | Wie oft eine Tagesaufgabe geschafft wurde |
| `redemptions` | Liste | Eingelöste Belohnungen |

### `stats`

```
stats: {
  mult: {                         // Einmaleins, ein Eintrag pro Aufgabe, kleinere Zahl zuerst
    "7x8": { c: 5, w: 1, s: 3, t: 1763900000000 }
  },
  frac: {                         // Brüche, ein Eintrag pro Thema
    "kuerzen": { c: 12, w: 4, best: 88 }
  },
  rest: { c: 20, w: 3, best: 100 } // Teilen mit Rest
}
```

| Kürzel | Bedeutung |
|---|---|
| `c` | richtig beantwortet |
| `w` | falsch beantwortet |
| `s` | richtig in Folge. Ab 2 gilt die Aufgabe als gemeistert |
| `t` | Zeitpunkt der letzten Antwort (Millisekunden) |
| `best` | bestes Rundenergebnis in Prozent. Daraus werden die ★ berechnet |

7 · 8 und 8 · 7 sind dieselbe Aufgabe (`7x8`), es gibt also 55 Aufgaben. Geteilt-Aufgaben (56 : 7 und 56 : 8) zählen ebenfalls bei `7x8` mit. `stats.multV: 2` zeigt, dass ältere getrennte Einträge (`8x7`) schon zusammengeführt wurden.

Themen-IDs der Brüche: `erkennen`, `faerben`, `vergleichen`, `plus-gleich` (Einstieg) sowie `erweitern`, `kuerzen`, `vergleichen2`, `plusminus`, `mal`, `geteilt`, `gemischt`, `dezimal` (ab Klasse 5).

### `sessions[]`

```
{ type: "mult", mode: "mix", date: "2026-11-23T14:02:11.000Z", correct: 9, total: 10, ms: 61234, stars: 9 }
{ type: "frac", topic: "mal", date: "…", correct: 7, total: 8, ms: 95000, stars: 7 }
{ type: "rest", date: "…", correct: 10, total: 10, ms: 80000, stars: 13 }
```

`mode` beim Einmaleins: `rows` (gewählte Reihen), `mix` oder `blitz` (60 Sekunden).

### `days` (für Streak und Kalender)

```
days: {
  "2026-11-23": { rounds: 3, stars: 24, met: true }
}
```

Der Schlüssel ist das lokale Datum. `met` wird `true`, sobald `rounds` das Tagesziel erreicht. Der Streak zählt die Tage mit `met: true` lückenlos rückwärts. Ist heute noch offen, zählt er ab gestern.

### `best`

| Feld | Bedeutung |
|---|---|
| `blitz` | meiste richtige Aufgaben in einer Blitzrunde |
| `streak` | längste Serie richtiger Antworten |
| `dayStreak` | längster Streak in Tagen |

### `redemptions[]`

```
{ id: "r…", emoji: "🍦", name: "Eis essen", cost: 100, date: "2026-11-23T15:00:00.000Z" }
```

Name und Kosten werden beim Einlösen mitgespeichert. So bleibt der Verlauf richtig, auch wenn die Belohnung später geändert oder gelöscht wird.

## Beispiel (gekürzt)

```json
{
  "version": 1,
  "lastProfileId": "plx3k9a2b1c",
  "settings": {
    "sound": true, "dailyGoal": 2, "speech": true,
    "rewards": [{ "id": "rlx3k9a2b", "emoji": "🍦", "name": "Eis essen", "cost": 100 }],
    "parentPin": "4711"
  },
  "profiles": [{
    "id": "plx3k9a2b1c", "name": "Mia", "avatar": "🦉", "grade": 6,
    "createdAt": "2026-11-20T16:00:00.000Z",
    "stars": 260, "spent": 100, "today": { "date": "2026-11-23", "stars": 24 },
    "badges": ["first", "perfect", "day1"],
    "stats": {
      "mult": { "7x8": { "c": 5, "w": 1, "s": 3, "t": 1763900000000 } },
      "frac": { "kuerzen": { "c": 12, "w": 4, "best": 88 } },
      "rest": { "c": 20, "w": 3, "best": 100 }
    },
    "sessions": [{ "type": "frac", "topic": "kuerzen", "date": "2026-11-23T14:02:11.000Z", "correct": 7, "total": 8, "ms": 95000, "stars": 7 }],
    "days": { "2026-11-23": { "rounds": 3, "stars": 24, "met": true } },
    "best": { "blitz": 18, "streak": 12, "dayStreak": 4 },
    "multPrefs": { "rows": [2, 5, 10], "div": true },
    "challenge": { "date": "2026-11-23", "id": "frac-kuerzen", "done": true },
    "challengeCount": 3,
    "redemptions": [{ "id": "rlx3k9a2b", "emoji": "🍦", "name": "Eis essen", "cost": 100, "date": "2026-11-23T15:00:00.000Z" }]
  }]
}
```

## Hinweise

- Neue Felder kommen nach und nach dazu. Ältere Profile haben sie noch nicht, darum prüft der Code immer mit Standardwerten (`p.spent || 0` usw.).
- Die App und die Android-App (TWA) teilen sich den Speicher von Chrome für `axelrueweler.github.io`.
- Wer Browserdaten löscht, löscht auch den Fortschritt. Deshalb gibt es die Sicherung im Eltern-Bereich.
