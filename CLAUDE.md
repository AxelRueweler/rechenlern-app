# Rechenheld – Hinweise für die Entwicklung

- Vanilla-JS-PWA ohne Build-Schritt. Kommunikation und Texte auf Deutsch.
- Vor jedem Commit `npm test` ausführen. Neue Funktionen bekommen einen Test in `tests/logic.test.js` (Logik) oder `tests/flows.test.js` (Abläufe).
- Bei jeder Änderung an App-Dateien `VERSION` in `sw.js` erhöhen, damit die Geräte das Update laden.
