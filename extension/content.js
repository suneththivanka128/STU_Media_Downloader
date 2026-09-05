// STU Media Downloader — Content Script
(function () {
  "use strict";

  const processedElements = new WeakSet();
  let contextValid = true;   // tracks if extension context is still alive

  // Helper: safely check if extension context is still valid
  function isExtensionAlive() {
    try {
      // Accessing chrome.runtime.id throws if context is invalidated
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function showToast(message, isSuccess = true) {
    try {
      const existing = document.querySelector(".smd-toast");
      if (existing) existing.remove();

      const toast = document.createElement("div");
      toast.className = "smd-toast";
      toast.innerHTML = `<span>${isSuccess ? "⚡" : "⚠️"}</span> <span>${message}</span>`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = "smd-fade-out 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    } catch (_) {
      // Page may have unloaded — silently ignore
    }
  }

  function handleBadgeClick(mediaEl, e) {
    e.preventDefault();
    e.stopPropagation();

    // If extension context was invalidated (e.g. after reload), show helpful message
    if (!contextValid || !isExtensionAlive()) {
      showToast("⚠️ Extension was reloaded — please refresh this page!", false);
      return;
    }

    let mediaUrl = mediaEl.currentSrc || mediaEl.src || "";
    // If media source is an in-memory blob or data stream (YouTube, Twitter, TikTok, etc.), use page URL
    if (!mediaUrl || mediaUrl.startsWith("blob:") || mediaUrl.startsWith("data:")) {
      mediaUrl = window.location.href;
    }
    const pageTitle = document.title || "Web Video";

    // Store detected media in chrome storage for the popup to read
    try {
      chrome.storage.local.set(
        {
          detectedMedia: {
            url: mediaUrl,
            pageUrl: window.location.href,
            title: pageTitle,
            timestamp: Date.now(),
          },
        },
        () => {
          // Check for runtime errors after callback
          if (chrome.runtime.lastError) {
            showToast("⚠️ Extension error — try refreshing the page.", false);
            return;
          }

          // Automatically trigger the extension popup to open via background worker
          try {
            chrome.runtime.sendMessage({ action: "open_popup" }, (response) => {
              if (chrome.runtime.lastError || (response && !response.success)) {
                // If browser restrictions prevented automatic popup, notify user
                showToast(`⚡ Link captured (${pageTitle.slice(0, 25)}...)! Click extension icon.`);
              } else {
                showToast(`⚡ Opening STU Downloader...`);
              }
            });
          } catch (_) {
            showToast(`⚡ Link captured (${pageTitle.slice(0, 25)}...)! Click extension icon.`);
          }
        }
      );
    } catch (err) {
      if (err.message && err.message.includes("Extension context invalidated")) {
        contextValid = false;
        showToast("⚠️ Extension reloaded — please refresh this page!", false);
      } else {
        // Fallback: copy URL to clipboard so user doesn't lose it
        showToast(`📋 Open extension & paste: ${mediaUrl.slice(0, 35)}...`);
      }
    }
  }

  function attachBadge(video) {
    if (processedElements.has(video)) return;
    processedElements.add(video);

    // Skip tiny videos / thumbnails / ads (< 120px)
    const rect = video.getBoundingClientRect();
    if (rect.width > 0 && rect.width < 140 && rect.height > 0 && rect.height < 140) {
      return;
    }

    const parent = video.parentElement || video.parentNode;
    if (!parent) return;

    // Ensure parent has position relative or absolute
    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.position === "static") {
      parent.classList.add("smd-badge-container");
    }

    // Create badge
    const badge = document.createElement("div");
    badge.className = "smd-overlay-badge";
    badge.innerHTML = `<span class="smd-icon">⚡</span><span>Download</span>`;
    badge.title = "Download with STU Media Downloader";

    badge.addEventListener("click", (e) => handleBadgeClick(video, e));

    parent.appendChild(badge);
  }

  function scanMediaElements() {
    // Stop scanning if context was invalidated
    if (!contextValid) return;
    try {
      const videos = document.querySelectorAll("video");
      videos.forEach((v) => attachBadge(v));
    } catch (_) {}
  }

  // Initial scan & MutationObserver for dynamically loaded players
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanMediaElements);
  } else {
    scanMediaElements();
  }

  const observer = new MutationObserver((mutations) => {
    // Disconnect observer if extension context was invalidated
    if (!contextValid || !isExtensionAlive()) {
      contextValid = false;
      observer.disconnect();
      return;
    }
    let shouldScan = false;
    for (const m of mutations) {
      if (m.addedNodes.length) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      requestAnimationFrame(scanMediaElements);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
