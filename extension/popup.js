// STU Media Downloader — Popup Logic & Backend Integration
const API_BASE = "http://127.0.0.1:5000";

let isBackendOnline = false;
let currentTaskId = null;
let activeEventSource = null;
let historyCurrentPage = 1;
let scannedMediaData = null;

// DOM Elements
const serverStatus = document.getElementById("serverStatus");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const serverAlert = document.getElementById("serverAlert");
const btnRetryServer = document.getElementById("btnRetryServer");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");
const queueBadge = document.getElementById("queueBadge");

const mediaUrlInput = document.getElementById("mediaUrl");
const btnPaste = document.getElementById("btnPaste");
const btnScanMedia = document.getElementById("btnScanMedia");
const btnUseActiveTab = document.getElementById("btnUseActiveTab");
const scanSpinner = document.getElementById("scanSpinner");
const scanBtnText = document.getElementById("scanBtnText");

const previewCard = document.getElementById("previewCard");
const previewThumb = document.getElementById("previewThumb");
const previewTitle = document.getElementById("previewTitle");
const previewDuration = document.getElementById("previewDuration");

const formatSelect = document.getElementById("formatSelect");
const qualitySelect = document.getElementById("qualitySelect");
const connectionsSlider = document.getElementById("connectionsSlider");
const speedBadge = document.getElementById("speedBadge");
const btnStartDownload = document.getElementById("btnStartDownload");

const queueList = document.getElementById("queueList");
const emptyQueue = document.getElementById("emptyQueue");

const historySearch = document.getElementById("historySearch");
const historyFilter = document.getElementById("historyFilter");
const historyCount = document.getElementById("historyCount");
const historyList = document.getElementById("historyList");
const btnClearHistory = document.getElementById("btnClearHistory");
const btnPrevPage = document.getElementById("btnPrevPage");
const btnNextPage = document.getElementById("btnNextPage");
const pageInfo = document.getElementById("pageInfo");
const popupToast = document.getElementById("popupToast");

// Update Notification Elements
const updateBanner = document.getElementById("updateBanner");
const updateBannerTitle = document.getElementById("updateBannerTitle");
const updateBannerDesc = document.getElementById("updateBannerDesc");
const btnDismissUpdate = document.getElementById("btnDismissUpdate");
const settingEngineStatus = document.getElementById("settingEngineStatus");
const btnCheckEngineUpdate = document.getElementById("btnCheckEngineUpdate");
const engineUpdateIcon = document.getElementById("engineUpdateIcon");
const engineUpdateText = document.getElementById("engineUpdateText");
const settingAppStatus = document.getElementById("settingAppStatus");
const btnCheckAppUpdate = document.getElementById("btnCheckAppUpdate");
const appUpdateIcon = document.getElementById("appUpdateIcon");
const appUpdateText = document.getElementById("appUpdateText");

let currentAppVersion = "1.0.0";
let isDevEnvironment = false;

// Settings Elements
const settingConcurrent = document.getElementById("settingConcurrent");
const settingConnections = document.getElementById("settingConnections");
const settingFormat = document.getElementById("settingFormat");
const settingQuality = document.getElementById("settingQuality");
const settingDownloadDir = document.getElementById("settingDownloadDir");
const settingDownloadDirText = document.getElementById("settingDownloadDirText");
const settingCustomDirDisplay = document.getElementById("settingCustomDirDisplay");
const btnBrowseFolder = document.getElementById("btnBrowseFolder");
const btnResetFolder = document.getElementById("btnResetFolder");
const btnOpenDownloadsFolder = document.getElementById("btnOpenDownloadsFolder");
const settingServerStatus = document.getElementById("settingServerStatus");
const btnShutdownServer = document.getElementById("btnShutdownServer");
const btnSaveSettings = document.getElementById("btnSaveSettings");

// ============================================================
// 1. INITIALIZATION & SERVER STATUS
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupEventListeners();
  await checkServerHealth();
  await loadAndApplySettings();
  await initializeMediaInput();
  await restoreActiveQueue();
});

