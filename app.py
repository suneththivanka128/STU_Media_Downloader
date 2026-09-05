"""
STU Media Downloader — Python Backend
======================================
Flask + SQLAlchemy + aria2c + yt-dlp + ffmpeg

Run (development):
    python backend/app.py

Run (production, recommended — threaded, PyInstaller-friendly):
    python backend/app.py --prod
"""

import os
import re
import sys
import json
import time
import shutil
import hashlib
import platform
import subprocess
import threading
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from threading import Lock, Semaphore

from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker


# ============================================================
# 1. CONFIG & PATHS
# ============================================================

def _get_default_downloads_dir() -> Path:
    system_os = platform.system()
    if system_os == "Windows":
        # Try Windows registry for redirected / OneDrive Downloads folder
        try:
            import winreg
            sub_key = r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, sub_key) as key:
                for guid in ("{374DE290-123F-4565-9164-39C4925E467B}", "{7D83EE9B-2244-4E70-B1F5-5393042AF1E4}", "Downloads"):
                    try:
                        val, _ = winreg.QueryValueEx(key, guid)
                        expanded = os.path.expandvars(str(val))
                        if os.path.exists(expanded):
                            return Path(expanded)
                    except (FileNotFoundError, OSError):
                        pass
        except Exception:
            pass

        userprofile = os.environ.get("USERPROFILE")
        if userprofile:
            p = Path(userprofile) / "Downloads"
            if p.exists():
                return p

    return Path.home() / "Downloads"


def _get_configured_dir(env_var: str, default_path: Path, fallback_local: Path) -> Path:
    custom = os.environ.get(env_var)
    target = Path(custom) if custom else default_path
    try:
        target.mkdir(parents=True, exist_ok=True)
        test_file = target / ".write_test"
        test_file.touch()
        test_file.unlink()
        return target
    except (OSError, PermissionError):
        fallback_local.mkdir(parents=True, exist_ok=True)
        return fallback_local


APP_DIR = _get_configured_dir(
    "STU_DOWNLOADER_DIR",
    Path.home() / ".studownloader" if (Path.home() / ".studownloader").exists() or not (Path.home() / ".smartdownloader").exists() else Path.home() / ".smartdownloader",
    Path(__file__).parent / ".studownloader"
)

DOWNLOADS_DIR = _get_configured_dir(
    "DOWNLOADS_DIR",
    _get_default_downloads_dir(),
    Path(__file__).parent / "Downloads"
)

DB_PATH = APP_DIR / "history.db"
SETTINGS_FILE = APP_DIR / "settings.json"

DEFAULT_SETTINGS = {
    "max_concurrent_downloads": 3,
    "default_connections": 16,
    "default_format": "mp4",
    "default_quality": "best",
    "download_dir": ""
}

def load_settings():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)

def save_settings_to_file(new_settings):
    current = load_settings()
    current.update(new_settings)
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print(f"[Settings Error] {e}", file=sys.stderr)
    return current

current_settings = load_settings()

# If custom download_dir was configured in settings, apply it
if current_settings.get("download_dir"):
    try:
        _custom_p = Path(current_settings["download_dir"]).expanduser().resolve()
        _custom_p.mkdir(parents=True, exist_ok=True)
        DOWNLOADS_DIR = _custom_p
    except Exception as _e:
        print(f"[Notice] Using default DOWNLOADS_DIR: {DOWNLOADS_DIR}", file=sys.stderr)

ytdlp_update_state = {
    "checked_at": None,
    "version": "unknown",
    "updated": False,
    "message": "Not checked yet",
    "has_notification": False,
    "status": "pending"
}

ALLOWED_ORIGIN = os.environ.get("EXTENSION_ORIGIN", "*")


# ============================================================
# 2. FLASK APP + CORS
# ============================================================

app = Flask(__name__)
if ALLOWED_ORIGIN == "*":
    CORS(app, resources={r"/*": {"origins": "*"}})
else:
    CORS(app, origins=[ALLOWED_ORIGIN])


