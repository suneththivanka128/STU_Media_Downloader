# 🚀 Smart Media Downloader — සම්පූර්ණ Implementation Plan

මේක ඔයාගේ project එක **step-by-step, phase එකෙන් phase එකට** build කරගන්න පුළුවන් practical roadmap එකක්. දැනටමත් `app.py` (backend) එක substantial කොටසක් ready — ඒ නිසා Phase 1-3 බොහෝදුරට "test & fill gaps" වගේ, Phase 4 ඉදිරියට "build new" වගේ.

---

## 📅 Phase Overview (Timeline Estimate)

| Phase | කාර්යය | ඇස්තමේන්තු කාලය |
|---|---|---|
| 0 | Environment Setup | 1-2 hours |
| 1 | Backend Core — Test & Fix | 1-2 days |
| 2 | Backend Security Hardening | 1 day |
| 3 | Backend Advanced Features | 1-2 days |
| 4 | Chrome Extension — Structure | 1 day |
| 5 | Chrome Extension — UI | 2-3 days |
| 6 | Chrome Extension — Backend Integration | 2 days |
| 7 | End-to-End Testing | 1-2 days |
| 8 | Packaging & Distribution | 1-2 days |

**මුළු ඇස්තමේන්තුව:** ~2-3 සතියක්, solo developer කෙනෙක් part-time වැඩ කළොත්.

---

## 🧱 Phase 0 — Environment Setup

### Checklist
- [ ] Python 3.10+ install කරන්න (`python --version` check කරන්න)
- [ ] Project folder structure හදන්න:
```
smart-media-downloader/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── bin/                  # auto-downloaded tools මෙතන save වේ
├── extension/
│   ├── manifest.json
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   └── icons/
└── README.md
```
- [ ] `python -m venv venv` — virtual environment එකක් හදන්න
- [ ] `pip install -r requirements.txt --break-system-packages` (Flask, flask-cors, SQLAlchemy, waitress)
- [ ] System tools manually install කරන්න (dev වේලාවේ auto-download logic එක depend නොවී test කරන්න):
  - `yt-dlp`: `pip install yt-dlp` හෝ binary download
  - `aria2c`: `apt install aria2` (Linux) / `brew install aria2` (macOS) / manual download (Windows)
  - `ffmpeg`: `apt install ffmpeg` / `brew install ffmpeg` / manual download (Windows)
- [ ] `shutil.which("yt-dlp")`, `which("aria2c")`, `which("ffmpeg")` — terminal එකෙන් confirm කරන්න tools 3ම PATH එකේ තියෙනවද කියලා

---

## ⚙️ Phase 1 — Backend Core: Test & Fix

දැනටමත් `app.py` එකේ තියෙන core logic එක verify කරගන්න.

### Tasks
1. **`init_db()` run කරලා verify කරන්න**
   ```bash
   python -c "from app import init_db; init_db(); print('DB created')"
   ```
   - [ ] `~/.smartdownloader/history.db` file එක create වුණාද check කරන්න
   - [ ] `sqlite3 ~/.smartdownloader/history.db ".schema"` — table structure එක correct ද බලන්න

2. **`/health` endpoint test කරන්න**
   ```bash
   python app.py &
   curl http://127.0.0.1:5000/health
   ```
   - [ ] `{"status": "ok", "os": "Linux"}` වගේ response එකක් එනවද

3. **`/download` endpoint — simple public domain video එකකින් test කරන්න**
   ```bash
   curl -X POST http://127.0.0.1:5000/download \
     -H "Content-Type: application/json" \
     -d '{"url": "<test video URL>", "format": "mp4", "quality": "best", "connections": 4}'
   ```
   - [ ] `task_id` සහ `queue_position` return වෙනවද
   - [ ] Downloads folder එකේ actual file එක save වෙනවද
   - [ ] `~/.smartdownloader/history.db` එකට entry එකක් write වුණාද (`/history` GET call කරලා check කරන්න)

4. **Bug fixing priority list** (existing code එකේ common issues):
   - [ ] `PROGRESS_RE` regex එක — ඔයාගේ `yt-dlp` version එකේ actual output format එකට match වෙනවද verify කරන්න (versions අතර output format වෙනස් වෙන්න පුළුවන්)
   - [ ] `"Destination:"` string matching — sometimes `yt-dlp` "[download] Destination:" කියලා format කරනවා, exact string එක confirm කරන්න
   - [ ] Concurrent downloads 2-3ක් එකවර run කරලා queue position update correctly වෙනවද test කරන්න

---

## 🛡️ Phase 2 — Backend Security Hardening