async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET", signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      isBackendOnline = true;
      statusDot.className = "status-dot online";
      statusText.textContent = "Online";
      serverAlert.classList.add("hidden");

      if (data.ytdlp_update) {
        handleYtdlpUpdateNotice(data.ytdlp_update);
      }
      if (data.app_version) {
        currentAppVersion = data.app_version;
        isDevEnvironment = Boolean(data.is_dev);
        handleAppVersionNotice(data.app_version, data.is_dev);
      }
      if (settingServerStatus) settingServerStatus.textContent = "Server active on port 5000";
      if (btnShutdownServer) btnShutdownServer.disabled = false;
      if (btnCheckAppUpdate) btnCheckAppUpdate.disabled = false;
      return true;
    }
  } catch (err) {
    // Offline
  }
  isBackendOnline = false;
  statusDot.className = "status-dot offline";
  statusText.textContent = "Offline";
  serverAlert.classList.remove("hidden");
  if (settingServerStatus) settingServerStatus.textContent = "Server is offline";
  if (settingAppStatus) settingAppStatus.textContent = "Server offline";
  if (btnShutdownServer) btnShutdownServer.disabled = true;
  if (btnCheckAppUpdate) btnCheckAppUpdate.disabled = true;
  return false;
}

function handleAppVersionNotice(version, isDev) {
  if (!settingAppStatus) return;
  if (isDev) {
    settingAppStatus.textContent = `v${version} • Development Mode`;
  } else {
    settingAppStatus.textContent = `v${version} • Production`;
  }
}

function handleYtdlpUpdateNotice(info) {
  if (!info) return;

  if (settingEngineStatus) {
    if (info.version && info.version !== "unknown") {
      settingEngineStatus.textContent = `v${info.version} • ${info.updated ? "Updated" : "Up to date"}`;
    } else if (info.message) {
      settingEngineStatus.textContent = info.message;
    }
  }

  if (info.updated && updateBanner) {
    updateBannerTitle.textContent = "⚡ Engine Updated!";
    updateBannerDesc.textContent = info.message || `yt-dlp updated to ${info.version}`;
    updateBanner.classList.remove("hidden");
    showToast(`🎉 yt-dlp updated to v${info.version}! Extractors up to date.`, 5000);
  }
}

function showToast(message, duration = 3000) {
  popupToast.textContent = message;
  popupToast.classList.remove("hidden");
  setTimeout(() => popupToast.classList.add("hidden"), duration);
}

// ============================================================
// 2. TAB NAVIGATION
// ============================================================

function setupTabs() {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      switchTab(targetId);
    });
  });
}

function switchTab(targetId) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.getAttribute("data-tab") === targetId));
  tabPanes.forEach((p) => p.classList.toggle("active", p.id === targetId));

  if (targetId === "tab-history") {
    loadHistory(historyCurrentPage);
  } else if (targetId === "tab-settings") {
    loadAndApplySettings();
  }
}

// ============================================================
// 3. MEDIA TAB & SCAN HANDLING
// ============================================================

async function initializeMediaInput() {
  // Only scan if user explicitly clicked the overlay "⚡ Download" badge on a video
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["detectedMedia"], (res) => {
      if (res.detectedMedia) {
        let candidate = res.detectedMedia.url || "";
        if (candidate.startsWith("blob:") || candidate.startsWith("data:")) {
          candidate = res.detectedMedia.pageUrl || "";
        }
        // Only load if captured recently (within last 5 minutes)
        if (candidate && (Date.now() - (res.detectedMedia.timestamp || 0) < 300000)) {
          mediaUrlInput.value = candidate;
          triggerScan(candidate);
          // Clear captured media so future popup openings won't automatically re-scan
          chrome.storage.local.remove(["detectedMedia"]);
          return;
        } else {
          // Stale entry, clear it
          chrome.storage.local.remove(["detectedMedia"]);
        }
      }
      // DO NOT auto-scan or auto-fetch active tab on normal popup open
    });
  }
}

async function fetchActiveTabUrl() {
  try {
    if (chrome && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))) {
        mediaUrlInput.value = tab.url;
        showToast("Active tab URL loaded ⚡ Scanning...");
        triggerScan(tab.url);
      } else {
        showToast("No valid web URL found in current tab");
      }
    } else {
      showToast("Cannot access browser tabs");
    }
  } catch (e) {
    console.warn("Could not query active tab:", e);
    showToast("Unable to fetch current tab URL");
  }
}

