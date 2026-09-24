# 🚀 STU Media Downloader — Future Major Updates Roadmap

This document outlines the architecture, implementation plans, backend endpoints, and UI/UX design specifications for future major releases of **STU Media Downloader** (from **v1.2.0** to **v2.0.0**).

---

## 📌 Executive Summary

| Version | Codename / Focus | Key Features | Target Release |
|---|---|---|---|
| **v1.2.0** | **Batch & Playlist Engine** | Multi-video playlist extraction, Checkbox selector, Text/M3U batch import | Q4 2026 |
| **v1.3.0** | **Embedded Preview & Subtitles** | In-app HLS.js player, `.vtt`/`.srt` subtitle downloader, MP3 320kbps audio extractor | Q1 2027 |
| **v1.4.0** | **Bandwidth & Night Scheduler** | Global speed limiter, Off-peak midnight scheduler, Auto-pause on low storage | Q2 2027 |
| **v1.5.0** | **Telegram Bot & Cloud Sync** | Mobile Telegram completion alerts, Google Drive / Cloud auto-upload | Q3 2027 |
| **v2.0.0** | **AI Subtitles & Social Extractors** | Local Whisper AI subtitle generator, TikTok (No Watermark), IG Reels, FB HD | Q4 2027 |

---

## 📑 1. Version 1.2.0 — Batch & Playlist Download Engine

### 💡 Overview & Purpose
Allows users to download entire YouTube playlists, channel video series, or custom lists of URLs simultaneously without pasting links one by one.

### 🌟 Features & User Experience
1. **Playlist Parsing & Checkbox Selector**:
   - Pasting a YouTube Playlist URL (or channel URL) scans all video items in under 3 seconds.
   - Shows a clean checklist modal with thumbnail, duration, video title, and quality options for each track.
   - User can click **"Select All"**, **"Deselect All"**, or pick specific episodes.
2. **Text & M3U File Import**:
   - Import `.txt`, `.m3u`, or `.m3u8` link lists via drag-and-drop or file picker.
3. **Batch Queue Management**:
   - Groups batch items under a single collapsible **Batch Container Card** in the Queue tab.

### 🏗️ Technical Architecture & Implementation Plan

#### Backend Changes (`backend/app.py`)
- **New Endpoint**: `POST /playlist-info`
  - Uses `yt-dlp --flat-playlist -J` to extract playlist items fast without loading full media streams.
- **New Endpoint**: `POST /batch-download`
  - Accepts an array of URLs `[{ url, title, format, quality }, ...]` and enqueues them cleanly into `_queue_order` with dynamic concurrency control.

```python
# API Specification: POST /playlist-info
# Request Body: { "url": "https://www.youtube.com/playlist?list=PL..." }
# Response JSON:
{
  "playlist_title": "Tutorial Series",
  "total_items": 12,
  "items": [
    { "id": "1", "title": "Episode 1", "url": "...", "duration": "10:15", "thumbnail": "..." },
    ...
  ]
}
```

#### Extension Changes (`extension/popup.js`, `popup.html`, `popup.css`)
- Add **"📋 Batch Import"** button next to manual URL scan.
- Add `batchModal` component in `popup.html` with select all / deselect all checkboxes.

---

## 📑 2. Version 1.3.0 — Embedded Video Preview & Subtitle Downloader

### 💡 Overview & Purpose
Allows users to watch video previews directly inside the extension popup or standalone dashboard tab without needing external players, plus download multi-language subtitles (`.vtt`, `.srt`).

### 🌟 Features & User Experience
1. **In-App HLS.js & HTML5 Video Player**:
   - Click a **👁️ Preview** button on any captured stream or history item to open an embedded video modal.
   - Allows watching incomplete or finished downloads directly inside the browser extension.
2. **Subtitle Extraction & Embedder**:
   - Auto-detect available subtitles (English, Sinhala, Spanish, etc.).
   - Choose to download standalone `.vtt` / `.srt` subtitle files or hardcode/soft-embed them into `.mp4` / `.mkv`.
3. **High-Quality Audio Extractor**:
   - One-click preset for 320kbps MP3, FLAC, WAV, and AAC extraction with cover art metadata injection.

### 🏗️ Technical Architecture & Implementation Plan

#### Backend Changes (`backend/app.py`)
- **New Endpoint**: `GET /stream-preview/<task_id>`
  - Serves Range requests (`bytes=...`) from `DOWNLOADS_DIR` for progressive video streaming.
- **New Endpoint**: `GET /subtitles?url=<URL>`
  - Queries available subtitle tracks using `yt-dlp --list-subs -J`.