### Tasks
- [ ] **Extension ID confirm කිරීම** — Phase 4 එකේ extension load කරාට පස්සේ actual ID එක ගෙන `EXTENSION_ORIGIN` env variable එකට දාන්න
- [ ] **`manifest.json` fixed key එක generate කිරීම** (Phase 4 එකේ)
- [ ] **`/open-folder` path traversal test** — intentionally `/etc/passwd` වගේ path එකක් යවලා `403 Access denied` එනවද confirm කරන්න
- [ ] **CORS restriction manual test** — `curl` එකෙන් `Origin: https://malicious-site.com` header එකක් යවලා request block වෙනවද බලන්න:
  ```bash
  curl -X POST http://127.0.0.1:5000/download \
    -H "Origin: https://malicious-site.com" \
    -H "Content-Type: application/json" -d '{"url":"test"}'
  ```
- [ ] **Checksum values fill කිරීම** (production ready කරන්න කලින්):
  - [ ] `yt-dlp` release page එකේ `SHA2-256SUMS` file එකෙන් actual hash එක ගන්න
  - [ ] `aria2c` release notes / asset page එකෙන් checksum ගන්න
  - [ ] `ffmpeg` build page එකෙන් checksum ගන්න
  - [ ] `TOOL_DOWNLOAD_URLS` dict එකේ `sha256` values update කරන්න

---

## 🔧 Phase 3 — Backend Advanced Features

### Tasks
- [ ] **SSE progress stream browser එකෙන් test කිරීම**
  ```javascript
  // Browser console එකේ run කරලා බලන්න
  const es = new EventSource("http://127.0.0.1:5000/progress-stream/<task_id>");
  es.onmessage = (e) => console.log(JSON.parse(e.data));
  ```
- [ ] **`threaded=True` / waitress verify කිරීම** — SSE stream එකක් open කරගෙන ඉන්නකොට, දෙවෙනි request එකක් (`/health`) block නොවී respond වෙනවද test කරන්න
- [ ] **Partial-file cleanup manual trigger** — download එකක් mid-way `Ctrl+C` කරලා, Downloads folder එකේ `.part` files clean වුණාද check කරන්න
- [ ] **History search/filter/pagination test**
  ```bash
  curl "http://127.0.0.1:5000/history?page=1&limit=10&status=Completed&q=test"
  ```
- [ ] **Production server switch test**
  ```bash
  pip install waitress --break-system-packages
  python app.py --prod
  ```

---

## 🎨 Phase 4 — Chrome Extension: Structure & Manifest

### Tasks
- [ ] `manifest.json` (Manifest V3) හදන්න — permissions: `activeTab`, `scripting`, `storage`, `host_permissions` (target sites + `http://127.0.0.1:5000/*`)
- [ ] **Fixed extension ID සඳහා key generate කිරීම:**
  1. Extension folder එක temporary විදිහට pack කරන්න: `chrome://extensions` → "Pack extension"
  2. ලැබෙන `.pem` file එකෙන් public key එක extract කරන්න:
     ```bash
     openssl rsa -in key.pem -pubout -outform DER | openssl base64 -A
     ```
  3. එම string එක `manifest.json` හි `"key"` field එකට දාන්න
  4. දැන් "Load unpacked" කරාට පස්සේත් extension ID එක **fixed** වේ
- [ ] Extension icons හදන්න (16x16, 48x48, 128x128)
- [ ] `content.js` skeleton එකක් හදන්න — video/audio element detection logic එකේ පටන්ගැනීම

---

## 🖼️ Phase 5 — Chrome Extension: UI Build

### Tasks (කලින් සාකච්ඡා කරපු UI spec එකට අනුව)
- [ ] **Overlay Badge** (`content.js`) — video element මත `⚡ Download Media` button එක inject කිරීම
- [ ] **Popup HTML/CSS** (`popup.html`, `popup.css`) — Tab navigation: Media / Queue / History
- [ ] **Media Detection Tab** — URL auto-fill, Scan button, Thumbnail preview
- [ ] **Customization Panel** — Format dropdown, Quality selector, aria2c connections slider
- [ ] **Live Queue Card** — Progress bar, speed, ETA, status badge components (static UI විතරක්, backend integration Phase 6 එකේ)
- [ ] **History Tab UI** — List items, search bar, filter dropdown, pagination controls (static UI)

> 💡 මේ Phase එකේදී UI එක **backend එකට connect නොකර** static HTML/CSS/JS එකක් විදිහට හදාගන්න — logic සහ visual layout දෙකම එකවර debug කරනවට වඩා පහසුයි.