function setupEventListeners() {
  btnRetryServer.addEventListener("click", async () => {
    const ok = await checkServerHealth();
    if (ok) {
      showToast("Connected to STU Downloader backend! ⚡");
      loadAndApplySettings();
    }
  });

  // Paste from clipboard — does not auto-scan until user clicks Scan or presses Enter
  btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        mediaUrlInput.value = text.trim();
        showToast("URL pasted! Click 'Scan Media' or press Enter 🔍");
      }
    } catch (e) {
      showToast("Unable to read clipboard");
    }
  });

  // Enter key triggers scan manually
  mediaUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const url = mediaUrlInput.value.trim();
      if (url) {
        triggerScan(url);
      } else {
        showToast("Please enter or paste a media URL first");
      }
    }
  });

  // Current Tab button — explicitly scans current tab
  btnUseActiveTab.addEventListener("click", () => {
    fetchActiveTabUrl();
  });

  // Manual Scan button
  btnScanMedia.addEventListener("click", () => {
    const url = mediaUrlInput.value.trim();
    if (!url) {
      showToast("Please enter a media URL first");
      return;
    }
    triggerScan(url);
  });

  connectionsSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    speedBadge.textContent = `⚡ ${val}x Connections`;
  });

  // Quick Preset Chips Handler
  const presetChips = document.querySelectorAll(".preset-chip");
  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const fmt = chip.getAttribute("data-format");
      const q = chip.getAttribute("data-quality");
      if (fmt && formatSelect) formatSelect.value = fmt;
      if (q && qualitySelect) qualitySelect.value = q;
      presetChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  function syncPresetChips() {
    presetChips.forEach((chip) => {
      const matchFmt = chip.getAttribute("data-format") === (formatSelect ? formatSelect.value : "");
      const matchQ = chip.getAttribute("data-quality") === (qualitySelect ? qualitySelect.value : "");
      chip.classList.toggle("active", matchFmt && matchQ);
    });
  }
  if (formatSelect) formatSelect.addEventListener("change", syncPresetChips);
  if (qualitySelect) qualitySelect.addEventListener("change", syncPresetChips);

  btnStartDownload.addEventListener("click", startDownload);

  // History Event Listeners
  historySearch.addEventListener("input", debounce(() => loadHistory(1), 300));
  historyFilter.addEventListener("change", () => loadHistory(1));
  btnClearHistory.addEventListener("click", clearAllHistory);
  btnPrevPage.addEventListener("click", () => {
    if (historyCurrentPage > 1) loadHistory(historyCurrentPage - 1);
  });
  btnNextPage.addEventListener("click", () => {
    loadHistory(historyCurrentPage + 1);
  });

  // Settings Save & Open Folder Listener
  btnSaveSettings.addEventListener("click", saveSettings);
  if (btnOpenDownloadsFolder) {
    btnOpenDownloadsFolder.addEventListener("click", () => openFolder(""));
  }

  // Native OS Folder Picker
  if (btnBrowseFolder) {
    btnBrowseFolder.addEventListener("click", async () => {
      if (!isBackendOnline) {
        showToast("⚠️ Backend offline — start STU Downloader server first");
        return;
      }
      const prevHtml = btnBrowseFolder.innerHTML;
      btnBrowseFolder.innerHTML = "⏳ Choosing...";
      btnBrowseFolder.disabled = true;
      try {
        const currentDir = settingDownloadDir ? settingDownloadDir.value.trim() : "";
        const res = await fetch(`${API_BASE}/pick-folder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_dir: currentDir }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.path) {
            if (settingDownloadDir) settingDownloadDir.value = data.path;
            if (settingCustomDirDisplay) {
              settingCustomDirDisplay.textContent = data.path;
              settingCustomDirDisplay.title = data.path;
            }
            if (settingDownloadDirText) {
              settingDownloadDirText.textContent = data.path;
              settingDownloadDirText.title = data.path;
            }
            if (btnResetFolder) btnResetFolder.classList.remove("hidden");
            await saveSettings();
            const folderName = data.path.split(/[/\\]/).filter(Boolean).pop() || data.path;
            showToast(`📁 Download folder set: ${folderName}`);
          } else if (data.canceled) {
            // User cancelled dialog
          } else if (data.error) {
            showToast(`⚠️ ${data.error}`);
          }
        } else {
          showToast("⚠️ Could not open folder selection");
        }
      } catch (e) {
        console.error("Folder picker request error:", e);
        showToast("⚠️ Could not reach backend folder picker");
      } finally {
        btnBrowseFolder.innerHTML = prevHtml;
        btnBrowseFolder.disabled = false;
      }
    });
  }

  if (btnResetFolder) {
    btnResetFolder.addEventListener("click", async () => {
      if (settingDownloadDir) settingDownloadDir.value = "";
      if (settingCustomDirDisplay) {
        settingCustomDirDisplay.textContent = "Default: System Downloads";
        settingCustomDirDisplay.title = "Default: System Downloads";
      }
      if (settingDownloadDirText) {
        settingDownloadDirText.textContent = "System Downloads";
        settingDownloadDirText.title = "System Downloads";
      }
      btnResetFolder.classList.add("hidden");
      await saveSettings();
      showToast("↺ Restored default Downloads folder");
    });
  }

  // Engine Update Listeners
  if (btnDismissUpdate) {
    btnDismissUpdate.addEventListener("click", () => {
      if (updateBanner) updateBanner.classList.add("hidden");
      fetch(`${API_BASE}/dismiss-update-notification`, { method: "POST" }).catch(() => {});
    });
  }

  if (btnCheckAppUpdate) {
    btnCheckAppUpdate.addEventListener("click", checkAppUpdate);
  }

  if (btnCheckEngineUpdate) {
    btnCheckEngineUpdate.addEventListener("click", checkEngineUpdate);
  }

  // Server Shutdown Listener
  if (btnShutdownServer) {
    btnShutdownServer.addEventListener("click", shutdownBackendServer);
  }
}

async function shutdownBackendServer() {
  if (!isBackendOnline) {
    showToast("Server is already offline");
    return;
  }

  const confirmed = confirm("Are you sure you want to stop the STU Media Downloader backend server?");
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/shutdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: false }),
    });

    if (res.status === 409) {
      const forceConfirm = confirm("⚠️ Downloads are currently in progress! Do you want to force stop the server anyway?");
      if (forceConfirm) {
        await fetch(`${API_BASE}/shutdown`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        });
      } else {
        return;
      }
    }

    isBackendOnline = false;
    statusDot.className = "status-dot offline";
    statusText.textContent = "Offline";
    serverAlert.classList.remove("hidden");
    if (settingServerStatus) settingServerStatus.textContent = "Server is offline";
    if (btnShutdownServer) btnShutdownServer.disabled = true;
    showToast("🛑 STU Downloader backend stopped successfully");
  } catch (e) {
    isBackendOnline = false;
    statusDot.className = "status-dot offline";
    statusText.textContent = "Offline";
    serverAlert.classList.remove("hidden");
    if (settingServerStatus) settingServerStatus.textContent = "Server is offline";
    if (btnShutdownServer) btnShutdownServer.disabled = true;
    showToast("🛑 Backend server stopped");
  }
}

async function checkAppUpdate() {
  if (!isBackendOnline) {
    showToast("Backend offline — please start backend server first");
    return;
  }

  if (appUpdateIcon) appUpdateIcon.classList.add("btn-icon-spin");
  if (appUpdateText) appUpdateText.textContent = "Checking...";
  if (btnCheckAppUpdate) btnCheckAppUpdate.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/check-app-update`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.is_dev) {
        if (settingAppStatus) settingAppStatus.textContent = `v${data.current_version} • Development Mode`;
        showToast("ℹ️ Development mode active — update checks disabled.", 4000);
      } else if (data.update_available) {
        const updateVer = data.latest_version ? `v${data.latest_version}` : (data.latest_sha || "latest");
        if (settingAppStatus) settingAppStatus.textContent = `Update available: ${updateVer}`;
        const userAction = confirm(`🚀 New STU Downloader update available (${updateVer})!\n\n${data.message || ""}\n\nDo you want to open the GitHub update page?`);
        if (userAction && data.release_url) {
          window.open(data.release_url, "_blank");
        }
      } else {
        if (settingAppStatus) settingAppStatus.textContent = `v${data.current_version} • Up to date`;
        showToast(`✅ STU Downloader is up to date (v${data.current_version})!`, 4000);
      }
    } else {
      showToast("⚠️ Could not check for STU Downloader updates");
    }
  } catch (err) {
    console.error("Check app update error:", err);
    showToast("⚠️ Network error while checking app updates");
  } finally {
    if (appUpdateIcon) appUpdateIcon.classList.remove("btn-icon-spin");
    if (appUpdateText) appUpdateText.textContent = "Check Update";
    if (btnCheckAppUpdate) btnCheckAppUpdate.disabled = false;
  }
}

async function checkEngineUpdate() {
  if (!isBackendOnline) {
    showToast("Backend offline — please start backend server first");
    return;
  }

  if (engineUpdateIcon) engineUpdateIcon.classList.add("btn-icon-spin");
  if (engineUpdateText) engineUpdateText.textContent = "Checking...";
  if (btnCheckEngineUpdate) btnCheckEngineUpdate.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/check-updates`, { method: "POST" });
    if (res.ok) {
      const info = await res.json();
      handleYtdlpUpdateNotice(info);
      if (info.updated) {
        showToast(`🎉 yt-dlp updated to ${info.version}! Latest extractors loaded ⚡`, 5000);
      } else {
        showToast(`✅ yt-dlp is up to date (${info.version})!`, 4000);
      }
    } else {
      showToast("⚠️ Could not check for updates");
    }
  } catch (err) {
    console.error("Check update error:", err);
    showToast("⚠️ Network error while checking updates");
  } finally {
    if (engineUpdateIcon) engineUpdateIcon.classList.remove("btn-icon-spin");
    if (engineUpdateText) engineUpdateText.textContent = "Check Update";
    if (btnCheckEngineUpdate) btnCheckEngineUpdate.disabled = false;
  }
}

async function triggerScan(url) {
  if (url.startsWith("blob:") || url.startsWith("data:")) return;

  if (!isBackendOnline) {
    const ok = await checkServerHealth();
    if (!ok) {
      showToast("Backend offline — please run python backend/app.py");
      return;
    }
  }

  scanSpinner.classList.remove("hidden");
  scanBtnText.textContent = "Scanning...";
  btnScanMedia.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/info?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      scannedMediaData = data;
      renderPreview(data);
      showToast(`Media loaded: ${data.title ? data.title.slice(0, 25) + "..." : "Ready to download"} ⚡`);
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || "Failed to extract media information ⚠️");
      previewCard.classList.add("hidden");
      scannedMediaData = null;
    }
  } catch (err) {
    console.error("Scan error:", err);
    showToast("Network error while scanning media ⚠️");
    previewCard.classList.add("hidden");
    scannedMediaData = null;
  } finally {
    scanSpinner.classList.add("hidden");
    scanBtnText.textContent = "🔍 Scan Media";
    btnScanMedia.disabled = false;
  }
}

function renderPreview(data) {
  previewTitle.textContent = data.title || "Media File";
  previewThumb.src = data.thumbnail || "icons/icon-128.png";
  previewDuration.textContent = data.duration || "";
  previewCard.classList.remove("hidden");

  if (data.formats && data.formats.length > 0) {
    qualitySelect.innerHTML = `<option value="best" selected>Best Available</option>`;
    data.formats.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.resolution || `${f.height}p`;
      opt.textContent = `${f.resolution || f.height + "p"} (${f.ext || "mp4"})`;
      qualitySelect.appendChild(opt);
    });
  }
}

// ============================================================
// 4. START DOWNLOAD & ENHANCED LIVE QUEUE
// ============================================================

async function startDownload() {
  const url = mediaUrlInput.value.trim();
  if (!url) {
    showToast("Please enter a media URL");
    return;
  }

  if (!isBackendOnline) {
    const ok = await checkServerHealth();
    if (!ok) {
      showToast("Backend offline — start python backend/app.py");
      return;
    }
  }

  const payload = {
    url: url,
    format: formatSelect.value,
    quality: qualitySelect.value,
    connections: parseInt(connectionsSlider.value, 10),
    title: scannedMediaData ? scannedMediaData.title : "",
    thumbnail_url: scannedMediaData ? scannedMediaData.thumbnail : "",
  };

  btnStartDownload.disabled = true;
  btnStartDownload.innerHTML = `<span>⏳ Enqueueing...</span>`;

  try {
    const res = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      currentTaskId = data.task_id;

      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          activeTask: {
            taskId: currentTaskId,
            title: payload.title || "Downloading Media...",
            url: url,
            startedAt: Date.now(),
          },
        });
      }

      showToast(`⚡ Download queued (Position #${data.queue_position})`);
      switchTab("tab-queue");
      listenToProgressStream(currentTaskId, payload.title || url);
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error || "Failed to start download"}`);
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`);
  } finally {
    btnStartDownload.disabled = false;
    btnStartDownload.innerHTML = `<span>🚀 Start Accelerated Download</span>`;
  }
}

