import os
import sys
import json
import pytest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app, init_db, write_history_entry, SessionLocal, DownloadHistory, DOWNLOADS_DIR, APP_VERSION


@pytest.fixture(autouse=True)
def isolate_settings_file(tmp_path, monkeypatch):
    test_settings_file = tmp_path / "test_settings.json"
    monkeypatch.setattr("app.SETTINGS_FILE", test_settings_file)
    from app import _get_default_downloads_dir
    default_dir = _get_default_downloads_dir()
    monkeypatch.setattr("app.DOWNLOADS_DIR", default_dir)
    yield
    monkeypatch.setattr("app.DOWNLOADS_DIR", default_dir)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    init_db()
    with app.test_client() as client:
        yield client



def test_db_init_and_write():
    init_db()
    session = SessionLocal()
    try:
        write_history_entry(
            title="Test Video Title",
            source_url="https://example.com/test.mp4",
            thumbnail_url="https://example.com/thumb.jpg",
            file_path="/path/to/test.mp4",
            file_format="mp4",
            quality="1080p",
            file_size_mb=12.5,
            status="Completed"
        )
        entry = session.query(DownloadHistory).filter_by(source_url="https://example.com/test.mp4").first()
        assert entry is not None
        assert entry.title == "Test Video Title"
        assert entry.file_format == "mp4"
        assert entry.file_size_mb == 12.5
        assert entry.status == "Completed"
    finally:
        session.close()


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert "os" in data
    assert "tools" in data


def test_open_folder_security_path_traversal(client):
    # Test path outside ~/Downloads should be blocked with 403 Access Denied
    res = client.post("/open-folder", json={"file_path": "/etc/passwd"})
    assert res.status_code == 403
    data = res.get_json()
    assert "Access denied" in data["error"]

    res2 = client.post("/open-folder", json={"file_path": "../../shadow"})
    assert res2.status_code == 403


def test_download_endpoint_validation(client):
    # Empty payload
    res = client.post("/download", json={})
    assert res.status_code == 400

    # Valid payload should enqueue task
    res2 = client.post("/download", json={"url": "https://example.com/video.mp4", "quality": "best"})
    assert res2.status_code == 200
    data = res2.get_json()
    assert "task_id" in data
    assert data["status"] == "queued"
    assert "queue_position" in data


def test_history_endpoints(client):
    # Insert mock entries
    write_history_entry(
        title="Searchable Media A",
        source_url="https://example.com/a.mp4",
        thumbnail_url="",
        file_path="",
        file_format="mp4",
        quality="720p",
        file_size_mb=5.0,
        status="Completed"
    )
    write_history_entry(
        title="Failed Download B",
        source_url="https://example.com/b.mp4",
        thumbnail_url="",
        file_path="",
        file_format="mp3",
        quality="best",
        file_size_mb=0.0,
        status="Failed",
        error_message="Network Error"
    )

    # Test GET /history
    res = client.get("/history?page=1&limit=10")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    assert data["total"] >= 2

    # Test search query
    res_search = client.get("/history?q=Searchable")
    data_search = res_search.get_json()
    assert any("Searchable Media A" in item["title"] for item in data_search["items"])

    # Test status filter
    res_filter = client.get("/history?status=Failed")
    data_filter = res_filter.get_json()
    assert all(item["status"] == "Failed" for item in data_filter["items"])

    # Test delete entry
    if data["items"]:
        first_id = data["items"][0]["id"]
        res_del = client.delete(f"/history/{first_id}")
        assert res_del.status_code == 200
        assert res_del.get_json()["success"] is True


def test_cancel_task(client):
    res = client.post("/download", json={"url": "https://example.com/cancel_test.mp4"})
    assert res.status_code == 200
    task_id = res.get_json()["task_id"]

    res_cancel = client.post(f"/cancel/{task_id}")
    assert res_cancel.status_code == 200
    assert res_cancel.get_json()["success"] is True


def test_settings_endpoints(client, tmp_path):
    # GET settings
    res = client.get("/settings")
    assert res.status_code == 200
    data = res.get_json()
    assert "max_concurrent_downloads" in data
    assert "download_dir" in data

    # POST settings
    custom_dir = str(tmp_path / "CustomDownloads")
    res_post = client.post(
        "/settings",
        json={"max_concurrent_downloads": 4, "default_format": "mp3", "download_dir": custom_dir},
    )
    assert res_post.status_code == 200
    assert res_post.get_json()["success"] is True
    assert res_post.get_json()["settings"]["max_concurrent_downloads"] == 4
    assert res_post.get_json()["settings"]["download_dir"] == custom_dir


def test_update_endpoints(client):
    # GET health contains ytdlp_update
    res = client.get("/health")
    assert res.status_code == 200
    assert "ytdlp_update" in res.get_json()

    # POST dismiss-update-notification
    res_dismiss = client.post("/dismiss-update-notification")
    assert res_dismiss.status_code == 200
    assert res_dismiss.get_json()["success"] is True


def test_shutdown_endpoint(client):
    res = client.post("/shutdown", json={"force": True})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "shutting down" in data["message"].lower()