---

## 🔌 Phase 6 — Chrome Extension: Backend Integration

### Tasks
- [ ] `popup.js` — `/download` POST request wire කිරීම
- [ ] SSE client — `EventSource` object එකෙන් `/progress-stream/<task_id>` සම්බන්ධ කිරීම, Live Queue Card UI එක real-time update කිරීම
- [ ] Popup reopen scenario handle කිරීම — Popup close/reopen වුණාම active task ID එක `chrome.storage.local` එකේ තියාගෙන, reconnect කරද්දී current state එක ලබාගැනීම
- [ ] `/history` GET — History tab load වෙද්දී fetch කිරීම, pagination buttons wire කිරීම
- [ ] `/history/<id>` DELETE, `/history/clear` POST — Remove/Clear actions wire කිරීම
- [ ] `/open-folder` POST — 📂 icon click handler
- [ ] Error handling — Backend එක run වෙන්නේ නැත්නම් (`fetch` fail) user ට friendly error message එකක් පෙන්වීම ("Backend not running — please start the app")

---

## 🧪 Phase 7 — End-to-End Testing

### Test Matrix

| Test Case | Expected Result |
|---|---|
| Video badge click → popup auto-fill | Link auto-populate වේ |
| Scan → preview load | Title/thumbnail/qualities පෙන්වයි |
| Single download, default settings | File Downloads folder එකට save වේ, history entry එකක් හැදෙයි |
| 4+ concurrent downloads | 3ක් parallel run වේ, ඉතිරි ඒවා queue position සමඟ පෙන්වයි |
| Mid-download cancel/crash | Partial files clean වේ, history එකට "Failed" ලෙස log වේ |
| Popup close → reopen mid-download | Progress state නිවැරදිව restore වේ |
| History search/filter | නිවැරදි results පෙන්වයි |
| 📂 Open Folder | OS file explorer එක correct location එකේ open වේ |
| Malicious-origin curl request | CORS මගින් block වේ |
| Path traversal attempt (`/open-folder`) | 403 Access denied |
| Tool missing (uninstall aria2c temporarily) | Self-healing auto re-download වේ |
| Cross-platform (Windows/macOS/Linux) | UI + download flow එකම විදිහට වැඩ කරයි |

---

## 📦 Phase 8 — Packaging & Distribution

### Backend
- [ ] `pip install pyinstaller --break-system-packages`
- [ ] `pyinstaller --onefile --name smart-downloader-backend app.py`
- [ ] Windows/macOS/Linux — OS එක් එකකටම build එකක් හදන්න (cross-compile බැරි නිසා, එක් එක් OS එකේම run කරන්න ඕන)
- [ ] Backend auto-start කරන launcher script එකක් (Windows: `.bat` / Startup folder shortcut, macOS: LaunchAgent plist, Linux: systemd user service) — user ට manually run කරන්න අවශ්‍ය නොවන පරිදි

### Extension
- [ ] Chrome Web Store Developer account එකක් හදන්න ($5 one-time fee)
- [ ] Extension `.zip` package කිරීම
- [ ] Store listing — screenshots, description, privacy policy (backend එක local-only බව clearly state කරන්න)
- [ ] Review submit කිරීම

---

## ⚠️ Critical Path — මුලින්ම කරන්න ඕන දේවල් (Priority Order)

ඔයාට කාලය සීමිත නම්, මේ order එකෙන් යන්න:

1. **Phase 0 + Phase 1** — Backend එක actually download කරන්නද කියලා confirm කරගන්න (core value proposition එක)
2. **Phase 4 + Phase 5 (minimal)** — Basic popup UI එකක් (scan + download button විතරක්) backend එකට wire කරන්න
3. **Phase 6 (core flow විතරක්)** — Download + progress streaming end-to-end වැඩ කරනවද confirm කරන්න
4. **Phase 2** — Security hardening (production වලට කලින් අනිවාර්යයෙන්)
5. **Phase 3, 5 (full), 7, 8** — History UI, full polish, testing, packaging

---

## 📝 Notes

- **Legal reminder:** Testing කරද්දී public domain/Creative Commons/ඔයාගේම videos පමණක් use කරන්න.
- **`requirements.txt`** already ready — `pip install -r requirements.txt --break-system-packages`
- **Checksum values සහ Extension ID** — Phase 2/4 එකේදී fill කරන්න ඕන, ඒ දෙක නැතුව testing කරන්න පුළුවන් (කලින් සාකච්ඡා කළ පරිදි graceful fallback ඇති නිසා)