async function restoreActiveQueue() {
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["activeTask"], (res) => {
      if (res.activeTask && res.activeTask.taskId) {
        currentTaskId = res.activeTask.taskId;
        listenToProgressStream(currentTaskId, res.activeTask.title);
      }
    });
  }
}

function listenToProgressStream(taskId, fallbackTitle = "Media Download") {
  if (activeEventSource) {
    activeEventSource.close();
  }

  emptyQueue.classList.add("hidden");
  queueBadge.classList.remove("hidden");
  queueBadge.textContent = "1";

  let card = document.getElementById(`task-card-${taskId}`);
  if (!card) {
    card = document.createElement("div");
    card.className = "queue-card";
    card.id = `task-card-${taskId}`;
    card.innerHTML = `
      <div class="queue-card-header">
        <h4 class="queue-title">${escapeHtml(fallbackTitle)}</h4>
        <span class="badge-status queued" id="status-badge-${taskId}">Queued</span>
      </div>
      <div class="progress-container">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" id="progress-fill-${taskId}"></div>
        </div>
      </div>
      <div class="queue-stats-grid">
        <div class="stat-item">
          <span class="stat-icon">⚡</span>
          <div>
            <div class="stat-label">Speed</div>
            <div class="stat-value stat-speed" id="speed-${taskId}">0 KiB/s</div>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💾</span>
          <div>
            <div class="stat-label">File Size</div>
            <div class="stat-value stat-size" id="size-${taskId}">--</div>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📊</span>
          <div>
            <div class="stat-label">Progress</div>
            <div class="stat-value stat-percent" id="percent-${taskId}">0.0%</div>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⏳</span>
          <div>
            <div class="stat-label">Time Remaining</div>
            <div class="stat-value stat-eta" id="eta-${taskId}">--</div>
          </div>
        </div>
      </div>
      <div class="queue-card-actions">
        <button class="btn-cancel-prominent" id="btn-cancel-${taskId}">
          <span>✕</span><span>Cancel Download</span>
        </button>
      </div>
    `;
    queueList.prepend(card);

    document.getElementById(`btn-cancel-${taskId}`).addEventListener("click", () => {
      cancelTask(taskId);
    });
  }

  const fillEl = document.getElementById(`progress-fill-${taskId}`);
  const statusBadge = document.getElementById(`status-badge-${taskId}`);
  const speedEl = document.getElementById(`speed-${taskId}`);
  const sizeEl = document.getElementById(`size-${taskId}`);
  const percentEl = document.getElementById(`percent-${taskId}`);
  const etaEl = document.getElementById(`eta-${taskId}`);

  activeEventSource = new EventSource(`${API_BASE}/progress-stream/${taskId}`);

  activeEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const status = data.status || "downloading";
      const pct = data.percent || 0;
      const speed = data.speed || "0 KiB/s";
      const size = data.size || "--";
      const eta = data.eta || "--";

      fillEl.style.width = `${pct}%`;
      percentEl.textContent = `${pct.toFixed(1)}%`;
      speedEl.textContent = speed;
      sizeEl.textContent = size;
      etaEl.textContent = eta;

      if (status === "queued") {
        statusBadge.className = "badge-status queued";
        statusBadge.textContent = `Queued (#${data.queue_position || 1})`;
      } else if (status === "downloading") {
        statusBadge.className = "badge-status downloading";
        statusBadge.textContent = "⚡ Downloading";
      } else if (status === "completed") {
        statusBadge.className = "badge-status completed";
        statusBadge.textContent = "✅ Completed";
        fillEl.style.width = "100%";
        percentEl.textContent = "100%";
        speedEl.textContent = "Done";
        sizeEl.textContent = data.size || "Saved";
        etaEl.textContent = "00:00";
        activeEventSource.close();
        clearActiveTaskStorage();
        showToast("✅ Download completed successfully!");
      } else if (status === "failed" || status === "cancelled") {
        statusBadge.className = `badge-status ${status}`;
        statusBadge.textContent = status === "failed" ? "❌ Failed" : "⏸ Cancelled";
        activeEventSource.close();
        clearActiveTaskStorage();
      }
    } catch (e) {
      console.error("Error parsing progress stream:", e);
    }
  };

  activeEventSource.onerror = () => {
    if (activeEventSource) activeEventSource.close();
  };
}

