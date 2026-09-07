# ⚡ STU Media Downloader

A high-performance, cross-platform media downloader system combining a robust Python Flask backend (powered by `yt-dlp` and `aria2c` multi-connection acceleration) and a sleek Manifest V3 Chrome Extension frontend.

---

## 🌟 Key Features

- ⚡ **3x–5x Multi-Connection Boost:** Multi-segmented accelerated downloading via `aria2c` (up to 16 parallel connections per download).
- 🎬 **Smart Video Detection & Auto-Open:** Detects HTML5 video players on any website (YouTube, Vimeo, Twitter/X, TikTok, etc.) and injects an overlay **⚡ Download** badge. Clicking it automatically opens the extension popup and scans the media without manual toolbar clicks!
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

1. **Auto Detection:** Browse to any video (e.g., YouTube). Click the **⚡ Download** button that appears on the video player. The extension popup will open automatically with video details and formats loaded!
2. **Current Tab:** Click the extension icon and click **🌐 Current Tab** to capture and analyze the active tab's video.
3. **Manual Paste:** Paste any video URL into the input field and click **🔍 Scan Media** or press **Enter**.
4. **Choose Quality & Speed:** Select your desired format (MP4, MKV, MP3, WebM), resolution, and connections (4x, 8x, 16x), then click **🚀 Download Now**.
5. **Manage Queue & History:** Monitor live progress under the **Queue** tab, and browse or re-open downloaded files in the **History** tab.

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
├── app.py                         # Root entrypoint proxy (kept in sync with backend/app.py)
├── backend/
│   ├── app.py                     # Flask server, SQLAlchemy models, download engine & SSE
│   ├── requirements.txt           # Python dependencies (Flask, SQLAlchemy, yt-dlp, etc.)
│   ├── bin/                       # Self-healed binaries directory (.gitkeep)
│   ├── Downloads/                 # Default media output directory (.gitkeep)
│   └── tests/
│       └── test_backend.py        # Automated test suite (Pytest - 8 unit tests)
├── extension/
│   ├── manifest.json              # Chrome Extension Manifest V3 configuration
│   ├── background.js              # Background service worker (handles auto-opening popup)
│   ├── content.js                 # In-page video detection & overlay badge injection
│   ├── content.css                # Overlay badge & toast notification styling
│   ├── popup.html                 # Glassmorphic 4-tab popup UI (Media, Queue, History, Settings)
│   ├── popup.css                  # Modern dark mode styling & animations
│   ├── popup.js                   # Frontend client logic, SSE progress stream & update notifications
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
| `POST` | `/check-updates` | Checks for and triggers `yt-dlp -U` updates on demand |
| `POST` | `/open-folder` | Opens downloaded file's enclosing directory in OS file explorer |

---

## 🧪 Running Automated Tests

Run the complete test suite using `pytest`:

```bash
./backend/venv/bin/pytest backend/tests/test_backend.py -v
```

All 8 tests verify database operations, health endpoints, path traversal security, task cancellations, and settings persistence.

---

## 📜 License

MIT License. Designed and developed for fast, seamless cross-platform media downloading.