# ============================================================
# 3. SQLALCHEMY SETUP
# ============================================================

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
    downloaded_at = Column(DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "source_url": self.source_url,
            "thumbnail_url": self.thumbnail_url,
            "file_path": self.file_path,
            "file_format": self.file_format,
            "quality": self.quality,
            "file_size_mb": self.file_size_mb,
            "status": self.status,
            "error_message": self.error_message,
            "downloaded_at": self.downloaded_at.strftime("%Y-%m-%d %H:%M:%S") if self.downloaded_at else None,
        }


def init_db():
    Base.metadata.create_all(engine)


def write_history_entry(title, source_url, thumbnail_url, file_path,
                         file_format, quality, file_size_mb,
                         status, error_message=None):
    session = SessionLocal()
    try:
        entry = DownloadHistory(
            title=title or "Unknown Media",
            source_url=source_url,
            thumbnail_url=thumbnail_url,
            file_path=file_path or "",
            file_format=file_format or "mp4",
            quality=quality or "best",
            file_size_mb=file_size_mb or 0.0,
            status=status,
            error_message=error_message,
            downloaded_at=datetime.now(),
        )
        session.add(entry)
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"[History DB Error] {e}", file=sys.stderr)
    finally:
        session.close()


# ============================================================
# 4. TOOL DETECTION (Self-Healing Engine)
# ============================================================

LOCAL_BIN_DIR = Path(__file__).parent / "bin"

TOOL_DOWNLOAD_URLS = {
    "yt-dlp": {
        "Windows": {"url": "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe", "archive_type": "raw", "sha256": None},
        "Darwin":  {"url": "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos", "archive_type": "raw", "sha256": None},
        "Linux":   {"url": "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp", "archive_type": "raw", "sha256": None},
    },
    "aria2c": {
        "Windows": {
            "url": "https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip",
            "archive_type": "zip",
            "inner_path": "aria2-1.37.0-win-64bit-build1/aria2c.exe",
            "sha256": None,
        },
    },
    "ffmpeg": {
        "Windows": {
            "url": "https://github.com/GyanD/codexffmpeg/releases/download/7.0.2/ffmpeg-7.0.2-essentials_build.zip",
            "archive_type": "zip",
            "inner_path": "ffmpeg-7.0.2-essentials_build/bin/ffmpeg.exe",
            "sha256": None,
        },
    },
}

_tool_path_cache = {}


def _sha256_of_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _verify_checksum(file_path, expected_sha256, label: str):
    if expected_sha256 is None:
        return
    actual = _sha256_of_file(file_path)
    if actual.lower() != expected_sha256.lower():
        if os.path.exists(file_path):
            os.remove(file_path)
        raise RuntimeError(
            f"Checksum mismatch for {label}! Expected {expected_sha256}, got {actual}."
        )


def get_tool_path(tool_name: str) -> str:
    if tool_name in _tool_path_cache:
        cached = _tool_path_cache[tool_name]
        if os.path.exists(cached):
            return cached

    venv_bin = Path(sys.executable).parent / (tool_name + (".exe" if platform.system() == "Windows" else ""))
    if venv_bin.exists():
        _tool_path_cache[tool_name] = str(venv_bin)
        return str(venv_bin)

    system_path = shutil.which(tool_name)
    if system_path:
        _tool_path_cache[tool_name] = system_path
        return system_path

    local_name = tool_name + (".exe" if platform.system() == "Windows" else "")
    local_path = LOCAL_BIN_DIR / local_name
    if local_path.exists():
        _tool_path_cache[tool_name] = str(local_path)
        return str(local_path)

    downloaded_path = _download_tool(tool_name)
    _tool_path_cache[tool_name] = downloaded_path
    return downloaded_path


