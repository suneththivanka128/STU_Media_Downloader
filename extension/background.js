// STU Media Downloader — Background Service Worker

// ─────────────────────────────────────────────────────────────────────────────
// HLS Stream Interceptor  (M3U8 direct + .ts segment → auto-construct M3U8)
//
// Many streaming sites (vixeo.io, vidsonic.net, etc.) serve video via HLS.
// The browser video player (HLS.js / Shaka) fetches segments as .ts files.
// We intercept both:
//   • Direct .m3u8 playlist requests  → capture as-is
//   • .ts segment requests            → auto-construct the index-v1-a1.m3u8 URL
//     e.g. /path/seg-1-v1-a1.ts?expires=... → /path/index-v1-a1.m3u8?expires=...
// ─────────────────────────────────────────────────────────────────────────────

const streamsKey = (tabId) => `streams_tab_${tabId}`;

/**
 * Given a captured URL, return the canonical M3U8 playlist URL.
 * • If it's already a .m3u8 URL  → return as-is
 * • If it's a .ts segment URL    → replace the segment filename with index-v1-a1.m3u8
 * Returns null if we can't derive a useful M3U8 URL.
 */
function toM3u8Url(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return null;

  // Already an M3U8 — accept directly
  if (/\.m3u8/i.test(rawUrl)) return rawUrl;

  // .ts segment — auto-construct the master playlist URL
  // Pattern: seg-N-vN-aN.ts (optionally followed by ?query)
  // e.g. seg-3-v1-a1.ts?expires=...  →  index-v1-a1.m3u8?expires=...
  if (/\.ts(\?|$)/i.test(rawUrl)) {
    const constructed = rawUrl.replace(/seg-\d+-v\d+-a\d+\.ts/i, "index-v1-a1.m3u8");
    // Only use if it actually changed (meaning the pattern was found)
    if (constructed !== rawUrl) return constructed;

    // Fallback: simpler pattern — anything ending in .ts? → .m3u8?
    return rawUrl.replace(/\.ts(\?)/i, ".m3u8$1");
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// webRequest listener — observe .m3u8 and .ts network requests
// ─────────────────────────────────────────────────────────────────────────────

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Ignore background / extension-internal requests
    if (details.tabId < 0) return;

    const m3u8Url = toM3u8Url(details.url);
    if (!m3u8Url) return;

    const tabId = details.tabId;

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) return;
      if (tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) return;

      const pageUrl  = tab.url;
      const key      = streamsKey(tabId);

      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) return;

        const streams = Array.isArray(result[key]) ? result[key] : [];

        // Deduplicate by constructed M3U8 URL
        if (streams.some((s) => s.url === m3u8Url)) return;

        const entry = {
          url:       m3u8Url,
          pageUrl:   pageUrl,
          pageTitle: tab.title || pageUrl,
          timestamp: Date.now(),
        };

        // Prepend newest, keep max 8 per tab
        const updated = [entry, ...streams].slice(0, 8);

        // Persist per-tab list (for the panel in popup)
        // Also persist as the simple "latest" keys for auto-fill on popup open
        chrome.storage.local.set({
          [key]:         updated,
          detectedM3u8:  m3u8Url,
          pageUrl:       pageUrl,
        });

        // Show "HLS" badge so the user knows a stream was captured
        updateBadge(tabId, updated.length);
      });
    });
  },
  // Listen to ALL requests — filter for .m3u8 / .ts in JS.
  // IMPORTANT: Chrome extension URL patterns like "*://*/*.ts*" only match the
  // LAST path segment. Deep CDN paths like /secure/385/.../seg-1-v1-a1.ts?...
  // would silently fail. Using <all_urls> + JS filter is the only reliable way.
  { urls: ["<all_urls>"] }
);

/**
 * Update the extension action badge for a given tab.
 */
function updateBadge(tabId, count) {
  try {
    chrome.action.setBadgeText({
      text:  count > 0 ? "HLS" : "",
      tabId: tabId,
    });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: tabId });
  } catch (_) {
    // setBadgeText may not accept tabId in all Chrome versions — fallback
    chrome.action.setBadgeText({ text: count > 0 ? "HLS" : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup: tab closed or navigated away
// ─────────────────────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([streamsKey(tabId)]);
  try { chrome.action.setBadgeText({ text: "", tabId: tabId }); } catch (_) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && changeInfo.url) {
    // New page — clear old captures and badge for this tab
    chrome.storage.local.remove([streamsKey(tabId)]);
    try { chrome.action.setBadgeText({ text: "", tabId: tabId }); } catch (_) {}
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Message handler (open popup from content.js badge click)
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "open_popup") {
    if (chrome.action && typeof chrome.action.openPopup === "function") {
      const windowId = sender?.tab?.windowId;
      const options  = windowId ? { windowId } : {};

      chrome.action
        .openPopup(options)
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.warn("STU Downloader: Could not open popup:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // keep channel open for async response
    } else {
      sendResponse({ success: false, error: "chrome.action.openPopup not supported" });
    }
  }
});
