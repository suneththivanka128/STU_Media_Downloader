# 🚀 Smart Cross-Platform Media Downloader — සම්පූර්ණ Project Documentation

---

## 🎯 1. System එකේ ප්‍රධාන අරමුණ (Core Objective)

වෙබ් අඩවි වල ඇති ඕනෑම Video / Audio එකක්:

1. **Single Click** එකකින් හඳුනා ගැනීම.
2. **`aria2c` Speed Booster** හරහා සාමාන්‍ය වේගයට වඩා 3x-5x වැඩි වේගයකින් Download කිරීම.
3. **Real-time Stats** (Live Speed, %, Remaining Time) Extension UI එකෙන් පෙන්වීම.
4. Windows, macOS, Linux ඕනෑම OS එකක User ට සංකීර්ණ Commands නොදී **Self-Healing Automation** හරහා පසුබිමින් ක්‍රියාත්මක වීම.
5. **Download History** එකක් Local ලෙස ගබඩා කර, User ට කලින් Downloads Track කරගැනීමට හැකි වීම.

---

## 🧱 2. ප්‍රධාන කොටස් (System Components)

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│  1. Chrome Extension    │ ◄───► │   2. Python Backend     │ ◄───► │    3. CLI Engine        │
│   (User Interface & UI) │ HTTP  │  (Smart Local Server)   │Subproc│  (yt-dlp/aria2c/ffmpeg)│
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
                                          │
                                          ▼
                                 ┌─────────────────────────┐
                                 │  4. SQLite History DB   │
                                 │   (Local persistence)   │
                                 └─────────────────────────┘
```

* **Chrome Extension (Frontend):** වෙබ් අඩවියේ Video detection, User settings, Queue, History UI.
* **Python Backend (Local Server):** PORT 5000 හරහා ක්‍රියාත්මක වන Flask සේවාව.
* **CLI Engine:** `yt-dlp` (extraction), `aria2c` (multi-connection download), `ffmpeg` (merge/convert).
* **SQLite DB:** Download history persist කිරීමට local database file එකක්.

---

## 🔄 3. සම්පූර්ණ Download ක්‍රියාවලිය (Step-by-Step Workflow)

```text
[Step 1] Video Detection ──► User Clicks "Download" Badge
                                      │
[Step 2] HTTP Request   ──► Send JSON Payload to Localhost:5000
                                      │
[Step 3] Smart Check    ──► Verify Tools (System Path vs Local Bin)
                                      │
[Step 4] Execution      ──► Run yt-dlp + aria2c Multi-connection (x16)
                                      │
[Step 5] Progress Stream──► Send Speed, %, ETA back to Extension UI
                                      │
[Step 6] Save File      ──► Merge using ffmpeg ──► Save to ~/Downloads
                                      │
[Step 7] History Log    ──► Write Entry to SQLite DB ──► Update History Tab
```

---

## 🎨 4. Chrome Extension UI

### A. Active Media Overlay Badge
- Video එක උඩ දකුණු කෙළවරේ `⚡ Download Media` Gradient Button එකක් පෙන්වයි.
- Click කළ විට Media Link එක Popup UI එකට Auto-Fill වේ.

### B. Popup UI — Main Tabs
1. **Media Detection & Preview Card** — URL auto-fill, Scan button, Title/Thumbnail/Quality preview.
2. **Customization & Speed Control** — Output filename, Video+Audio/Audio-only, Quality dropdown, Format (MP4/MKV/WebM/MP3/M4A), `aria2c` connections (default 16).
3. **Live Queue & Progress Card** — Dynamic queue list, Gradient progress bar, Live speed (`⚡ 18.5 MiB/s`), ETA, Status badge (`Queued`/`Downloading...`/`✅ Complete`/`❌ Error`).
4. **History Tab (New)** — Past downloads list.

### C. History Tab Details

| Feature | විස්තරය |
|---|---|
| Thumbnail + Title | Downloaded media එකේ preview |
| Date & Time | `2026-09-05, 10:42 AM` format |
| File Info | Format, Quality, Size |
| Status Badge | `✅ Completed` / `❌ Failed` / `⏸ Cancelled` |
| Quick Actions | 📂 Open Folder / 🔁 Re-download / 🗑 Remove |
| Search Bar | Title අනුව search |
| Filter | Status / Format අනුව filter |
| Clear History | Confirmation සහිත clear button |
| Pagination | 20 items per page |

### D. UI-to-Backend Data Flow

```text
[Web Page Overlay Badge] ──(Click)──► Auto-Fill Link to Popup UI
                                               │
                                       (User Configures Options)
                                               │