def _download_tool(tool_name: str) -> str:
    import urllib.request
    import zipfile
    import tempfile

    LOCAL_BIN_DIR.mkdir(exist_ok=True)
    system_os = platform.system()
    config = TOOL_DOWNLOAD_URLS.get(tool_name, {}).get(system_os)
    if not config:
        raise RuntimeError(
            f"{tool_name} auto-download not configured for {system_os}. "
            f"Please ensure {tool_name} is installed and available in PATH."
        )

    url = config["url"]
    archive_type = config.get("archive_type", "raw")
    expected_sha256 = config.get("sha256")
    local_name = tool_name + (".exe" if system_os == "Windows" else "")
    dest = LOCAL_BIN_DIR / local_name

    print(f"[Self-Healing] Downloading missing tool: {tool_name} ...")

    if archive_type == "raw":
        tmp_path = str(dest) + ".download"
        urllib.request.urlretrieve(url, tmp_path)
        _verify_checksum(tmp_path, expected_sha256, tool_name)
        shutil.move(tmp_path, dest)
    elif archive_type == "zip":
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            urllib.request.urlretrieve(url, tmp.name)
            tmp_zip_path = tmp.name
        try:
            _verify_checksum(tmp_zip_path, expected_sha256, f"{tool_name} (archive)")
            with zipfile.ZipFile(tmp_zip_path) as zf:
                inner_path = config["inner_path"]
                with zf.open(inner_path) as src, open(dest, "wb") as out:
                    shutil.copyfileobj(src, out)
        finally:
            if os.path.exists(tmp_zip_path):
                os.remove(tmp_zip_path)
    else:
        raise RuntimeError(f"Unsupported archive_type '{archive_type}' for {tool_name}")

    if system_os != "Windows":
        os.chmod(dest, 0o755)
    return str(dest)


# ============================================================
# 5. CONCURRENT DOWNLOAD QUEUE & DYNAMIC CONCURRENCY
# ============================================================

MAX_WORKERS = 10
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

download_concurrency_lock = Lock()
download_semaphore = Semaphore(current_settings.get("max_concurrent_downloads", 3))

def update_concurrency_limit(new_limit: int):
    global download_semaphore
    with download_concurrency_lock:
        download_semaphore = Semaphore(max(1, min(10, new_limit)))

active_downloads = {}
active_downloads_lock = Lock()

active_processes = {}
active_processes_lock = Lock()

_queue_order = []
_queue_lock = Lock()

# Progress Regex patterns
YTDLP_PROGRESS_RE = re.compile(
    r"\[download\]\s+(?P<percent>\d+(\.\d+)?)%\s+of\s+~?(?P<size>[\d\.]+\s*\w+)?\s+at\s+(?P<speed>[\d\.]+\s*\w+/s).*?ETA\s+(?P<eta>[\d:]+)",
    re.IGNORECASE
)
ARIA2_PROGRESS_RE = re.compile(
    r"\[#\w+\s+(?P<size>[\d\.]+\w+/[\d\.]+\w+)\((?P<percent>\d+)%\)\s+CN:\d+\s+DL:(?P<speed>[\d\.]+\w+/s)(\s+ETA:(?P<eta>[\d\w:]+))?\]",
    re.IGNORECASE
)
GENERIC_PROGRESS_RE = re.compile(
    r"(?P<percent>\d+(\.\d+)?)%.*?at\s+(?P<speed>[\d\.]+\s*\w+/s).*?ETA\s+(?P<eta>[\d:]+)",
    re.IGNORECASE
)

PARTIAL_FILE_EXTENSIONS = (".part", ".ytdl", ".aria2", ".temp", ".tmp")


def _update_progress(task_id, **kwargs):
    with active_downloads_lock:
        active_downloads.setdefault(task_id, {})
        active_downloads[task_id].update(kwargs)


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


def _cleanup_partial_files(started_after: float):
    removed = []
    try:
        for entry in os.scandir(DOWNLOADS_DIR):
            if not entry.is_file():
                continue
            if not entry.name.endswith(PARTIAL_FILE_EXTENSIONS):
                continue
            try:
                if entry.stat().st_mtime >= started_after:
                    os.remove(entry.path)
                    removed.append(entry.name)
            except OSError:
                continue
    except Exception:
        pass
    if removed:
        print(f"[Cleanup] Removed {len(removed)} partial file(s): {removed}")


