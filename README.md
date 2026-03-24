# 🧪 Browser API Playground

An interactive showcase of **30 modern Browser APIs** — built with pure HTML, CSS and Vanilla JavaScript. No frameworks, no build tools, no backend.

---

## ✨ Features

Each API is presented as a card with:
- **Status badge** (supported / limited / unsupported) — detected in the visitor's browser
- Short description and link to relevant spec
- Interactive demo buttons
- Live output console

### APIs covered
Device Orientation · Geolocation · Vibration · Web Audio · Battery Status ·
Network Information · Online/Offline · Page Visibility · Clipboard · Fullscreen ·
Wake Lock · Web Share · Notifications · Speech Synthesis · Speech Recognition ·
MediaDevices (Camera/Mic) · Drag & Drop + File API · LocalStorage / SessionStorage ·
IndexedDB · Service Worker · History API · MatchMedia · Pointer Events ·
Gamepad · Web Worker · Performance · Intersection Observer · Resize Observer ·
Screen Info · Crypto API

---

## 🚀 Run Locally

No build step needed — just open the file:

```bash
# Option A – direct file open
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

> **Note:** Some APIs (Geolocation, Camera, Clipboard, Wake Lock, Notifications,
> Service Worker, Speech Recognition) require a **secure context (HTTPS)**.  
> To test these locally, use a simple HTTPS-capable server:

```bash
# Python 3
python -m http.server 8080
# Then visit: http://localhost:8080

# Node.js (npx)
npx serve .
```

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select `main` branch and `/ (root)`.
4. Click **Save** — your site will be live at  
   `https://<username>.github.io/<repo-name>/`

GitHub Pages serves over HTTPS, so all permission-gated APIs will work.

---

## ⚠️ API Compatibility Notes

| API | Limitation |
|-----|------------|
| Vibration | Android Chrome only; not available on iOS or desktop |
| Battery Status | Chromium only; deprecated in spec |
| Network Information | Chromium only |
| Speech Recognition | Chrome / Edge only; requires HTTPS |
| Device Orientation | iOS 13+ requires explicit permission prompt |
| Wake Lock | Chrome / Edge 84+; requires HTTPS |
| Web Share | Mobile browsers and select desktops |
| Notifications | Not available in iOS Safari without Push entitlement |

---

## 📁 File Structure

```
Browser_experiment/
├── index.html   — Main page with all 30 API sections
├── style.css    — Dark theme, responsive grid, status badges
├── script.js    — Feature detection + demos for every API
├── sw.js        — Service Worker (offline cache strategy)
└── README.md
```

---

*Built with ❤️ using plain HTML · CSS · Vanilla JS*

