# ⚡ STU Media Downloader

A high-performance, cross-platform media downloader combining a robust Python Flask backend (powered by `yt-dlp` and `aria2c` multi-connection acceleration) with a sleek browser extension frontend — available for **Chrome/Edge (Manifest V3)** and **Firefox (Manifest V2)**.

---

## 🌟 Key Features

- ⚡ **3×–5× Multi-Connection Boost:** Multi-segmented acceleration via `aria2c` (up to 16 parallel connections per file).
- 🎬 **Smart Video Detection & Auto-Open:** Detects HTML5 video players on any website and injects an **⚡ Download** overlay badge. Clicking it opens the popup and pre-fills media details automatically.
- 📡 **HLS/M3U8 Stream Interception:** Silently captures `.m3u8` playlists and `.ts` segments from any website (including deep CDN paths). Auto-fills the download input — no manual URL copying needed.
- 🧲 **Torrent & FTP Downloads (NEW in v1.0.2):** New dedicated tab sends magnet links, `.torrent` URLs, `ftp://` paths, and direct HTTPS file links straight to `aria2c` — live progress in the Queue tab.
- ⚙️ **Settings Overlay (NEW in v1.0.2):** Settings moved from a tab to a slide-down overlay panel triggered by the `⚙️` header icon — eliminating the server status lag on popup open.
- 🔄 **Self-Updating Engine:** Automatically checks and applies `yt-dlp` updates on every start.
- 📡 **Real-time Live Progress (SSE):** Server-Sent Events stream live speed, file size, percentage, and ETA.
- 🛑 **Task Cancellation & Cleanup:** Cancel any download with immediate partial-file removal (`.part`, `.ytdl`, `.aria2`).
- 🗄️ **Persistent SQLite History:** Full download records with search, status filters, and pagination.
- 📂 **Native Folder Picker & File Explorer:** One-click OS folder selection and file manager opening.
- 🦊 **Firefox Support (NEW in v1.0.2):** Separate `extension-firefox/` folder with Manifest V2 for Firefox 109+.

---

## 🚀 Quick Start

### 1. Launch the Backend Server

| Platform | Command |
|---|---|
| 🐧 **Linux** — terminal | `./Linux_start_downloader.sh` |
| 🐧 **Linux** — silent background | `./Linux_start_background.sh` |
| 🐧 **Linux** — stop | `./Linux_stop_downloader.sh` |
| 🍎 **macOS** — launch | Double-click `macOS_start_downloader.command` |
| 🍎 **macOS** — stop | Double-click `macOS_stop_downloader.command` |
| 🪟 **Windows** — standard | Double-click `Windows_start_downloader.bat` |
| 🪟 **Windows** — silent | Double-click `Windows_start_hidden.vbs` |
| 🪟 **Windows** — stop | Double-click `Windows_stop_downloader.bat` |
| 🧩 **In Extension** | Click `⚙️` → **🛑 Stop Server** |

### 2. Install the Extension

#### 🌐 Chrome / Edge / Brave (Manifest V3)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** → select the **`extension/`** folder.
4. Pin **STU Media Downloader** to your toolbar.

#### 🦊 Firefox (Manifest V2)

> Firefox requires a **separate folder** because it uses Manifest V2 with `background.scripts` instead of `service_worker`, and `browserAction` instead of `action`.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**
3. Navigate to the **`extension-firefox/`** folder and select `manifest.json`.
4. The extension will load. *(Note: Temporary add-ons are removed on browser restart — use `web-ext` for persistent installs.)*

##### Permanent Firefox Install via `web-ext`

```bash
npm install -g web-ext
cd extension-firefox/
web-ext run           # launch Firefox with the extension loaded
web-ext build         # creates a .zip for submission to addons.mozilla.org
```

#### Key Differences Between Extension Versions

| Feature | Chrome/Edge (`extension/`) | Firefox (`extension-firefox/`) |
|---|---|---|
| Manifest version | **V3** | **V2** |
| Background | `service_worker` | `scripts: ["background.js"]` |
| Toolbar action | `chrome.action` | `chrome.browserAction` |
| Popup open API | `chrome.action.openPopup` ✅ | Not supported in MV2 ❌ |
| Per-tab badge | `setBadgeText({ tabId })` | Global badge (MV2 limitation) |
| URL check | `chrome-extension://` | `moz-extension://` |
| Min browser version | Chrome 88+ | Firefox 109+ |

---

## 🧭 How to Use

### Standard Sites (YouTube, Vimeo, Twitter/X, etc.)
1. Browse to any video. Click the **⚡ Download** badge on the player — popup opens with media pre-loaded.
2. Or click the extension icon → **🌐 Current Tab** to scan manually.
3. Choose format (MP4/MKV/MP3/WebM), quality, and connection count → **🚀 Start Download**.
4. Watch live progress in the **⚡ Queue** tab. Finished downloads appear in **📜 History**.

### HLS Streaming Sites (vixeo.io, Lulustream, etc.)
1. **Reload the page** after installing the extension.
2. **Press ▶️ Play** on the video.
3. Wait **2–3 seconds** for the stream to be captured.
4. Click the extension icon — the M3U8 URL is auto-filled.
5. Click **📡 Download HLS Stream**.