async function cancelTask(taskId) {
  try {
    const res = await fetch(`${API_BASE}/cancel/${taskId}`, { method: "POST" });
    if (res.ok) {
      showToast("Download cancelled");
      const statusBadge = document.getElementById(`status-badge-${taskId}`);
      if (statusBadge) {
        statusBadge.className = "badge-status cancelled";
        statusBadge.textContent = "⏸ Cancelled";
      }
      if (activeEventSource) activeEventSource.close();
      clearActiveTaskStorage();
    }
  } catch (err) {
    showToast("Failed to cancel download");
  }
}

function clearActiveTaskStorage() {
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove(["activeTask"]);
  }
  queueBadge.classList.add("hidden");
}

// ============================================================
// 5. HISTORY TAB & ACTIONS
// ============================================================

async function loadHistory(page = 1) {
  if (!isBackendOnline) {
    historyList.innerHTML = `<div class="empty-state"><p>Connect backend to view download history.</p></div>`;
    return;
  }

  historyCurrentPage = page;
  const q = historySearch.value.trim();
  const status = historyFilter.value;

  let url = `${API_BASE}/history?page=${page}&limit=10`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (status && status !== "all") url += `&status=${encodeURIComponent(status)}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      renderHistoryItems(data.items, data.total, data.page, data.limit);
    }
  } catch (err) {
    console.error("Failed to fetch history:", err);
  }
}

function renderHistoryItems(items, total, page, limit) {
  historyCount.textContent = `${total} items`;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  pageInfo.textContent = `Page ${page} of ${totalPages}`;

  btnPrevPage.disabled = page <= 1;
  btnNextPage.disabled = page >= totalPages;

  if (!items || items.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>No History Records</h3>
        <p>Your downloaded media records will appear here.</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-item";

    const statusClass = (item.status || "completed").toLowerCase();
    const sizeStr = item.file_size_mb ? `${item.file_size_mb.toFixed(1)} MB` : "";

    card.innerHTML = `
      <div class="history-item-main">
        <div class="history-item-title">${escapeHtml(item.title)}</div>
        <span class="badge-status ${statusClass}">${item.status}</span>
      </div>
      <div class="history-item-meta">
        <span>🕒 ${item.downloaded_at || "Recent"}</span>
        <span>•</span>
        <span>🎬 ${item.file_format.toUpperCase()} (${item.quality || "best"})</span>
        ${sizeStr ? `<span>•</span><span>💾 ${sizeStr}</span>` : ""}
      </div>
      <div class="history-actions">
        ${
          item.file_path
            ? `<button class="btn-action-small btn-open-folder" data-path="${escapeHtml(item.file_path)}" title="Open file location">📂 Open Folder</button>`
            : ""
        }
        <button class="btn-action-small btn-redownload" data-url="${escapeHtml(item.source_url)}" data-format="${escapeHtml(item.file_format)}" data-quality="${escapeHtml(item.quality)}" title="Download again">🔁 Re-download</button>
        <button class="btn-action-small btn-delete-item" data-id="${item.id}" title="Remove record">🗑</button>
      </div>
    `;

    historyList.appendChild(card);
  });

  document.querySelectorAll(".btn-open-folder").forEach((btn) => {
    btn.addEventListener("click", () => openFolder(btn.getAttribute("data-path")));
  });

  document.querySelectorAll(".btn-redownload").forEach((btn) => {
    btn.addEventListener("click", () => {
      mediaUrlInput.value = btn.getAttribute("data-url");
      formatSelect.value = btn.getAttribute("data-format") || "mp4";
      qualitySelect.value = btn.getAttribute("data-quality") || "best";
      switchTab("tab-media");
      triggerScan(btn.getAttribute("data-url"));
    });
  });

  document.querySelectorAll(".btn-delete-item").forEach((btn) => {
    btn.addEventListener("click", () => deleteHistoryEntry(btn.getAttribute("data-id")));
  });
}

async function openFolder(filePath) {
  try {
    const res = await fetch(`${API_BASE}/open-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
    });
    if (res.ok) {
      showToast("📂 Opened file in explorer");
    } else {
      const err = await res.json();
      showToast(`Error: ${err.error || "Cannot open folder"}`);
    }
  } catch (e) {
    showToast("Failed to open folder");
  }
}