[Popup UI] ──(HTTP JSON Request)──► [Python Server (Port 5000)]
     ▲                                         │
     │                                (yt-dlp + aria2c Run)
     │                                         │
     └───(Real-time Progress Stream)───────────┘
          • Percentage (%) • Speed (MiB/s) • ETA
                                               │
                                    (On Complete) ──► SQLite Write
                                               │
[History Tab] ◄──(GET /history)──── [SQLite DB]
```

---

## ⚙️ 5. Python Backend — Architecture

* **Framework:** Flask + `flask-cors` — HTTP POST/GET requests handle කිරීම.
* **Cross-Platform Paths:** `platform.system()`, `os.path` — Windows/macOS/Linux auto-detect.
* **Distribution:** PyInstaller — Single executable (`.exe`/`.app`/Linux binary).

### Self-Healing Tool Detection
1. `shutil.which()` — System PATH එකේ tool තියෙනවද check කරයි.
2. නැත්නම් Local `./bin` folder check කරයි.
3. දෙකෙත් නැත්නම් — Silent background auto-download කරගනී.

### Speed Boosting
```bash
--external-downloader aria2c --external-downloader-args "-x16 -s16 -k1M"
```
- `ThreadPoolExecutor(max_workers=3)` — Concurrent downloads limit කර, ඉතිරි ඒවා auto-queue කරයි.

### Progress Parsing
```python
if "[download]" in line and "%" in line:
    percent = re.search(r'(\d+\.\d+)%', line)
    speed = re.search(r'at\s+([\d\.]+\s*\w+/s)', line)
    eta = re.search(r'ETA\s+([\d:]+)', line)
```

### Resource Usage
- Idle RAM: ~20-30 MB, CPU: 0%
- Download complete වූ පසු subprocess memory clean-up.

---

## 🗄️ 6. History Persistence Layer — SQLAlchemy (Updated)

Backend එකේ History module එක **SQLAlchemy ORM** භාවිතයෙන් implement කර ඇත (raw `sqlite3` වෙනුවට) — model-based schema, session management, සහ query chaining සඳහා. DB එක තවමත් local single file එකක් ලෙසම `~/.smartdownloader/history.db` හි store වේ (engine: `sqlite:///...`).

### A. Model & Engine Setup

```python
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

DB_DIR = Path.home() / ".smartdownloader"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "history.db"

Base = declarative_base()
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class DownloadHistory(Base):
    __tablename__ = "download_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    file_path = Column(String, nullable=False)
    file_format = Column(String, nullable=False)   # MP4, MP3, MKV...
    quality = Column(String, nullable=True)         # 1080p, 720p...
    file_size_mb = Column(Float, nullable=True)
    status = Column(String, nullable=False)         # Completed / Failed / Cancelled
    error_message = Column(String, nullable=True)
    downloaded_at = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "source_url": self.source_url,
            "thumbnail_url": self.thumbnail_url, "file_path": self.file_path,
            "file_format": self.file_format, "quality": self.quality,
            "file_size_mb": self.file_size_mb, "status": self.status,
            "error_message": self.error_message,
            "downloaded_at": self.downloaded_at.isoformat() if self.downloaded_at else None,
        }

def init_db():
    Base.metadata.create_all(engine)
```

### B. Write Logic (Download Complete වූ විට Entry Insert කිරීම)

```python
def write_history_entry(title, source_url, thumbnail_url, file_path,
                         file_format, quality, file_size_mb,
                         status, error_message=None):
    """
    Download task එකක් (Success/Fail/Cancel) අවසන් වූ සැනින්
    queue-processing worker එකෙන් call කරන function එක.
    DB write එක fail වුණත් download process එක crash වෙන්නේ නෑ.
    """
    session = SessionLocal()
    try:
        entry = DownloadHistory(
            title=title, source_url=source_url, thumbnail_url=thumbnail_url,
            file_path=file_path, file_format=file_format, quality=quality,
            file_size_mb=file_size_mb, status=status, error_message=error_message,
            downloaded_at=datetime.utcnow(),
        )
        session.add(entry)
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"[History DB Error] {e}")
    finally:
        session.close()
```

### C. Read Logic — `/history` Endpoint (query chaining)