> If the stream hasn't been captured yet, the extension shows step-by-step instructions automatically.

### 🧲 Torrent & FTP Downloads (New!)
1. Click the **🧲 Torrent & FTP** tab.
2. Paste a **magnet link**, `.torrent` URL, `ftp://` path, or any direct HTTPS file link.
3. The extension auto-detects the type and shows a preview card.
4. Optionally enter a custom name → click **🧲 Start Download**.
5. Download is handed to `aria2c` — live progress appears in the **⚡ Queue** tab.

| Input Type | Example |
|---|---|
| Magnet link | `magnet:?xt=urn:btih:...&dn=Ubuntu+22.04` |
| Torrent file | `https://example.com/file.torrent` |
| FTP | `ftp://ftp.example.com/pub/file.iso` |
| Direct HTTP | `https://releases.ubuntu.com/22.04/ubuntu-22.04-live.iso` |

### ⚙️ Settings Panel (New!)
- Click the **⚙️** icon in the popup header (next to ⤢) to open the settings overlay.
- Configure: simultaneous downloads, connection threads, default format/quality, download folder.
- Server status indicator is now **inside** the settings panel — no longer blocks popup open.

---

## 📁 Project Structure

```
STU_Media_Downloader/
├── Linux_start_downloader.sh       # Linux launcher (with auto-update)
├── Linux_start_background.sh       # Linux silent background launcher
├── Linux_stop_downloader.sh        # Linux stop script
├── Windows_start_downloader.bat    # Windows launcher
├── Windows_start_hidden.vbs        # Windows 1-click invisible background launcher
├── Windows_stop_downloader.bat     # Windows stop script
├── macOS_start_downloader.command  # macOS launcher
├── macOS_stop_downloader.command   # macOS stop script
├── STU-Media-Downloader.desktop    # Linux desktop shortcut
│
├── backend/
│   ├── app.py                     # Flask server, download engine, SSE, aria2c endpoints
│   ├── requirements.txt           # Python dependencies
│   ├── bin/                       # Self-healed binaries (yt-dlp, aria2c)
│   ├── Downloads/                 # Default media output directory
│   └── tests/
│       └── test_backend.py        # Pytest suite (15 unit tests)
│
├── extension/                     # ── Chrome / Edge / Brave (Manifest V3) ──
│   ├── manifest.json              #   MV3 config: service_worker, action, host_permissions
│   ├── background.js              #   Service worker: HLS interceptor + popup auto-open
│   ├── content.js                 #   In-page video detection & overlay badge injection
│   ├── content.css                #   Overlay badge & toast styling
│   ├── popup.html                 #   4-tab popup UI (Media, Queue, History, Torrent & FTP)
│   ├── popup.css                  #   Dark glassmorphic UI + settings overlay + torrent tab
│   ├── popup.js                   #   Frontend logic, SSE, HLS, settings overlay, torrent
│   └── icons/                     #   Extension icons (16px, 48px, 128px)
│
├── extension-firefox/             # ── Firefox (Manifest V2) ──
│   ├── manifest.json              #   MV2 config: scripts[], browser_action, gecko ID
│   ├── background.js              #   Persistent background: browserAction shim, MV2 APIs
│   ├── content.js                 #   Same as Chrome (compatible)
│   ├── content.css                #   Same as Chrome (compatible)
│   ├── popup.html                 #   Same as Chrome (compatible)
│   ├── popup.css                  #   Same as Chrome (compatible)
│   ├── popup.js                   #   Chrome version + browserAction shim at top
│   └── icons/                     #   Same icons (compatible)
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health, tool status, `ytdlp_update` info |
| `GET` | `/info?url=<URL>` | Extract media metadata (title, thumbnail, formats) |
| `POST` | `/download` | Enqueue a `yt-dlp` + `aria2c` accelerated download |
| `POST` | `/aria2-download` | **NEW** — Direct `aria2c` download (torrent/FTP/HTTP) |
| `POST` | `/cancel/<task_id>` | Cancel active download, remove partial files |
| `GET` | `/progress-stream/<task_id>` | SSE live speed, percent, ETA stream |
| `GET` | `/history` | Paginated history with search & status filter |
| `DELETE` | `/history/<id>` | Delete a history entry |
| `POST` | `/history/clear` | Clear all history |
| `GET/POST` | `/settings` | Read or update user preferences |
| `GET` | `/app-version` | App version, dev status, repository metadata |
| `POST` | `/check-app-update` | Check GitHub for app updates |
| `POST` | `/apply-app-update` | Pull latest changes (git installs only) |
| `POST` | `/check-updates` | On-demand `yt-dlp -U` update |
| `POST` | `/shutdown` | Cleanly stop the backend server |
| `POST` | `/open-folder` | Open enclosing folder in OS file manager |
| `GET/POST` | `/pick-folder` | Native OS folder picker dialog |
| `GET` | `/clipboard` | Cross-platform clipboard read (Wayland/X11/macOS/Windows) |

---

## 🧪 Running Tests

```bash
./backend/venv/bin/pytest backend/tests/test_backend.py -v
```

15 tests covering: health endpoints, database operations, path-traversal security, task cancellation, settings persistence, server shutdown, app update checks, folder picker, and clipboard reading.

---

## 📋 Changelog

### v1.0.2 — Torrent/FTP, Firefox, Settings Overlay
**Released:** September 2026

#### ✨ New Features

- **🧲 Torrent & FTP Tab:** New 4th extension tab sends any link to `aria2c` directly:
  - `magnet:?xt=...` — BitTorrent magnet links (with `--seed-time=0` auto-set)
  - `https://...*.torrent` — `.torrent` metainfo file URLs
  - `ftp://` / `sftp://` — FTP server file downloads
  - `https://...` direct — any HTTPS file link (bypasses `yt-dlp`)
  - Auto-detects link type → shows color-coded badge (🧲 green / 📡 cyan / 🔗 amber)
  - Info card parses magnet `dn=` param to show torrent name & tracker count
  - Download queued → auto-switches to **Queue** tab with live SSE progress