async function deleteHistoryEntry(id) {
  try {
    const res = await fetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Record removed");
      loadHistory(historyCurrentPage);
    }
  } catch (e) {
    showToast("Failed to delete record");
  }
}

async function clearAllHistory() {
  if (!confirm("Are you sure you want to clear all download history?")) return;
  try {
    const res = await fetch(`${API_BASE}/history/clear`, { method: "POST" });
    if (res.ok) {
      showToast("History cleared");
      loadHistory(1);
    }
  } catch (e) {
    showToast("Failed to clear history");
  }
}

// ============================================================
// 6. SETTINGS TAB & PERSISTENCE
// ============================================================

async function loadAndApplySettings() {
  let settings = null;
  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) settings = await res.json();
    } catch (e) {
      console.warn("Could not fetch settings from backend:", e);
    }
  }

  if (!settings && chrome && chrome.storage && chrome.storage.local) {
    const stored = await chrome.storage.local.get(["userSettings"]);
    if (stored.userSettings) settings = stored.userSettings;
  }

  if (settings) {
    if (settingConcurrent && settings.max_concurrent_downloads) {
      settingConcurrent.value = String(settings.max_concurrent_downloads);
    }
    if (settingConnections && settings.default_connections) {
      settingConnections.value = String(settings.default_connections);
      connectionsSlider.value = String(settings.default_connections);
      speedBadge.textContent = `⚡ ${settings.default_connections}x Connections`;
    }
    if (settingFormat && settings.default_format) {
      settingFormat.value = settings.default_format;
      formatSelect.value = settings.default_format;
    }
    if (settingQuality && settings.default_quality) {
      settingQuality.value = settings.default_quality;
      qualitySelect.value = settings.default_quality;
    }
    const customDir = settings.download_dir || "";
    if (settingDownloadDirText) {
      settingDownloadDirText.textContent = customDir || "System Downloads";
      settingDownloadDirText.title = customDir || "System Downloads";
    }
    if (settingDownloadDir) {
      settingDownloadDir.value = customDir;
    }
    if (settingCustomDirDisplay) {
      settingCustomDirDisplay.textContent = customDir || "Default: System Downloads";
      settingCustomDirDisplay.title = customDir || "Default: System Downloads";
    }
    if (btnResetFolder) {
      btnResetFolder.classList.toggle("hidden", !customDir);
    }
  }
}

