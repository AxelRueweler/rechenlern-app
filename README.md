# Rechenheld

Eine Lern-Web-App für Kinder: **Einmaleins** und **Bruchrechnung** spielerisch üben.
Läuft im Browser auf Tablet und Handy, lässt sich zum Startbildschirm hinzufügen und funktioniert danach auch offline.

## Funktionen

- Profile pro Kind (Name, Tier-Avatar, Klasse)
- Einmaleins: Reihen üben, „Mix“ (schwierige Aufgaben kommen öfter), 60-Sekunden-Blitzrunde, optional Geteilt-Aufgaben
- Sterne, Serien und Abzeichen
- Fortschritt wird auf dem Gerät gespeichert, Sicherung als Datei im Eltern-Bereich (⚙️)
- Geplant: Bruchrechnung, Fortschrittsübersicht

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
| `styles.css` | Gestaltung (hell/dunkel, Touch-optimiert) |
| `sw.js` | Offline-Unterstützung (bei Änderungen `VERSION` erhöhen) |
| `manifest.webmanifest` | App-Name und Icons für den Startbildschirm |

Lokal testen: `python3 -m http.server` im Ordner starten und `http://localhost:8000` öffnen.
