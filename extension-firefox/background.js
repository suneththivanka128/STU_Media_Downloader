// STU Media Downloader — Background Script (Firefox / Manifest V2)
// Firefox uses chrome.browserAction instead of chrome.action (MV3).
// We provide a browser-agnostic shim at the top.

const _action = (typeof browser !== "undefined" && browser.browserAction)
  ? browser.browserAction
  : (chrome.browserAction || chrome.action);

// ─────────────────────────────────────────────────────────────────────────────
// HLS Stream Interceptor  (M3U8 direct + .ts segment → auto-construct M3U8)
// ─────────────────────────────────────────────────────────────────────────────

const streamsKey = (tabId) => `streams_tab_${tabId}`;

/**
 * Given a captured URL, return the canonical M3U8 playlist URL.
 * • If it's already a .m3u8 URL  → return as-is
 * • If it's a .ts segment URL    → replace segment filename with index-v1-a1.m3u8
 * Returns null if we can't derive a useful M3U8 URL.
 */
function toM3u8Url(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return null;

  if (/\.m3u8/i.test(rawUrl)) return rawUrl;

  if (/\.ts(\?|$)/i.test(rawUrl)) {
    const constructed = rawUrl.replace(/seg-\d+-v\d+-a\d+\.ts/i, "index-v1-a1.m3u8");
    if (constructed !== rawUrl) return constructed;
    return rawUrl.replace(/\.ts(\?)/i, ".m3u8$1");
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// webRequest listener — observe .m3u8 and .ts network requests
// Firefox MV2: webRequestBlocking permission required but we don't block here.
// ─────────────────────────────────────────────────────────────────────────────

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const m3u8Url = toM3u8Url(details.url);
    if (!m3u8Url) return;

    const tabId = details.tabId;

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) return;
      // Skip extension-internal pages (moz-extension:// for Firefox)
      if (
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url.startsWith("about:")
      ) return;

      const pageUrl = tab.url;
      const key     = streamsKey(tabId);

      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) return;

        const streams = Array.isArray(result[key]) ? result[key] : [];

        if (streams.some((s) => s.url === m3u8Url)) return;

        const entry = {
          url:       m3u8Url,
          pageUrl:   pageUrl,
          pageTitle: tab.title || pageUrl,
          timestamp: Date.now(),
        };

        const updated = [entry, ...streams].slice(0, 8);

        chrome.storage.local.set({
          [key]:        updated,
          detectedM3u8: m3u8Url,
          pageUrl:      pageUrl,
        });

        updateBadge(tabId, updated.length);
      });
    });
  },
  { urls: ["<all_urls>"] }
);

/**
 * Update the extension badge for a given tab.
 * Firefox MV2: uses browserAction.setBadgeText (no tabId per-tab support in all versions).
 */
function updateBadge(tabId, count) {
  try {
    _action.setBadgeText({ text: count > 0 ? "HLS" : "" });
    _action.setBadgeBackgroundColor({ color: "#22c55e" });
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup: tab closed or navigated away
// ─────────────────────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([streamsKey(tabId)]);
  try { _action.setBadgeText({ text: "" }); } catch (_) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && changeInfo.url) {
    chrome.storage.local.remove([streamsKey(tabId)]);
    try { _action.setBadgeText({ text: "" }); } catch (_) {}
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Message handler (open popup from content.js badge click)
// Firefox MV2: chrome.browserAction.openPopup() is NOT supported.
// We fall back gracefully.
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "open_popup") {
    // Firefox MV2 does not support programmatic popup opening.
    // Just acknowledge the message so content.js doesn't hang.
    sendResponse({ success: false, error: "openPopup not supported in Firefox MV2" });
  }
});