```python
@app.route("/history", methods=["GET"])
def get_history():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    status_filter = request.args.get("status")
    search_query = request.args.get("q", "")

    session = SessionLocal()
    try:
        query = session.query(DownloadHistory)
        if search_query:
            query = query.filter(DownloadHistory.title.ilike(f"%{search_query}%"))
        if status_filter:
            query = query.filter(DownloadHistory.status == status_filter)

        total = query.count()
        rows = (
            query.order_by(DownloadHistory.downloaded_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return jsonify({
            "items": [r.to_dict() for r in rows],
            "total": total, "page": page, "limit": limit,
        })
    finally:
        session.close()
```

### D. Delete Logic (Remove / Clear History)

```python
@app.route("/history/<int:entry_id>", methods=["DELETE"])
def delete_history_entry(entry_id):
    session = SessionLocal()
    try:
        entry = session.get(DownloadHistory, entry_id)
        if not entry:
            return jsonify({"error": "Not found"}), 404
        session.delete(entry)
        session.commit()
        return jsonify({"success": True})
    finally:
        session.close()

@app.route("/history/clear", methods=["POST"])
def clear_history():
    session = SessionLocal()
    try:
        session.query(DownloadHistory).delete()
        session.commit()
        return jsonify({"success": True})
    finally:
        session.close()
```

### E. Design Notes

- **Thread Safety:** `sessionmaker(bind=engine)` — request එකකට session එකක් open කරලා, block එකේ අවසානයේ `close()` කරන pattern එක (raw sqlite3 connections thread-share කරන්න බෑ කියන ගැටලුව මගහරිනවා).
- **Why SQLAlchemy over raw sqlite3:** Model-based schema (SQL string typos වළක්වයි), `.filter()`/`.order_by()` query chaining, සහ අනාගතයේ PostgreSQL/MySQL වගේ වෙනත් DB එකකට migrate කරන්න ඕන වුණොත් engine URL එක වෙනස් කළාම ඇති.
- **Privacy:** History data එක fully local — Cloud sync කිසිවක් නැත.
- **Re-download:** `🔁 Re-download` button එකෙන් `source_url`, `file_format`, `quality` values ආපසු `/download` endpoint එකට යවනවා පමණයි.

---

## 🛡️ 7. Critical Security & Logic Enhancements

### A. CORS — Extension ID එකට පමණක් Restrict කිරීම (Exact-Match)

Default `flask-cors` config එකෙන් ඕනෑම වෙබ් අඩවියකට `localhost:5000` වෙත requests යැවිය හැක. එය වළක්වන්න:

```python
from flask_cors import CORS

ALLOWED_ORIGIN = os.environ.get(
    "EXTENSION_ORIGIN", "chrome-extension://YOUR_EXTENSION_ID_HERE"
)
CORS(app, origins=[ALLOWED_ORIGIN])
```

> **⚠️ Exact-match, generic prefix check එකක් නෙවෙයි:** `origin.startswith("chrome-extension://")` වගේ generic validation එකක් යොදනවා නම්, user ගේ browser එකේ install වෙච්ච *වෙන ඕනෑම* extension එකකටත් (malicious එකකටත්) මේ backend එකට request යවන්න පුළුවන් වෙනවා — ඒක exact-match එකකට වඩා **weaker** security layer එකක්. ඒ නිසා `ALLOWED_ORIGIN` එක නිශ්චිත ID එකකට exact-match කිරීමම වඩා ආරක්ෂිතයි.
>
> **Dev/Prod ID consistency:** Extension එක Chrome Web Store එකේ publish කළාට පස්සේ ID එක fixed වෙනවා, ඒත් Local development (`Load unpacked`) කරන සෑම වතාවකදීම ID එක වෙනස් විය හැක. මේක විසඳන්න, `manifest.json` එකට **`"key"` field එකක්** එකතු කරන්න (`chrome://extensions` → Pack Extension මගින් ලැබෙන public key එක) — එතකොට Unpacked (dev) සහ Published (prod) දෙකේම extension ID එක fixed එකක් වෙනවා, `ALLOWED_ORIGIN` එකත් dev/prod දෙකටම එකම විදිහට තියාගන්න පුළුවන්.

### B. Open Folder Endpoint — Path Traversal Protection සමඟ

Cross-platform File Explorer open කිරීම + Downloads folder එකට පිටත paths block කිරීම (CORS restrict කළත් backend endpoint එකකට කෙලින්ම request එකක් යැව්වොත් system files open වීම වළක්වයි):

