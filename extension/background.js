// STU Media Downloader — Background Service Worker

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "open_popup") {
    // Attempt to open the extension popup automatically
    if (chrome.action && typeof chrome.action.openPopup === "function") {
      const windowId = sender?.tab?.windowId;
      const options = windowId ? { windowId } : {};

      chrome.action
        .openPopup(options)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((err) => {
          console.warn("STU Downloader: Could not open popup automatically:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep message channel open for async sendResponse
    } else {
      sendResponse({ success: false, error: "chrome.action.openPopup not supported" });
    }
  }
});
