# ⚡ STU Media Downloader

A high-performance, cross-platform media downloader system combining a robust Python Flask backend (powered by `yt-dlp` and `aria2c` multi-connection acceleration) and a sleek Manifest V3 Chrome Extension frontend.

---

## 🌟 Key Features

- ⚡ **3x–5x Multi-Connection Boost:** Multi-segmented accelerated downloading via `aria2c` (up to 16 parallel connections per download).
- 🎬 **Smart Video Detection & Auto-Open:** Detects HTML5 video players on any website (YouTube, Vimeo, Twitter/X, TikTok, etc.) and injects an overlay **⚡ Download** badge. Clicking it automatically opens the extension popup and scans the media without manual toolbar clicks!
- 📡 **HLS/M3U8 Stream Detection (NEW in v1.0.1):** Automatically intercepts `.m3u8` and `.ts` HLS streaming requests from any website (including deep CDN paths). Captured streams are auto-filled into the download input — no manual URL copying needed. Works for restricted streaming sites like vixeo.io, Lulustream, and similar platforms.
- 🎯 **Targeted Scanning:** Media is scanned only when you want it — via the overlay badge, pasting a URL, pressing Enter, or clicking **🌐 Current Tab**. No unwanted background auto-scanning on normal extension open.
- 🔄 **Self-Updating Core Engine (`yt-dlp -U`):** Automatically checks for and applies `yt-dlp` extractor updates every time the system starts.
- 🔔 **In-Extension Update Notifications:** Live alert banner and toasts notify you inside the extension when the core engine updates, plus a **🔄 Check Update** button in the Settings tab.
- 📡 **Real-time Live Progress (SSE):** Server-Sent Events stream live download speeds (`⚡ 18.5 MiB/s`), exact file sizes, completion percentage, and remaining ETA.
- 🛑 **Task Cancellation & Instant Cleanup:** Cancel running downloads anytime with immediate partial file removal (`.part`, `.ytdl`, `.aria2`).
- 🗄️ **Persistent SQLite History:** Full download records with search, status filters (Completed, Failed, Cancelled), and pagination (`~/.studownloader/history.db`).
- 📂 **Direct Folder Access:** One-click OS file manager explorer opening (`~/Downloads`) with built-in path-traversal security sandbox.
- 🖱️ **Double-Click Launchers:** Ready-to-use launch scripts and shortcuts for Linux, macOS, and Windows.

---

## 🚀 Quick Start

### 1. Launch the Backend Server

- **🐧 Linux:**
  - Standard Terminal: `./start_downloader.sh`
  - **Silent Background:** `./start_background.sh`
  - **Stop Server:** `./stop_downloader.sh`
- **🍎 macOS:**
  - Standard: Double-click `start_downloader.command`
  - **Stop Server:** Double-click `stop_downloader.command` (or `./stop_downloader.sh`)
- **🪟 Windows:**
  - Standard: Double-click `start_downloader.bat`
  - **Silent Invisible Background:** Double-click `start_hidden.vbs`
  - **Stop Server:** Double-click `stop_downloader.bat`
- **🧩 In Extension:** Click the **🛑 Stop Server** button under the Extension's **Settings (⚙️)** tab anytime!

### 2. Install the Chrome Extension

1. Open Google Chrome (or any Chromium browser like Brave, Edge).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `extension/` directory from this repository.
5. Pin the **STU Media Downloader** icon to your toolbar!

---

## 🧭 How to Use

### Standard Sites (YouTube, Vimeo, Twitter/X, etc.)
1. **Auto Detection:** Browse to any video. Click the **⚡ Download** badge that appears on the player. The extension opens automatically with media details loaded.
2. **Current Tab:** Click the extension icon → click **🌐 Current Tab** to scan the active tab.
3. **Manual Paste:** Paste any direct video URL and click **🔍 Scan Media** or press Enter.
4. **Choose Quality & Speed:** Select format (MP4, MKV, MP3, WebM), resolution, and connection count, then click **🚀 Start Download**.
5. **Monitor Progress:** Live progress appears under the **Queue** tab. Completed downloads are saved to **History**.

