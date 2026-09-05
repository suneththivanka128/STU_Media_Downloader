# ⚡ STU Media Downloader

A high-performance media downloader system combining a Python Flask backend (powered by `yt-dlp` and `aria2c` multi-connection acceleration) and a sleek Manifest V3 Chrome Extension frontend.

---

## 🌟 Key Features

- ⚡ **3x–5x Speed Boosting:** Multi-connection chunked downloading via `aria2c` (up to 16 simultaneous threads).
- 🎬 **Smart Video Detection:** Automatic video player detection with in-page floating `⚡ Download Media` overlay badge.
- 🔍 **Metadata Scanner:** Instant URL inspection for video title, thumbnail preview, durations, and available format/quality streams.
- 📡 **Real-time Live Progress (SSE):** Server-Sent Events stream live download speed (`⚡ 18.5 MiB/s`), completion percentage, and remaining ETA.
- 🗄️ **Local SQLite History:** Persistent download records using SQLAlchemy ORM (`~/.studownloader/history.db`) with search, filter, and pagination.
- 📂 **Quick Folder Access:** One-click OS file manager explorer opening (`~/Downloads`) with built-in path-traversal security sandbox.
- 🛡️ **Self-Healing Engine:** Auto-checks system tools (`yt-dlp`, `aria2c`, `ffmpeg`) with fallback detection and automatic partial file cleanup on cancel/crash.
- 🖱️ **One-Click / Double-Click Launcher:** Run effortlessly via desktop shortcut or double-click script across macOS, Linux, and Windows!

---

## 🚀 Quick Start (Double-Click Launch)

- **🍎 On macOS:** Double-click `start_downloader.command`
- **🐧 On Linux:** Double-click `STU-Media-Downloader.desktop` or `start_downloader.sh`
- **🪟 On Windows:** Double-click `start_downloader.bat`
- **💻 On Terminal:**
  ```bash
  source backend/venv/bin/activate
  python backend/app.py
  ```

---

## 📁 Project Structure

```
STU_Media_Downloader/
├── start_downloader.command       # macOS Double-Click Launcher (.command)
├── start_downloader.sh            # Linux Shell Launcher
├── STU-Media-Downloader.desktop   # Linux Desktop Shortcut
├── start_downloader.bat           # Windows Batch Launcher
├── backend/
│   ├── app.py                     # Flask server, SQLAlchemy models, download engine & SSE
│   ├── requirements.txt           # Python dependencies
│   ├── bin/                       # Self-healed binaries directory
│   ├── venv/                      # Virtual environment
│   └── tests/
│       └── test_backend.py        # Automated test suite (Pytest)
├── extension/
│   ├── manifest.json              # Chrome Manifest V3 configuration
│   ├── content.js                 # In-page video detection & overlay badge injection
│   ├── content.css                # Overlay badge & toast styling
│   ├── popup.html                 # Modern glassmorphic popup UI
│   ├── popup.css                  # Dark mode styles & responsive animations
│   ├── popup.js                   # Extension frontend logic & SSE client
│   └── icons/                     # Generated extension icons (16px, 48px, 128px)
├── Dev_Doc/                       # Reference documentation & design files
└── README.md
```

---

## 🔌 Chrome Extension Setup

1. Open Google Chrome (or Brave, Edge).
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `extension/` folder.
5. Pin the extension and start downloading!
