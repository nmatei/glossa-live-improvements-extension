async function getLiveUrl(reset = false) {
  const { liveUrl } = await chrome.storage.sync.get("liveUrl");
  if (liveUrl && !reset) {
    return liveUrl;
  }
  const { origin, pathname } = window.location;
  let firstPath = pathname.split("/").slice(0, 2).join("/") + "/";
  console.info("Default live URL:", firstPath);
  if (firstPath === "//") {
    firstPath = "/";
  }
  const defaultUrl = origin + firstPath;
  const url = await simplePrompt("Enter the live URL:", defaultUrl, "https://glossa.live/");
  await chrome.storage.sync.set({
    liveUrl: url
  });
  return url;
}

async function initEvents() {
  const liveUrl = await getLiveUrl();
  if (window.location.href.startsWith(liveUrl)) {
    document.body.classList.add("glossa-live-improvements-extension");

    // Apply the user-configured override palette (live-updates via storage)
    await applyOverrideColors();

    // Apply the user-configured original-text size (live-updates via storage)
    await applyOriginalTextScale();

    // Restore the page state after a popup-triggered refresh
    await restoreStateAfterRefresh();

    initAutoScroll();
  }
}

// Default primary background — mirrors the :root fallback in overrides.css.
const DEFAULT_OVERRIDE_BG = "#82663a";

// Default original-text size (percent of translation) — mirrors the popup default.
const DEFAULT_ORIGINAL_SCALE = 80;

// Read the stored primary color, derive the palette, and write the namespaced
// CSS custom properties on :root (documentElement). glossa.live never redefines
// these `--glossa-override-*` vars, so they cascade cleanly; overrides.css reads
// them inside a `.glx` rule to remap the site's own theme variables (--bg,
// --bg-elev, …) without fighting React's inline styles on the widget root.
async function applyOverrideColors() {
  const { overrideBgColor } = await chrome.storage.sync.get("overrideBgColor");
  const palette = deriveOverrideColors(overrideBgColor || DEFAULT_OVERRIDE_BG);
  const root = document.documentElement.style;
  root.setProperty("--glossa-override-bg", palette.bg);
  root.setProperty("--glossa-override-bg-elev", palette.bgElev);
  root.setProperty("--glossa-override-bg-sheet", palette.bgSheet);
  root.setProperty("--glossa-override-seg-track", palette.segTrack);
  root.setProperty("--glossa-override-border", palette.border);
  root.setProperty("--glossa-override-text", palette.text);
  root.setProperty("--glossa-override-text-secondary", palette.textSecondary);
}

// Read the stored original-text size (percent), clamp it, and write it as a
// fraction to the CSS variable used by overrides.css.
async function applyOriginalTextScale() {
  const { originalTextScale } = await chrome.storage.sync.get("originalTextScale");
  const percent = Math.max(30, Math.min(90, Number(originalTextScale) || DEFAULT_ORIGINAL_SCALE));
  document.documentElement.style.setProperty("--glossa-original-text-scale", percent / 100);
}

// Live-update styling while the popup is open (color / original size in settings).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.overrideBgColor) {
    applyOverrideColors();
  }
  if (changes.originalTextScale) {
    applyOriginalTextScale();
  }
});

// Restore play / mute state after a popup-triggered refresh. The flags are
// written by the popup's Refresh button and consumed once here.
// (Fullscreen is restored by the popup itself — a declarative content script
// has no user activation, so requestFullscreen would be blocked here.)
async function restoreStateAfterRefresh() {
  const { shouldAutoPlay, shouldMute } = await chrome.storage.sync.get(["shouldAutoPlay", "shouldMute"]);

  // Consume the flags so a manual reload doesn't replay them
  await chrome.storage.sync.set({ shouldAutoPlay: false, shouldMute: false });

  // Play — the play/pause control is a single toggle: aria-label="Play" while
  // paused, "Pause" while playing. Click only if it renders in the paused state.
  if (shouldAutoPlay) {
    const playBtn = await waitElement(GLOSSA_SELECTORS.playPause, 10000, 250);
    if (playBtn && playBtn.getAttribute("aria-label") === "Play") {
      playBtn.click();
    }
  }

  // Mute — the sound toggle carries the active class when sound is enabled. Click
  // it to mute only when it's currently on.
  if (shouldMute) {
    const soundBtn = await waitElement(GLOSSA_SELECTORS.sound, 10000, 250);
    if (soundBtn && soundBtn.classList.contains(GLOSSA_SELECTORS.activeClass)) {
      soundBtn.click();
    }
  }
}

function initAutoScroll() {
  let scrollTimer = null;

  const observer = new MutationObserver(() => {
    const btn = document.querySelector(GLOSSA_SELECTORS.scrollToLatest);
    if (btn && !scrollTimer) {
      scrollTimer = setTimeout(() => {
        const current = document.querySelector(GLOSSA_SELECTORS.scrollToLatest);
        if (current) {
          current.click();
        }
        scrollTimer = null;
      }, 2000);
    } else if (!btn && scrollTimer) {
      clearTimeout(scrollTimer);
      scrollTimer = null;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
}

initEvents();