def test_app_version_and_health_endpoints(client):
    # GET /health
    res_health = client.get("/health")
    assert res_health.status_code == 200
    hdata = res_health.get_json()
    assert hdata["app_version"] == APP_VERSION
    assert "is_dev" in hdata
    assert "libtorrent" in hdata["tools"]

    # GET /app-version
    res_ver = client.get("/app-version")
    assert res_ver.status_code == 200
    vdata = res_ver.get_json()
    assert vdata["version"] == APP_VERSION
    assert vdata["name"] == "STU Media Downloader"
    assert "suneththivanka128" in vdata["repo"]
    assert "is_dev" in vdata


def test_check_app_update_dev_mode(client):
    app.config["IS_DEV_MODE"] = True
    try:
        res = client.post("/check-app-update")
        assert res.status_code == 200
        data = res.get_json()
        assert data["is_dev"] is True
        assert data["update_available"] is False
        assert "development mode" in data["message"].lower()

        # Applying update in dev mode must be blocked (HTTP 403)
        res_apply = client.post("/apply-app-update")
        assert res_apply.status_code == 403
    finally:
        app.config.pop("IS_DEV_MODE", None)


def test_check_app_update_prod_mode_mock(client, monkeypatch):
    app.config["IS_DEV_MODE"] = False
    try:
        class MockResponse:
            status_code = 200
            def json(self):
                return {
                    "tag_name": "v1.2.0",
                    "html_url": "https://github.com/suneththivanka128/STU_Media_Downloader/releases/v1.2.0",
                    "body": "Test release notes"
                }

        import requests
        monkeypatch.setattr(requests, "get", lambda *args, **kwargs: MockResponse())

        res = client.post("/check-app-update")
        assert res.status_code == 200
        data = res.get_json()
        assert data["is_dev"] is False
        assert data["update_available"] is True
        assert data["latest_version"] == "1.2.0"
        assert "release_url" in data
    finally:
        app.config.pop("IS_DEV_MODE", None)


def test_pick_folder_selected(client, monkeypatch, tmp_path):
    import subprocess
    from app import load_settings
    target_dir = str(tmp_path)

    class MockProcess:
        returncode = 0
        stdout = f"{target_dir}\n"
        stderr = ""

    monkeypatch.setattr(subprocess, "run", lambda *args, **kwargs: MockProcess())

    res = client.post("/pick-folder", json={"current_dir": str(tmp_path)})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["path"] == target_dir
    # Verify auto-persistence
    s = load_settings()
    assert s["download_dir"] == target_dir


def test_pick_folder_canceled(client, monkeypatch):
    import subprocess

    class MockProcess:
        returncode = 1
        stdout = ""
        stderr = ""

    monkeypatch.setattr(subprocess, "run", lambda *args, **kwargs: MockProcess())

    res = client.post("/pick-folder", json={})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is False
    assert data["canceled"] is True


def test_get_clipboard(client):
    res = client.get("/clipboard")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "text" in data


def test_torrent_download_routing(client, monkeypatch):
    # Mock run_libtorrent_task and run_aria2_task to verify routing
    called = []
    def mock_libtorrent(task_id, url, title, acquired_sem=False):
        called.append(("libtorrent", url))

    def mock_aria2(task_id, url, title, acquired_sem=False):
        called.append(("aria2", url))

    monkeypatch.setattr("app.run_libtorrent_task", mock_libtorrent)
    monkeypatch.setattr("app.run_aria2_task", mock_aria2)

    # Test Torrent link (Magnet)
    res1 = client.post("/aria2-download", json={"url": "magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=Ubuntu"})
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1["status"] == "queued"

    # Test HTTP direct link
    res2 = client.post("/aria2-download", json={"url": "https://example.com/file.zip"})
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["status"] == "queued"



def test_history_type_and_status_filters(client):
    write_history_entry(
        title="Ubuntu ISO Magnet",
        source_url="magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=Ubuntu",
        thumbnail_url="",
        file_path="/downloads/ubuntu.iso",
        file_format="torrent",
        quality="",
        file_size_mb=2500.0,
        status="Completed"
    )
    write_history_entry(
        title="FTP Server File",
        source_url="ftp://speedtest.tele2.net/1MB.zip",
        thumbnail_url="",
        file_path="/downloads/1MB.zip",
        file_format="ftp",
        quality="",
        file_size_mb=1.0,
        status="Completed"
    )
    write_history_entry(
        title="Sample Video MP4",
        source_url="https://example.com/movie.mp4",
        thumbnail_url="",
        file_path="/downloads/movie.mp4",
        file_format="mp4",
        quality="1080p",
        file_size_mb=150.0,
        status="Completed"
    )
    write_history_entry(
        title="Music Track MP3",
        source_url="https://example.com/song.mp3",
        thumbnail_url="",
        file_path="/downloads/song.mp3",
        file_format="mp3",
        quality="320k",
        file_size_mb=8.0,
        status="Completed"
    )

    # Filter torrent
    res = client.get("/history?status=torrent")
    items = res.get_json()["items"]
    assert any(i["title"] == "Ubuntu ISO Magnet" for i in items)

    # Filter ftp
    res = client.get("/history?status=ftp")
    items = res.get_json()["items"]
    assert any(i["title"] == "FTP Server File" for i in items)

    # Filter video
    res = client.get("/history?status=video")
    items = res.get_json()["items"]
    assert any(i["title"] == "Sample Video MP4" for i in items)

    # Filter audio
    res = client.get("/history?status=audio")
    items = res.get_json()["items"]
    assert any(i["title"] == "Music Track MP3" for i in items)