def run_download_task(task_id, url, output_format, quality, connections, custom_title=None, thumbnail_url=None):
    # Wait for concurrency slot
    acquired = download_semaphore.acquire(timeout=None)
    
    try:
        _dequeue(task_id)

        with active_downloads_lock:
            if active_downloads.get(task_id, {}).get("status") == "cancelled":
                return

        try:
            yt_dlp_path = get_tool_path("yt-dlp")
        except Exception as e:
            _update_progress(task_id, status="failed", error=f"yt-dlp not available: {e}")
            write_history_entry(
                title=custom_title or url, source_url=url, thumbnail_url=thumbnail_url,
                file_path="", file_format=output_format, quality=quality,
                file_size_mb=0, status="Failed", error_message=str(e),
            )
            return

        output_template = str(DOWNLOADS_DIR / "%(title).80s.%(ext)s")
        cmd = [
            yt_dlp_path, url,
            "-o", output_template,
            "--no-mtime",
            "--trim-filenames", "60",
            "--concurrent-fragments", str(connections),
        ]

        if output_format.lower() in ("mp3", "m4a", "wav", "flac", "aac", "opus"):
            cmd.extend(["-x", "--audio-format", output_format.lower()])
            if quality == "best":
                cmd.extend(["--audio-quality", "0"])
        else:
            clean_q = str(quality).strip().lower()
            if clean_q == "best" or not clean_q:
                cmd.extend(["-f", "bestvideo+bestaudio/best"])
            elif clean_q.endswith("p") and clean_q[:-1].isdigit():
                h = int(clean_q[:-1])
                cmd.extend(["-f", f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best"])
            elif clean_q.isdigit():
                h = int(clean_q)
                cmd.extend(["-f", f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best"])
            else:
                cmd.extend(["-f", f"bestvideo+{clean_q}/best[format_id={clean_q}]/{clean_q}/best"])

            if output_format and output_format.lower() != "auto":
                cmd.extend(["--merge-output-format", output_format.lower()])

        started_at = time.time()
        _update_progress(
            task_id,
            status="downloading",
            percent=0,
            speed="0 KiB/s",
            size="--",
            eta="--",
            title=custom_title or "Media File",
            thumbnail_url=thumbnail_url
        )

        final_title, final_path, final_size = custom_title or url, "", 0.0
        process = None
        error_output_lines = []

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                universal_newlines=True
            )

            with active_processes_lock:
                active_processes[task_id] = process

            for line in process.stdout:
                line_str = line.strip()

                if "ERROR:" in line_str or "error:" in line_str:
                    error_output_lines.append(line_str)

                match = YTDLP_PROGRESS_RE.search(line_str) or ARIA2_PROGRESS_RE.search(line_str) or GENERIC_PROGRESS_RE.search(line_str)
                if match:
                    groups = match.groupdict()
                    pct = float(groups.get("percent") or 0)
                    spd = groups.get("speed") or "0 KiB/s"
                    eta_val = groups.get("eta") or "--"
                    size_val = groups.get("size") or ""
                    _update_progress(task_id, percent=pct, speed=spd, eta=eta_val, size=size_val)

                if "Destination:" in line_str:
                    final_path = line_str.split("Destination:")[-1].strip()
                elif "[Merger] Merging formats into" in line_str:
                    parts = line_str.split('"')
                    if len(parts) >= 2:
                        final_path = parts[1]
                elif "has already been downloaded" in line_str:
                    parts = line_str.split("[download]")[-1].split("has already been downloaded")[0].strip()
                    if parts:
                        final_path = parts

            process.wait()

            with active_processes_lock:
                active_processes.pop(task_id, None)

            with active_downloads_lock:
                if active_downloads.get(task_id, {}).get("status") == "cancelled":
                    _cleanup_partial_files(started_after=started_at)
                    write_history_entry(
                        title=final_title, source_url=url, thumbnail_url=thumbnail_url,
                        file_path="", file_format=output_format, quality=quality,
                        file_size_mb=0, status="Cancelled", error_message="Cancelled by user"
                    )
                    return

            if process.returncode == 0:
                # If final_path was not captured from stdout or does not exist, scan DOWNLOADS_DIR for the newest file
                if not final_path or not os.path.exists(final_path):
                    newest_file = None
                    newest_mtime = started_at - 1
                    try:
                        for entry in os.scandir(DOWNLOADS_DIR):
                            if entry.is_file() and not entry.name.endswith(PARTIAL_FILE_EXTENSIONS):
                                try:
                                    st = entry.stat()
                                    if st.st_mtime >= newest_mtime:
                                        newest_mtime = st.st_mtime
                                        newest_file = entry.path
                                except OSError:
                                    pass
                    except Exception:
                        pass
                    if newest_file:
                        final_path = newest_file

                if final_path and os.path.exists(final_path):
                    final_size = round(os.path.getsize(final_path) / (1024 * 1024), 2)
                    final_title = Path(final_path).stem
                else:
                    final_path = str(DOWNLOADS_DIR)

                _update_progress(
                    task_id,
                    status="completed",
                    percent=100,
                    speed="Completed",
                    size=f"{final_size} MB",
                    eta="00:00",
                    title=final_title,
                    file_path=final_path
                )
                write_history_entry(
                    title=final_title, source_url=url, thumbnail_url=thumbnail_url,
                    file_path=final_path, file_format=output_format,
                    quality=quality, file_size_mb=final_size, status="Completed",
                )
            else:
                err_msg = " | ".join(error_output_lines[-2:]) if error_output_lines else f"Process exited with error code {process.returncode}"
                raise RuntimeError(err_msg)

        except Exception as e:
            with active_processes_lock:
                proc = active_processes.pop(task_id, None)
                if proc and proc.poll() is None:
                    try:
                        proc.terminate()
                        proc.wait(timeout=3)
                    except Exception:
                        proc.kill()

            _cleanup_partial_files(started_after=started_at)
            _update_progress(task_id, status="failed", error=str(e))
            write_history_entry(
                title=final_title, source_url=url, thumbnail_url=thumbnail_url,
                file_path="", file_format=output_format, quality=quality,
                file_size_mb=0, status="Failed", error_message=str(e),
            )
    finally:
        if acquired:
            download_semaphore.release()


# ============================================================
# 6. API ENDPOINTS
# ============================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "os": platform.system(),
        "tools": {
            "yt_dlp": bool(shutil.which("yt-dlp") or Path(sys.executable).parent.joinpath("yt-dlp").exists()),
            "aria2c": bool(shutil.which("aria2c")),
            "ffmpeg": bool(shutil.which("ffmpeg"))
        },
        "ytdlp_update": ytdlp_update_state
    })


@app.route("/check-updates", methods=["POST", "GET"])
def trigger_check_updates():
    state = check_and_update_ytdlp()
    return jsonify(state)


@app.route("/dismiss-update-notification", methods=["POST"])
def dismiss_update_notification():
    ytdlp_update_state["has_notification"] = False
    return jsonify({"success": True})


@app.route("/settings", methods=["GET", "POST"])
def settings_endpoint():
    global DOWNLOADS_DIR
    if request.method == "POST":
        data = request.get_json(force=True) or {}
        if "download_dir" in data:
            new_dir = str(data["download_dir"]).strip()
            if new_dir:
                try:
                    p = Path(new_dir).expanduser().resolve()
                    p.mkdir(parents=True, exist_ok=True)
                    DOWNLOADS_DIR = p
                    data["download_dir"] = str(DOWNLOADS_DIR)
                except Exception as e:
                    return jsonify({"error": f"Invalid download directory: {e}"}), 400
            else:
                DOWNLOADS_DIR = _get_configured_dir("DOWNLOADS_DIR", _get_default_downloads_dir(), Path(__file__).parent / "Downloads")
                data["download_dir"] = ""

        updated = save_settings_to_file(data)
        if "max_concurrent_downloads" in data:
            update_concurrency_limit(int(data["max_concurrent_downloads"]))
        return jsonify({"success": True, "settings": {**updated, "download_dir": str(DOWNLOADS_DIR)}})
    else:
        s = load_settings()
        s["download_dir"] = str(DOWNLOADS_DIR)
        return jsonify(s)


@app.route("/info", methods=["GET"])
def get_media_info():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "url parameter is required"}), 400

    try:
        yt_dlp_path = get_tool_path("yt-dlp")
        res = subprocess.run(
            [
                yt_dlp_path, url,
                "-J",
                "--no-playlist",
                "--no-warnings",
                "--ignore-errors",
                "--user-agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30
        )

        stdout = res.stdout.strip()
        stderr = res.stderr.strip()

        if res.returncode != 0 or not stdout:
            err_msg = stderr or "yt-dlp returned no output."
            short_err = "\n".join(
                line for line in err_msg.splitlines()
                if len(line) < 400
            )
            return jsonify({
                "error": "Failed to extract media information",
                "details": short_err
            }), 400

        try:
            data = json.loads(stdout)
        except json.JSONDecodeError as jde:
            return jsonify({
                "error": "Could not parse yt-dlp response",
                "details": str(jde),
                "raw": stdout[:300]
            }), 400

        title = data.get("title") or "Unknown Title"
        thumbnail = data.get("thumbnail") or ""
        duration = data.get("duration_string") or str(data.get("duration") or "")
        uploader = data.get("uploader") or data.get("channel") or ""
        view_count = data.get("view_count")
        formats = []
        raw_formats = data.get("formats") or []
        qualities_seen = set()

        for f in raw_formats:
            h = f.get("height")
            if h and h not in qualities_seen and f.get("vcodec", "none") != "none":
                qualities_seen.add(h)
                formats.append({
                    "format_id": f.get("format_id"),
                    "resolution": f"{h}p",
                    "ext": f.get("ext", "mp4"),
                    "height": h,
                    "fps": f.get("fps"),
                })
        formats.sort(key=lambda x: x["height"], reverse=True)

        if not formats and data.get("height"):
            formats = [{"format_id": "best", "resolution": f"{data['height']}p",
                        "ext": data.get("ext", "mp4"), "height": data["height"]}]

        return jsonify({
            "title": title,
            "thumbnail": thumbnail,
            "duration": duration,
            "uploader": uploader,
            "view_count": view_count,
            "formats": formats,
            "url": url
        })

    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Request timed out",
            "details": "yt-dlp took longer than 30 seconds. Try again or check the URL."
        }), 408
    except Exception as e:
        return jsonify({
            "error": "Unexpected server error",
            "details": str(e)
        }), 500


