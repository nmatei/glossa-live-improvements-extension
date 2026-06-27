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

function showContextMenu(content, e) {
  const menu = getContextMenu([
    {
      text: "Fullscreen",
      icon: "🔲",
      itemId: "fullscreen",
      handler: target => {
        content.requestFullscreen();
      }
    },
    {
      text: "Change Live URL",
      icon: "🔗",
      itemId: "change-live-url",
      handler: async () => {
        await getLiveUrl(true);
      }
    }
  ]);
  showByCursor(menu, e);
}

async function initEvents() {
  const liveUrl = await getLiveUrl();
  if (window.location.href.startsWith(liveUrl)) {
    document.body.classList.add("glossa-live-improvements-extension");

    // Apply the user-configured override palette (live-updates via storage)
    await applyOverrideColors();

    // Restore the page state after a popup-triggered refresh
    await restoreStateAfterRefresh();

    initAutoScroll();
    initAudioState();
  }

  document.body.addEventListener("contextmenu", e => {
    const content = [...document.querySelectorAll("div.bg-white")].find(
      div => div.firstElementChild?.matches("div.overflow-y-auto")
    );
    if (content && content.contains(e.target)) {
      e.stopPropagation();
      e.preventDefault();

      showContextMenu(content, e);
    }
  });
}

// Default primary background — mirrors the :root fallback in overrides.css.
const DEFAULT_OVERRIDE_BG = "#82663a";

// Read the stored primary color, derive the full palette, and write the CSS
// custom properties on :root. Inline styles override the stylesheet defaults,
// so this recolors the page without touching overrides.css.
async function applyOverrideColors() {
  const { overrideBgColor } = await chrome.storage.sync.get("overrideBgColor");
  const palette = deriveOverrideColors(overrideBgColor || DEFAULT_OVERRIDE_BG);
  const root = document.documentElement.style;
  root.setProperty("--glossa-override-bg", palette.bg);
  root.setProperty("--glossa-override-active-bg", palette.activeBg);
  root.setProperty("--glossa-override-bg-hover", palette.bgHover);
  root.setProperty("--glossa-override-text", palette.text);
  root.setProperty("--glossa-override-text-secondary", palette.textSecondary);
  root.setProperty("--glossa-override-button-border", palette.buttonBorder);
}

// Live-update the palette while the popup is open (color picked in settings).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.overrideBgColor) {
    applyOverrideColors();
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

  // Play — click Play once it renders
  if (shouldAutoPlay) {
    const playBtn = await waitElement('button[title="Play"]', 10000, 250);
    playBtn?.click();
  }

  // Mute — the Mute/Unmute control only appears once audio has started.
  // title="Mute" → currently unmuted; title="Unmute" → currently muted.
  if (shouldMute) {
    const audioBtn = await waitElement('button[title="Mute"], button[title="Unmute"]', 10000, 250);
    if (audioBtn && audioBtn.title === "Mute") {
      audioBtn.click();
    }
  }
}

function initAudioState() {
  function updateAudioClass() {
    const muteBtn = document.querySelector('button[title="Mute"]');
    const unmuteBtn = document.querySelector('button[title="Unmute"]');
    // Only update if the mute/unmute button is actually present
    if (muteBtn || unmuteBtn) {
      document.body.classList.toggle("audio-not-started", !muteBtn);
    }
  }

  // Apply after load settles, in case the button renders late
  setTimeout(updateAudioClass, 2000);

  // Toggle immediately on click of Mute/Unmute button
  document.body.addEventListener("click", e => {
    const btn = e.target.closest('button[title="Mute"], button[title="Unmute"]');
    if (btn) {
      // Title reflects state before click, so invert
      const willBeAudioOn = btn.title === "Unmute";
      document.body.classList.toggle("audio-not-started", !willBeAudioOn);
    }
  });

  const observer = new MutationObserver(updateAudioClass);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
}

function initAutoScroll() {
  let scrollTimer = null;

  const observer = new MutationObserver(() => {
    const btn = document.querySelector('button[aria-label="Scroll to latest"]');
    if (btn && !scrollTimer) {
      scrollTimer = setTimeout(() => {
        const current = document.querySelector('button[aria-label="Scroll to latest"]');
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