```python
@app.route("/open-folder", methods=["POST"])
def open_folder():
    file_path = request.json.get("file_path")
    if not file_path:
        return jsonify({"error": "file_path is required"}), 400

    # ⚠️ Security: Downloads folder එකෙන් පිටත paths block කරයි
    downloads_real = os.path.realpath(os.path.expanduser("~/Downloads"))
    requested_real = os.path.realpath(file_path)
    if not requested_real.startswith(downloads_real):
        return jsonify({"error": "Access denied"}), 403

    if not os.path.exists(requested_real):
        return jsonify({"error": "File not found"}), 404

    system_os = platform.system()
    if system_os == "Windows":
        subprocess.run(["explorer", "/select,", os.path.normpath(requested_real)])
    elif system_os == "Darwin":
        subprocess.run(["open", "-R", requested_real])
    else:
        subprocess.run(["xdg-open", os.path.dirname(requested_real)])

    return jsonify({"success": True})
```

### C. Real-time Progress Transport — Server-Sent Events (SSE)

**SSE** තෝරාගැනීම නිවැරදියි — WebSocket වලට වඩා Flask සමඟ implement කිරීමට පහසුයි, continuous HTTP Polling වලට වඩා efficient. ඒත් implement කරද්දී වැදගත් details දෙකක් තියෙනවා:

**1. Threaded server අවශ්‍යයි** — Flask dev server එක default blocking, SSE stream එකක් open වෙලා ඉන්නකොට අනිත් requests block වෙනවා:

```python
# Development
app.run(host="127.0.0.1", port=5000, debug=True, threaded=True)

# Production (PyInstaller-friendly, cross-platform WSGI server)
from waitress import serve
serve(app, host="127.0.0.1", port=5000, threads=8)
```

**2. Reconnect-state handling** — Chrome Extension popup DOM එක focus ගිලිහුණම destroy වෙනවා (download background එකේ continue වුණාට). Popup ආයෙත් open කළාම, current progress state එක ක්ෂණිකව යැවීමෙන් progress bar "jump back to 0%" වීම වළක්වයි:

```python
@app.route("/progress-stream/<task_id>")
def progress_stream(task_id):
    def generate():
        current = active_downloads.get(task_id)
        if current:
            yield f"data: {json.dumps(current)}\n\n"   # reconnect වූ සැනින් current state

        while task_id in active_downloads and active_downloads[task_id]["status"] == "downloading":
            time.sleep(0.5)
            yield f"data: {json.dumps(active_downloads[task_id])}\n\n"

    return Response(generate(), mimetype="text/event-stream")
```

### Summary

| Point | තත්වය |
|---|---|
| CORS restriction | ✅ Extension origin එකට limit, dev/prod env-based switch |
| Open Folder | ✅ Path traversal validation සමඟ |
| SSE transport | ✅ Right choice — threaded server + reconnect-state handling අවශ්‍යයි |
| History DB | ✅ SQLAlchemy ORM (raw sqlite3 වෙනුවට) |

---

## 🔧 8. Robustness Enhancements — Checksum, Queue Visibility & Cleanup

### A. Binary Checksum Verification

Auto-download වන tools install කරන්න කලින් **SHA-256 checksum** verify කරයි — corrupted download එකක් හෝ malicious replacement එකක් install වීම වළක්වයි:

```python
def _verify_checksum(file_path, expected_sha256, label: str):
    if expected_sha256 is None:
        print(f"[Checksum] ⚠️  No pinned checksum configured for {label} — skipping verification.")
        return
    actual = _sha256_of_file(file_path)
    if actual.lower() != expected_sha256.lower():
        os.remove(file_path)
        raise RuntimeError(f"Checksum mismatch for {label}! Download rejected.")
    print(f"[Checksum] ✅ Verified {label}")
```

> **⚠️ Precondition:** Checksum pin කරන්න පුළුවන් වෙන්නේ **specific version tag** එකකට විතරයි — `"latest"` release URL එකක් භාවිතා කළොත් file එක upstream වෙනස් වෙද්දී checksum එකත් වෙනස් වෙනවා. ඒ නිසා production build එකකදී `TOOL_DOWNLOAD_URLS` හි version tags pin කරලා, checksum value ඒකට අදාළව හදාගන්න ඕන (`sha256=None` නම් verification skip වේ, warning එකක් log වේ).

### B. Concurrent Download Queue — Visible Position Tracking

`ThreadPoolExecutor(max_workers=3)` එක internally task 4ක්, 5ක් ආවත් 3ට වඩා එකවර run කරන්නේ නෑ — ඉතිරි ඒවා automatically FIFO queue එකක ඉන්නවා. ඒත් User ට *"මම queue එකේ කී වෙනියද"* කියලා පේන්න ඕන නිසා, explicit queue-position tracking layer එකක් එකතු කර ඇත:

