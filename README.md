# Rechenheld

Eine Lern-Web-App für Kinder: **Einmaleins** und **Bruchrechnung** spielerisch üben.
Läuft im Browser auf Tablet und Handy, lässt sich zum Startbildschirm hinzufügen und funktioniert danach auch offline.

## Funktionen

- Profile pro Kind (Name, Tier-Avatar, Klasse)
- Einmaleins: Reihen üben, „Mix“ (schwierige Aufgaben kommen öfter), 60-Sekunden-Blitzrunde, optional Geteilt-Aufgaben
- Sterne, Serien und Abzeichen
- Vorlesen: 🔊-Knopf bei jeder Aufgabe, optional automatisch, Lösung bei Fehlern (Einstellungen im Eltern-Bereich)
- Fortschritt wird auf dem Gerät gespeichert, Sicherung als Datei im Eltern-Bereich (⚙️)
- Teilen mit Rest (ab Klasse 3), z. B. 17 : 5 = 3 Rest 2, mit Erklärung bei Fehlern
- Brüche: Einstieg (erkennen, einfärben, vergleichen, plus) und Aufbau (erweitern, kürzen, vergleichen, plus/minus, mal, teilen, gemischte Zahlen, Dezimalzahlen) mit Erklärung bei Fehlern
- Belohnungen der Eltern zum Einlösen (mit Sternen, optional mit Eltern-PIN)
- Tagesaufgabe mit Bonussternen und neue Avatare als Belohnung für gesammelte Sterne
- Tagesziel (im Eltern-Bereich einstellbar) und Tages-Streak mit Wochenleiste
- Fortschrittsseite: Kalender der letzten 4 Wochen, Einmaleins-Tafel, Bruch-Themen, alle Abzeichen

## Auf dem Tablet installieren

1. Die Seite (GitHub-Pages-Link) in **Chrome** oder **Samsung Internet** öffnen.
2. Menü (⋮) → **„Zum Startbildschirm hinzufügen“** bzw. **„App installieren“**.
3. Die App startet dann im Vollbild wie eine normale App.

## Technik

Reines HTML, CSS und JavaScript, keine Abhängigkeiten, kein Build-Schritt.

| Datei | Inhalt |
|---|---|
| `index.html` | Einstiegsseite |
| `app.js` | Profile, Speichern, Navigation, Eltern-Bereich |
| `mult.js` | Einmaleins-Modul |
| `rest.js` | Teilen mit Rest |
| `frac.js` | Bruchrechnen-Modul |
| `progress.js` | Tagesziel, Streak und Fortschrittsseite |
| `rewards.js` | Tagesaufgabe und Avatar-Belohnungen |
| `shop.js` | Belohnungen der Eltern zum Einlösen |
| `speech.js` | Sprachausgabe (Vorlesen der Aufgaben) |
| `styles.css` | Gestaltung (hell/dunkel, Touch-optimiert) |
| `sw.js` | Offline-Unterstützung (bei Änderungen `VERSION` erhöhen) |
| `manifest.webmanifest` | App-Name und Icons für den Startbildschirm |

Lokal testen: `python3 -m http.server` im Ordner starten und `http://localhost:8000` öffnen.

## Tests

Die Tests prüfen die Rechenlogik und die wichtigsten Abläufe in einem echten Browser (Chromium über Playwright).

```bash
npm install          # einmalig, installiert Playwright
npx playwright install chromium
npm test             # alle Tests (ca. 1 Minute)
npm run test:logic   # nur Rechenlogik (wenige Sekunden)
npm run test:flows   # nur Abläufe und Layout
```

| Datei | Was wird geprüft |
|---|---|
| `tests/logic.test.js` | Einmaleins- und Rest-Aufgaben, alle Bruch-Themen (genau eine richtige Antwort, keine kaputten Texte), Mal-Nehmen in zwei Schritten, Vorlesen, Tagessterne, Streak, Tagesaufgabe, Avatare, Sterne-Konto |
| `tests/flows.test.js` | Profil anlegen, ganze Runden Einmaleins, Teilen mit Rest und Brüche mal nehmen per Antippen, Belohnung mit PIN einlösen, Themen je Klasse, kein seitliches Überstehen auf Handy und Tablet |
| `tests/helpers.js` | Kleiner Webserver und Browser-Start |

Das Speicherformat ist in [docs/DATENMODELL.md](docs/DATENMODELL.md) beschrieben.

## Android-App (Trusted Web Activity)

Der Ordner `android/` enthält eine kleine Android-Hülle, die die Web-App von GitHub Pages im Vollbild öffnet. Sie erscheint auf dem Tablet als eigene App „Rechenheld“.

- **Neue Funktionen veröffentlichen:** einfach wie bisher auf `main` pushen. Die App lädt die neue Version automatisch, die APK muss nicht neu installiert werden.
- **APK bauen:** GitHub Actions baut sie bei Änderungen in `android/` (oder per Hand unter Actions → „Android-App bauen“ → Run workflow) und legt sie im Release `android` ab.
- **Signatur:** Die Secrets `KEYSTORE_BASE64` und `KEYSTORE_PASSWORD` müssen im Repo hinterlegt sein. Immer denselben Schlüssel verwenden, sonst lassen sich Updates nicht installieren.
- **Vollbild ohne Adressleiste:** Android prüft die Datei `https://axelrueweler.github.io/.well-known/assetlinks.json`. Sie liegt als Vorlage in `android/assetlinks.json` und gehört in das Repo `AxelRueweler.github.io` (Ordner `.well-known/`, dazu eine leere Datei `.nojekyll`). Fehlt sie, läuft die App trotzdem, zeigt aber oben eine Adressleiste.