- **⚙️ Settings Overlay Panel:** Settings moved from a navigation tab to a slide-down overlay triggered by the `⚙️` header icon:
  - **Eliminates popup-open lag** — server health check is now lazy (only runs when `⚙️` is clicked)
  - Server status indicator (Online/Offline dot) moved inside the settings panel
  - Close by clicking `✕`, clicking `⚙️` again, or clicking outside the panel
  - All settings preserved (concurrent downloads, threads, format, quality, folder)

- **🦊 Firefox Support:** New `extension-firefox/` folder with Manifest V2 for Firefox 109+:
  - `background.scripts: ["background.js"]` instead of `service_worker`
  - `browser_action` instead of `action`
  - `browser_specific_settings.gecko` with extension ID and `strict_min_version: "109.0"`
  - `webRequestBlocking` permission for MV2 compatibility
  - `chrome.action` → `chrome.browserAction` shim in `popup.js` and `background.js`
  - `moz-extension://` URL check added alongside `chrome-extension://`
  - Graceful degradation for `openPopup()` (not available in Firefox MV2)

- **`/aria2-download` Backend Endpoint:** New Flask route handles direct `aria2c` downloads:
  - 16 parallel connections, 1M min-split, `--no-conf` for clean operation
  - Torrent: `--seed-time=0` + `--bt-stop-timeout=10` (download only, no seeding)
  - Real-time aria2c progress parsed from output (`[#xxxx NNN/NNN(%%)]`)
  - Integrated with existing `task_id` / SSE progress system and SQLite history

#### 🔧 Improvements
- Extension header cleaned up: removed Online/Offline status dot (was causing UI lag)
- Tab bar: replaced **Settings** tab with **🧲 Torrent & FTP** tab
- `popup.js` `DOMContentLoaded`: health check is now fire-and-forget (`catch(() => {})`) instead of blocking `await`
- `popup.html`: settings panel uses `visibility: hidden` + `opacity` transition for smooth fade-in/out

---

### v1.0.1 — HLS/M3U8 Stream Support
**Released:** September 2026

#### ✨ New Features
- **HLS Stream Auto-Detection:** `background.js` intercepts `.m3u8` and `.ts` network requests from any website using `<all_urls>`.
- **Smart HLS URL Construction:** Captured `.ts` segment URLs automatically converted to master playlist URLs.
- **Per-Tab Stream Storage:** Detected streams stored per browser tab — prevents cross-tab pollution.
- **HLS Preview Card:** Dedicated "📡 HLS Stream" card in the popup with site hostname and pulsing green badge.
- **HLS Badge on Icon:** Extension icon shows green "HLS" badge when a stream is captured.

#### 🐛 Bug Fixes
- **Deep CDN Path Interception:** Fixed by switching from pattern-based URL matching to `<all_urls>` + JS filter.
- **HLS Filename Conflict:** Timestamp-based filenames (`HLS_Stream_20260923_181234.mp4`) prevent silent skips.
- **False HLS Wait Message:** "Play video first" instruction now only shown after a scan actually fails.
- **Tab Mismatch:** Fixed with per-tab storage and same-hostname validation.
- **`--no-overwrites`:** Added flag to prevent yt-dlp from silently skipping same-named files.

---

### v1.0.0 — Initial Release
**Released:** September 2026

- Multi-connection accelerated downloading via `aria2c` (up to 16 parallel connections).
- Chrome Extension with overlay badge detection for HTML5 video players.
- Real-time SSE progress streaming (speed, ETA, percentage).
- Self-updating `yt-dlp` engine with in-extension notifications.
- Persistent SQLite download history with search, filter, and pagination.
- Native OS folder picker and file explorer integration.
- Cross-platform launchers (Linux, macOS, Windows) with background mode.
- Browser TLS impersonation via `curl-cffi`.
- Settings persistence (directory, concurrency, format, quality).

---

## 📜 License

MIT License. Designed and developed for fast, seamless cross-platform media downloading.