### HLS Streaming Sites (vixeo.io, Lulustream, etc.) — NEW in v1.0.1
These sites serve video via encrypted HLS streams (`.m3u8` / `.ts` segments) that cannot be directly extracted by `yt-dlp`. STU Downloader handles them automatically:

1. **Reload the page** after installing/updating the extension (ensures the network interceptor is active).
2. **Press ▶️ Play** on the video.
3. **Wait 2–3 seconds** for the extension to capture the stream in the background.
4. **Click the extension icon** — the M3U8 stream URL will be auto-filled and ready.
5. Click **📡 Download HLS Stream** to start downloading.

> **Note:** If the stream hasn't been captured yet, the extension shows step-by-step instructions automatically.

---

## 📁 Project Structure

```
STU_Media_Downloader/
├── start_downloader.sh            # Linux launcher script (with auto-update check)
├── start_background.sh            # Linux silent background launcher (runs without terminal)
├── stop_downloader.sh             # Linux server stop script
├── start_downloader.bat           # Windows batch launcher (with auto-update check)
├── start_hidden.vbs               # Windows 1-click invisible background launcher
├── stop_downloader.bat            # Windows server stop script
├── start_downloader.command       # macOS launcher script (with auto-update check)
├── stop_downloader.command        # macOS server stop script
├── STU-Media-Downloader.desktop   # Linux desktop application shortcut
├── backend/
│   ├── app.py                     # Flask server, SQLAlchemy models, download engine & SSE
│   ├── requirements.txt           # Python dependencies (Flask, SQLAlchemy, yt-dlp, etc.)
│   ├── bin/                       # Self-healed binaries directory (.gitkeep)
│   ├── Downloads/                 # Default media output directory (.gitkeep)
│   └── tests/
│       └── test_backend.py        # Automated test suite (Pytest - 15 unit tests)
├── extension/
│   ├── manifest.json              # Chrome Extension Manifest V3 configuration
│   ├── background.js              # Service worker: HLS stream interceptor + popup auto-open
│   ├── content.js                 # In-page video detection & overlay badge injection
│   ├── content.css                # Overlay badge & toast notification styling
│   ├── popup.html                 # Glassmorphic 4-tab popup UI (Media, Queue, History, Settings)
│   ├── popup.css                  # Modern dark mode styling & animations
│   ├── popup.js                   # Frontend logic, SSE stream, HLS detection & update notifications
│   └── icons/                     # Extension icons (16px, 48px, 128px)
└── README.md
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check, tool status, and `ytdlp_update` info |
| `GET` | `/info?url=<URL>` | Extracts media metadata (title, thumbnail, duration, resolutions) |
| `POST` | `/download` | Enqueues and starts a background accelerated download task |
| `POST` | `/cancel/<task_id>` | Cancels an active download and cleans up temporary partial files |
| `GET` | `/progress-stream/<task_id>` | Server-Sent Events (SSE) live speed, percent, and ETA stream |
| `GET` | `/history` | Paginated download history with search and status filtering |
| `DELETE` | `/history/<id>` | Deletes an entry from SQLite history |
| `POST` | `/history/clear` | Clears all history entries |
| `GET/POST` | `/settings` | Reads or updates user preferences (concurrency, format, quality) |
| `GET` | `/app-version` | Returns current application version, dev status, and repository metadata |
| `POST` | `/check-app-update` | Checks GitHub for app updates (bypassed in Development Mode) |
| `POST` | `/apply-app-update` | Pulls latest changes via git for git-cloned installations (production only) |
| `POST` | `/check-updates` | Checks for and triggers `yt-dlp -U` updates on demand |
| `POST` | `/shutdown` | Cleanly stops the backend server process and cleans up PID file |
| `POST` | `/open-folder` | Opens downloaded file's enclosing directory in OS file explorer |
| `GET/POST` | `/pick-folder` | Opens native OS folder selection dialog (Linux/macOS/Windows) and returns path |
| `GET` | `/clipboard` | Reads system clipboard cross-platform (Linux Wayland/X11, macOS, Windows) |

---

## 🧪 Running Automated Tests

Run the complete test suite using `pytest`:

```bash
./backend/venv/bin/pytest backend/tests/test_backend.py -v
```

All 15 tests verify database operations, health endpoints, path traversal security, task cancellations, settings persistence, server shutdown, app update checks, folder picker, and cross-platform clipboard reading.

---

## 📋 Changelog

### v1.0.1 — HLS/M3U8 Stream Support
**Released:** September 2026

#### ✨ New Features
- **HLS Stream Auto-Detection:** `background.js` now intercepts `.m3u8` and `.ts` network requests from any website using `<all_urls>` (replaces shallow URL pattern matching that missed deep CDN paths like `/secure/385/.../seg-1-v1-a1.ts?...`).
- **Smart HLS URL Construction:** Captured `.ts` segment URLs are automatically converted to master playlist URLs (`index-v1-a1.m3u8`) with query parameters preserved.
- **Per-Tab Stream Storage:** Detected streams are stored per browser tab (`streams_tab_<tabId>`) — prevents cross-tab stream pollution.
- **HLS Preview Card:** When an M3U8 stream is detected, the popup shows a dedicated **"📡 HLS Stream"** preview card with the site hostname and a pulsing green badge.
- **HLS Badge on Extension Icon:** Extension icon shows a green **"HLS"** badge when a stream is captured on the active tab.
- **Smart Fallback Flow:** Badge click on blob-URL (HLS) videos → checks captured streams first → falls back to `yt-dlp` page scan → shows step-by-step instructions only if scan also fails.

#### 🐛 Bug Fixes
- **Critical: Deep CDN Path Interception** — URL patterns like `*://*/*.ts*` only matched single-segment paths. Fixed by using `<all_urls>` with JavaScript filtering.
- **HLS Filename Conflict** — All HLS downloads saved as `HLS Stream.mp4`, causing yt-dlp to silently skip subsequent downloads. Fixed with timestamp-based filenames: `HLS_Stream_20260923_181234.mp4`.
- **False HLS Wait Message** — The "Play video first" instruction was shown for all blob-URL videos (including YouTube), even when `yt-dlp` could handle them. Now only shown after a scan actually fails.
- **Tab Mismatch** — Global `detectedM3u8` storage key could auto-fill a stream from a different tab. Fixed with per-tab storage lookup with same-hostname validation.
- **`new URL()` Crash** — `TypeError` when `currentPageReferer` was an empty string. Wrapped in `try/catch`.
- **`--no-overwrites` Safety** — Added flag to prevent yt-dlp from silently failing when a same-named file already exists.

#### 🔧 Improvements
- `content.js`: Blob-URL video badge clicks now tagged with `isHLSPage: true` so popup can route them correctly without attempting a doomed page-URL scan.
- `popup.js`: New `tryFallbackToHLSStreams()` helper — cleanly separates the HLS fallback logic from the scan error path.
- `popup.css`: Added `badge-success` (green, pulsing) and `badge-warn` (amber) badge variants for HLS stream status indicators.

---

### v1.0.0 — Initial Release
**Released:** September 2026

- Multi-connection accelerated downloading via `aria2c` (up to 16 parallel connections).
- Chrome Extension with overlay badge detection for HTML5 video players.
- Real-time SSE progress streaming (speed, ETA, percentage).
- Self-updating `yt-dlp` engine with in-extension notifications.
- Persistent SQLite download history with search, filter, and pagination.
- Native OS folder picker and file explorer integration.
- Cross-platform launchers (Linux, macOS, Windows) with background mode support.
- Browser TLS impersonation via `curl-cffi` (`--impersonate chrome`).
- Settings persistence (download directory, concurrency, format, quality).

---

## 📜 License

MIT License. Designed and developed for fast, seamless cross-platform media downloading.
