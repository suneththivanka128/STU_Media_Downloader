// STU Media Downloader — Content Script
(function () {
  "use strict";

  const processedElements = new WeakSet();

  function showToast(message, isSuccess = true) {
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
  }

  function handleBadgeClick(mediaEl, e) {
    e.preventDefault();
    e.stopPropagation();

    let mediaUrl = mediaEl.currentSrc || mediaEl.src || "";
    // If media source is an in-memory blob or data stream (YouTube, Twitter, TikTok, etc.), use page URL
    if (!mediaUrl || mediaUrl.startsWith("blob:") || mediaUrl.startsWith("data:")) {
      mediaUrl = window.location.href;
    }
    const pageTitle = document.title || "Web Video";

    // Store detected media in chrome storage for the popup to read
    if (chrome && chrome.storage && chrome.storage.local) {
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
          showToast(`⚡ Link captured (${pageTitle.slice(0, 25)}...)! Click extension icon.`);
        }
      );
    } else {
      showToast(`Media URL: ${mediaUrl.slice(0, 40)}...`);
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
    const videos = document.querySelectorAll("video");
    videos.forEach((v) => attachBadge(v));
  }

  // Initial scan & MutationObserver for dynamically loaded players
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanMediaElements);
  } else {
    scanMediaElements();
  }

  const observer = new MutationObserver((mutations) => {
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