async function saveSettings() {
  const payload = {
    max_concurrent_downloads: parseInt(settingConcurrent.value, 10),
    default_connections: parseInt(settingConnections.value, 10),
    default_format: settingFormat.value,
    default_quality: settingQuality.value,
    download_dir: settingDownloadDir ? settingDownloadDir.value.trim() : "",
  };

  connectionsSlider.value = String(payload.default_connections);
  speedBadge.textContent = `⚡ ${payload.default_connections}x Connections`;
  formatSelect.value = payload.default_format;
  qualitySelect.value = payload.default_quality;
  if (settingDownloadDirText) {
    settingDownloadDirText.textContent = payload.download_dir || "System Downloads";
    settingDownloadDirText.title = payload.download_dir || "System Downloads";
  }
  if (settingCustomDirDisplay) {
    settingCustomDirDisplay.textContent = payload.download_dir || "Default: System Downloads";
    settingCustomDirDisplay.title = payload.download_dir || "Default: System Downloads";
  }
  if (btnResetFolder) {
    btnResetFolder.classList.toggle("hidden", !payload.download_dir);
  }

  if (chrome && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ userSettings: payload });
  }

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedData = await res.json();
        if (savedData && savedData.settings && savedData.settings.download_dir && settingDownloadDirText) {
          settingDownloadDirText.textContent = savedData.settings.download_dir;
          settingDownloadDirText.title = savedData.settings.download_dir;
        }
        showToast("💾 Settings saved successfully!");
        return;
      }
    } catch (e) {
      console.warn("Error saving settings to backend:", e);
    }
  }

  showToast("💾 Settings saved locally!");
}

// ============================================================
// 7. UTILITIES
// ============================================================

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