- Pass `--embed-subs` and `--sub-langs "en,si,all"` to `yt-dlp` execution flags when requested.

#### Extension Changes (`extension/popup.js`, `popup.html`)
- Integrate `hls.min.js` inside `extension/lib/` for client-side HLS video rendering.
- Add Subtitle Language selector dropdown in options grid.

---

## 📑 3. Version 1.4.0 — Bandwidth Limiter & Off-Peak Night Scheduler

### 💡 Overview & Purpose
Prevents STU Downloader from consuming all home Wi-Fi bandwidth during the day, and allows scheduling downloads to run during off-peak night data hours (e.g. 12:00 AM – 8:00 AM).

### 🌟 Features & User Experience
1. **Global & Per-Task Speed Limiter**:
   - A speed limit slider in Settings (e.g., 500 KB/s, 2 MB/s, 5 MB/s, Unlimited).
   - Dynamic adjustment while downloads are actively running without needing to restart.
2. **Off-Peak Night Scheduler**:
   - Set a start time (e.g., `00:00`) and stop time (e.g., `08:00`).
   - Downloads added to the queue during daytime automatically pause and start at midnight.
3. **Low Storage & System Guard**:
   - Auto-pauses downloads if available disk space drops below 2 GB to prevent OS crashes.

### 🏗️ Technical Architecture & Implementation Plan

#### Backend Changes (`backend/app.py`)
- Update `yt-dlp` invocation to include `--rate-limit <speed>`.
- Update `aria2c` invocation to include `--max-overall-download-limit=<speed>`.
- Implement background `SchedulerThread` checking `datetime.now()` against configured start/stop windows.

```python
# Scheduler Configuration Model
DEFAULT_SCHEDULER_CONFIG = {
    "enabled": False,
    "start_time": "00:00",
    "stop_time": "08:00",
    "max_speed_kbps": 0  # 0 = Unlimited
}
```

---

## 📑 4. Version 1.5.0 — Telegram Bot & Cloud Auto-Sync

### 💡 Overview & Purpose
Get instant mobile notifications on your phone via Telegram when long downloads (e.g., 20 GB torrents) complete, and automatically sync finished media to Google Drive or Cloud storage.

### 🌟 Features & User Experience
1. **Telegram Bot Notifications**:
   - Receive a mobile message: *"✅ STU Downloader: Ubuntu-22.04.iso (2.5 GB) completed in 3m 45s!"*
   - Includes download speed, file size, and direct file path details.
2. **Google Drive / Rclone Cloud Auto-Sync**:
   - Auto-upload completed files to a configured Google Drive folder or remote storage.

### 🏗️ Technical Architecture & Implementation Plan

#### Backend Changes (`backend/app.py`)
- **New Endpoint**: `POST /telegram/test`
  - Sends a test ping to Telegram Bot API (`https://api.telegram.org/bot<TOKEN>/sendMessage`).
- **Post-Download Hook**:
  - Upon task completion, call `send_telegram_notification(task_info)` in a non-blocking daemon thread.

---

## 📑 5. Version 2.0.0 — AI Subtitle Generator (Whisper AI) & Social Media Extractors

### 💡 Overview & Purpose
Generates local AI subtitles for any video/audio stream that lacks subtitles (using OpenAI Whisper), and provides 1-click watermark-free downloads for TikTok, Instagram Reels, Facebook HD, and X (Twitter).

### 🌟 Features & User Experience
1. **Local AI Subtitle Generator (Whisper AI)**:
   - One-click **"🤖 Generate AI Subtitles"** button for any downloaded file.
   - Generates accurate `.vtt` / `.srt` subtitles locally in Sinhala, English, and 50+ languages.
2. **Watermark-Free Social Media Extractor**:
   - Custom extractor rules for TikTok (No Watermark), Instagram Reels, Facebook HD, and X (Twitter).
3. **Native Desktop Application Wrapper**:
   - Packaged with PyInstaller + Tauri/Electron into a standalone `.exe` / `.AppImage` / `.dmg` installer containing both backend and UI in a single desktop app.

---

## 🛠️ Summary Checklist for Developers

- [ ] **v1.2.0**: Implement `POST /playlist-info` & `POST /batch-download` in `backend/app.py`
- [ ] **v1.3.0**: Integrate `hls.min.js` and Range streaming in `backend/app.py`
- [ ] **v1.4.0**: Implement `SchedulerThread` and rate-limit flags in `yt-dlp` & `aria2c`
- [ ] **v1.5.0**: Implement Telegram Bot API webhook notification triggers
- [ ] **v2.0.0**: Integrate `faster-whisper` Python package for local AI subtitle generation

---
*Created and maintained by STU Media Downloader Core Development Team.*