@app.route("/download", methods=["POST"])
def start_download():
    data = request.get_json(force=True)
    url = data.get("url")
    if not url:
        return jsonify({"error": "url is required"}), 400

    task_id = str(int(time.time() * 1000))
    output_format = data.get("format", "mp4")
    quality = data.get("quality", "best")
    connections = int(data.get("connections", 16))
    title = data.get("title")
    thumbnail_url = data.get("thumbnail_url")

    with active_downloads_lock:
        active_downloads[task_id] = {
            "task_id": task_id,
            "status": "queued",
            "percent": 0,
            "speed": "0 KiB/s",
            "size": "--",
            "eta": "--",
            "title": title or url,
            "thumbnail_url": thumbnail_url,
            "url": url
        }
    _enqueue(task_id)

    executor.submit(
        run_download_task, task_id, url, output_format, quality, connections, title, thumbnail_url
    )

    with active_downloads_lock:
        position = active_downloads[task_id].get("queue_position", 1)

    return jsonify({
        "task_id": task_id,
        "status": "queued",
        "queue_position": position
    })


@app.route("/cancel/<task_id>", methods=["POST"])
def cancel_download(task_id):
    with active_downloads_lock:
        if task_id in active_downloads:
            active_downloads[task_id]["status"] = "cancelled"

    _dequeue(task_id)

    with active_processes_lock:
        proc = active_processes.get(task_id)
        if proc and proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                proc.kill()

    return jsonify({"success": True, "message": f"Task {task_id} cancelled"})


