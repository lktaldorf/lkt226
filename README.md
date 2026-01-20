# LKT Tracker 2026

Anwesenheits-Tracker für die Lumpenkapelle Taldorf.

## 🚀 Live App

**[LKT Tracker öffnen](https://DEINUSERNAME.github.io/lkt-tracker/)**

## Features

- 📱 PWA - Installierbar auf Handy
- 📷 QR-Code Scanner für Check-in
- 📴 Offline-Modus mit Sync
- ⚖️ Strafanzeigen-System
- 📊 Statistiken & Ranglisten
- 📄 PDF-Export

## Setup

### 1. Google Sheets Backend

1. Erstelle ein neues Google Sheet
2. Gehe zu **Erweiterungen → Apps Script**
3. Füge den Inhalt von `Code.gs` ein
4. Führe `initializeSheet` aus (Play-Button)
5. **Bereitstellen → Neue Bereitstellung → Web-App**
6. Ausführen als: "Ich", Zugriff: "Jeder"
7. Kopiere die URL

### 2. App konfigurieren

In `index.html` die API_URL anpassen:
```javascript
const API_URL = 'DEINE_GOOGLE_SCRIPT_URL';
```

## Zugangsdaten

- **Mitglieder**: Name + persönliche PIN
- **Hohes Gericht**: PIN erfragen

## Technologie

- Vanilla JavaScript
- Google Sheets als Datenbank
- Google Apps Script als API
- PWA mit Service Worker