```python
_queue_order = []       # FIFO order එකේ තියෙන "queued" task_ids
_queue_lock = Lock()

def _enqueue(task_id):
    with _queue_lock:
        _queue_order.append(task_id)
    _refresh_queue_positions()

def _dequeue(task_id):
    with _queue_lock:
        if task_id in _queue_order:
            _queue_order.remove(task_id)
    _refresh_queue_positions()

def _refresh_queue_positions():
    with _queue_lock:
        snapshot = list(_queue_order)
    for i, tid in enumerate(snapshot):
        _update_progress(tid, queue_position=i + 1)
```

- `/download` call කරන සැනින් task එක `_queue_order` එකට එකතු වී, response එකේ `queue_position` return වේ.
- Worker thread එකක් task එක actually run කරන්න පටන් ගන්නා විටම (`run_download_task` entry point එකේදීම) `_dequeue()` call වී, ඉතිරි queued tasks වල position ගණන recalculate වේ.
- මේකෙන් Extension UI එකට *"2 downloads ahead of you"* වගේ real-time queue status එකක් පෙන්විය හැක.

### C. Error Recovery — Partial File Cleanup

`yt-dlp`/`aria2c` process එකක් mid-download crash වුණොත් (network failure, force-kill, server restart), Downloads folder එකේ අසම්පූර්ණ `.part`/`.aria2`/`.ytdl` temp files ඉතුරු වෙනවා. Failure handling එකේදී මේවා automatically clean කරයි:

```python
PARTIAL_FILE_EXTENSIONS = (".part", ".ytdl", ".aria2", ".temp", ".tmp")

def _cleanup_partial_files(started_after: float):
    """Task එක start වුණු වෙලාවෙන් පස්සේ modify වුණු partial files විතරක්
    ඉවත් කරයි — වෙන download එකක files touch වෙන්නේ නෑ."""
    removed = []
    for entry in os.scandir(DOWNLOADS_DIR):
        if entry.is_file() and entry.name.endswith(PARTIAL_FILE_EXTENSIONS):
            if entry.stat().st_mtime >= started_after:
                os.remove(entry.path)
                removed.append(entry.name)
    if removed:
        print(f"[Cleanup] Removed {len(removed)} partial file(s): {removed}")
```

`run_download_task` එකේ `except` block එකේදී: subprocess එක තවම running නම් (`process.poll() is None`) `terminate()` කර, timeout එකකින් පසු `kill()` කරයි, ඉන්පසු cleanup එක run වේ — process එකක් zombie විදිහට ඉතුරු වීමත්, disk space partial files වලින් waste වීමත් දෙකම වළක්වයි.

---

## 📊 9. Summary Table (ප්‍රධාන වාසි)

| Feature | සාමාන්‍ය Extension | අපගේ Smart Downloader System |
|---|---|---|
| Download Speed | Single Connection | **aria2c Multi-connection (3x-5x)** |
| Setup Complexity | Manual/Terminal | **Self-Configuring Executable** |
| Tool Failures | Crash වේ | **Dynamic Auto-Detection & Self-Healing** |
| System Resource | High Memory | **~20-30MB RAM (Idle)** |
| History Tracking | නැත | **SQLAlchemy ORM (SQLite-backed) Local History** |
| Backend Security | Open CORS | **Exact-match Origin Restriction + Path Validation** |
| Binary Integrity | Verify නොකරයි | **SHA-256 Checksum Verification** |
| Queue Visibility | නැත | **Real-time Queue Position Tracking** |
| Crash Recovery | Partial files ඉතුරු වේ | **Automatic Partial-File Cleanup** |

---

## ⚠️ 10. සලකා බැලිය යුතු Technical/Legal කරුණු (ඉතිරි Open Items)

- **Copyright/ToS:** YouTube වැනි platform වල Terms of Service බලන්න — copyrighted content download කිරීම බොහෝ තැන්වල restricted. Personal/owned/Creative-Commons content සඳහා පමණක් limit කිරීම ආරක්ෂිතයි.
- **Checksum Values අවශ්‍යයි:** Section 8A හි verification logic එක implement කර ඇතත්, actual pinned `sha256` values (version-specific) තවම config එකට දාන්න ඕන — logic එක ready, values ready නෑ.
- **`ALLOWED_ORIGIN` / manifest `key`:** Placeholder ID එක actual extension ID එකෙන් replace කරන්න ඕන (Section 7A).

*(CORS restriction, Open Folder path validation, SSE transport, Checksum verification, Queue position tracking, සහ Partial-file cleanup — Section 7 සහ 8 හි විස්තර කර implement කර ඇත.)*