@app.route("/progress-stream/<task_id>")
def progress_stream(task_id):
    def generate():
        with active_downloads_lock:
            current = active_downloads.get(task_id)
        if current:
            yield f"data: {json.dumps(current)}\n\n"

        while True:
            with active_downloads_lock:
                state = active_downloads.get(task_id)
            if not state:
                break
            yield f"data: {json.dumps(state)}\n\n"
            if state.get("status") in ("completed", "failed", "cancelled"):
                break
            time.sleep(0.5)

    return Response(generate(), mimetype="text/event-stream")


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
        if status_filter and status_filter.lower() != "all":
            query = query.filter(DownloadHistory.status.ilike(status_filter))

        total = query.count()
        rows = (
            query.order_by(DownloadHistory.downloaded_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return jsonify({
            "items": [r.to_dict() for r in rows],
            "total": total,
            "page": page,
            "limit": limit,
        })
    finally:
        session.close()


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


@app.route("/open-folder", methods=["POST"])
def open_folder():
    data = request.get_json(force=True) or {}
    file_path = data.get("file_path") or ""

    system_os = platform.system()
    downloads_real = os.path.realpath(str(DOWNLOADS_DIR))

    target_to_open = None

    if file_path:
        requested_real = os.path.realpath(file_path)
        # Case-insensitive path check for Windows to avoid drive letter casing mismatches
        is_safe = (
            requested_real.lower().startswith(downloads_real.lower())
            if system_os == "Windows"
            else requested_real.startswith(downloads_real)
        )
        if not is_safe:
            return jsonify({"error": "Access denied — path outside Downloads folder"}), 403

        if os.path.exists(requested_real):
            target_to_open = requested_real

    # Fallback: if specific file is not found or empty, open Downloads directory itself
    if not target_to_open:
        target_to_open = downloads_real

    if not os.path.exists(target_to_open):
        try:
            os.makedirs(target_to_open, exist_ok=True)
        except Exception:
            return jsonify({"error": "Downloads folder not found"}), 404

    try:
        if system_os == "Windows":
            norm_target = os.path.normpath(target_to_open)
            if os.path.isfile(norm_target):
                subprocess.run(["explorer", f"/select,{norm_target}"])
            else:
                subprocess.run(["explorer", norm_target])
        elif system_os == "Darwin":
            if os.path.isfile(target_to_open):
                subprocess.run(["open", "-R", target_to_open])
            else:
                subprocess.run(["open", target_to_open])
        else:
            folder_to_open = target_to_open if os.path.isdir(target_to_open) else os.path.dirname(target_to_open)
            subprocess.run(["xdg-open", folder_to_open])
        return jsonify({"success": True, "opened": str(target_to_open)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
# 7. ENTRYPOINT
# ============================================================

def check_and_update_ytdlp() -> dict:
    global ytdlp_update_state
    try:
        yt_dlp_path = get_tool_path("yt-dlp")
        
        # Get current version before update
        old_ver = "unknown"
        try:
            ver_proc = subprocess.run([yt_dlp_path, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
            if ver_proc.returncode == 0:
                old_ver = ver_proc.stdout.strip()
        except Exception:
            pass

        print(f"🔍 [Tool Check] Verifying yt-dlp installation & checking for updates (current: {old_ver})...")
        res = subprocess.run(
            [yt_dlp_path, "-U"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=15
        )
        out = (res.stdout or res.stderr).strip()
        last_line = out.splitlines()[-1] if out else "Checked."
        print(f"⚡ [Tool Check] yt-dlp: {last_line}")

        is_updated = "Updated yt-dlp" in out or "Updating to version" in out
        new_ver = old_ver
        if is_updated:
            try:
                ver_proc2 = subprocess.run([yt_dlp_path, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
                if ver_proc2.returncode == 0:
                    new_ver = ver_proc2.stdout.strip()
            except Exception:
                pass

        ytdlp_update_state.update({
            "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": new_ver,
            "old_version": old_ver,
            "updated": is_updated,
            "message": last_line,
            "has_notification": is_updated,
            "status": "updated" if is_updated else "up_to_date"
        })
        return ytdlp_update_state

    except subprocess.TimeoutExpired:
        print("⚠️ [Tool Check] yt-dlp update check timed out (continuing with current version)...")
        ytdlp_update_state.update({
            "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "message": "Update check timed out.",
            "status": "timeout"
        })
        return ytdlp_update_state
    except Exception as e:
        print(f"⚠️ [Tool Check] Could not check yt-dlp updates: {e}")
        ytdlp_update_state.update({
            "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "message": str(e),
            "status": "error"
        })
        return ytdlp_update_state


if __name__ == "__main__":
    init_db()
    check_and_update_ytdlp()

    if "--prod" in sys.argv:
        from waitress import serve
        print("⚡ [STU Media Downloader] Running in production mode via Waitress on http://127.0.0.1:5000")
        serve(app, host="127.0.0.1", port=5000, threads=8)
    else:
        print("⚡ [STU Media Downloader] Running in development mode on http://127.0.0.1:5000")
        app.run(host="127.0.0.1", port=5000, debug=True, threaded=True)
