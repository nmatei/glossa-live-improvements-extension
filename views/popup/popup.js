// ── SVG icons ─────────────────────────────────────────────────────────────
// Icons live in the shared views/icons/icons.js library (loaded before this
// script) so they can be reused across the extension. `chevron` maps to the
// library's `rightArrow` (rotated via CSS when the settings section is open).

// ── DOM helpers ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setIcon(iconElId, svgKey) {
  $(iconElId).innerHTML = icons[svgKey];
}

// The footer always shows a persistent "base" status reflecting page state.
// Transient messages (Refreshing…, saved, validation errors) override it for a
// few seconds, then it reverts to the base.
// dot: "live" (green, pulsing) | "idle" (gray) | "off" (hidden)
let baseStatus = { msg: "", type: "", dot: "off" };
let statusTimer = null;

function paintStatus(msg, type, dot) {
  $("status").textContent = msg;
  $("status").className = "status" + (type ? " " + type : "");
  $("status-dot").className = "status-dot" + (dot === "off" ? " hidden" : " " + dot);
  $("popup-footer").classList.toggle("error", type === "error");
}

function setBaseStatus(msg, type = "", dot = "off") {
  baseStatus = { msg, type, dot };
  clearTimeout(statusTimer);
  paintStatus(msg, type, dot);
}

function showStatus(msg, type = "") {
  // Transient errors hide the live dot; other transient messages keep the base dot.
  paintStatus(msg, type, type === "error" ? "off" : baseStatus.dot);
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => paintStatus(baseStatus.msg, baseStatus.type, baseStatus.dot), 3000);
}

// Reflect play/mute state as the persistent footer message.
function updateLiveStatus(state) {
  if (!state) return;
  if (state.isPlaying) {
    setBaseStatus(
      state.isMuted ? "Listening… (audio muted)" : "Listening… live captions are running.",
      "info",
      "live"
    );
  } else {
    setBaseStatus("Press Play to start, then Fullscreen to cast.", "", "idle");
  }
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll(".popup-btn").forEach(btn => {
    btn.disabled = disabled;
  });
}

// ── Initial icon render ────────────────────────────────────────────────────
setIcon("icon-play-pause", "play");
setIcon("icon-mute", "mute");
setIcon("icon-timestamps", "clock");
setIcon("icon-originals", "eye");
setIcon("icon-refresh", "refresh");
setIcon("icon-fullscreen", "fullscreen");
setIcon("icon-website", "website");
setIcon("icon-open-live", "openLive");
setIcon("icon-settings", "settings");
setIcon("icon-chevron", "rightArrow");

// ── Constants ────────────────────────────────────────────────────────────
const MAIN_URL = "https://glossa.live/";
const DEFAULT_OVERRIDE_BG = "#82663a";
const DEFAULT_ORIGINAL_SCALE = 80;

// Accept only "#rrggbb"; fall back to the default so the picker never breaks.
function normalizeColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test((value || "").trim()) ? value.trim() : DEFAULT_OVERRIDE_BG;
}

// Clamp the original-text size to 30–90; fall back to the default if not numeric.
function clampScale(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(30, Math.min(90, n)) : DEFAULT_ORIGINAL_SCALE;
}

// ── Storage helpers ────────────────────────────────────────────────────────
async function getLiveUrl() {
  const { liveUrl } = await chrome.storage.sync.get("liveUrl");
  return liveUrl || null;
}

// ── Focus an existing tab, or open the URL if none ──────────────────────────
async function focusTabsOrOpen(tabs, url) {
  try {
    if (tabs.length) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url });
    }
  } catch (e) {
    console.error("focusTabsOrOpen:", e);
  }
}

// ── Tab helpers ────────────────────────────────────────────────────────────
// "Main" = any glossa.live tab that is NOT the configured live page (e.g. the
// home page, /admin, …). The live page belongs to the Open Live button instead.
async function findMainTabs(liveUrl) {
  try {
    const allTabs = await chrome.tabs.query({ url: "https://glossa.live/*" });
    return liveUrl ? allTabs.filter(tab => !(tab.url && tab.url.startsWith(liveUrl))) : allTabs;
  } catch (e) {
    console.error("findMainTabs:", e);
    return [];
  }
}

async function findLiveTabs(liveUrl) {
  if (!liveUrl) return [];
  try {
    const allTabs = await chrome.tabs.query({ url: "https://glossa.live/*" });
    return allTabs.filter(tab => tab.url && tab.url.startsWith(liveUrl));
  } catch (e) {
    console.error("findLiveTabs:", e);
    return [];
  }
}

async function execInTab(tabId, func, args = []) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args
    });
    return results?.[0]?.result ?? null;
  } catch (e) {
    console.error("execInTab:", e);
    return null;
  }
}

// ── Page state detection ───────────────────────────────────────────────────
async function getTabState(tabId) {
  return execInTab(tabId, () => {
    return {
      isPlaying: !!document.querySelector('button[title="Pause"]'),
      isMuted: !!document.querySelector('button[title="Unmute"]'),
      // Timestamps visible when glossa shows the "Hide Timestamps" control.
      showTimestamps: !!document.querySelector('button[title="Hide Timestamps"]'),
      // Originals visible when glossa shows the "Hide Originals" text button.
      showOriginals: [...document.querySelectorAll("button")].some(
        b => b.textContent.trim() === "Hide Originals"
      )
    };
  });
}

// ── UI update ──────────────────────────────────────────────────────────────
function applyState(state) {
  if (!state) return;

  // Play / Pause
  const playBtn = $("btn-play-pause");
  if (state.isPlaying) {
    setIcon("icon-play-pause", "pause");
    $("label-play-pause").textContent = "Pause";
    playBtn.classList.add("active");
  } else {
    setIcon("icon-play-pause", "play");
    $("label-play-pause").textContent = "Play";
    playBtn.classList.remove("active");
  }

  // Mute / Unmute
  const muteBtn = $("btn-mute");
  if (state.isMuted) {
    setIcon("icon-mute", "unmute");
    $("label-mute").textContent = "Unmute";
    muteBtn.classList.add("active");
  } else {
    setIcon("icon-mute", "mute");
    $("label-mute").textContent = "Mute";
    muteBtn.classList.remove("active");
  }

  // Timestamps — active when currently shown; label is the action a click performs
  const tsBtn = $("btn-timestamps");
  if (state.showTimestamps) {
    $("label-timestamps").textContent = "Hide Time";
    tsBtn.classList.add("active");
  } else {
    $("label-timestamps").textContent = "Show Time";
    tsBtn.classList.remove("active");
  }

  // Originals — active when currently shown; label is the action a click performs
  const origBtn = $("btn-originals");
  if (state.showOriginals) {
    $("label-originals").textContent = "Hide Orig.";
    origBtn.classList.add("active");
  } else {
    $("label-originals").textContent = "Show Orig.";
    origBtn.classList.remove("active");
  }

  // Keep the footer in sync with play/mute state
  updateLiveStatus(state);
}

// ── Main init ──────────────────────────────────────────────────────────────
function setDot(dotElId, open) {
  $(dotElId).classList.toggle("open", open);
}

async function init() {
  const liveUrl = await getLiveUrl();

  // ── Settings ──────────────────────────────────────────────────────────
  // Auto-saved on blur/change; available regardless of whether a live tab is open.

  // Live URL — saved when the field loses focus.
  $("input-live-url").value = liveUrl || "";
  $("input-live-url").addEventListener("change", async () => {
    const url = $("input-live-url").value.trim();
    if (!url) {
      showStatus("Enter a valid Live URL.", "error");
      return;
    }
    await chrome.storage.sync.set({ liveUrl: url });
    showStatus("Live URL saved — reopen the popup to use it.", "info");
  });

  // Background color — color picker + hex text input stay in sync, both auto-save.
  // The live page recolors instantly via chrome.storage.onChanged.
  const { overrideBgColor } = await chrome.storage.sync.get("overrideBgColor");
  const colorInput = $("input-bg-color");
  const colorText = $("input-bg-color-text");
  colorInput.value = normalizeColor(overrideBgColor || DEFAULT_OVERRIDE_BG);
  colorText.value = overrideBgColor || DEFAULT_OVERRIDE_BG;

  const saveColor = async value => {
    await chrome.storage.sync.set({ overrideBgColor: value });
    showStatus("Background color saved.", "info");
  };
  colorInput.addEventListener("change", () => {
    colorText.value = colorInput.value;
    saveColor(colorInput.value);
  });
  colorText.addEventListener("change", () => {
    const normalized = normalizeColor(colorText.value);
    colorInput.value = normalized;
    saveColor(normalized);
  });

  // Original text size — range slider, % of translation. The live page resizes
  // instantly via chrome.storage.onChanged.
  const { originalTextScale } = await chrome.storage.sync.get("originalTextScale");
  const scaleInput = $("input-original-scale");
  const scaleValue = $("original-scale-value");
  const initialScale = clampScale(originalTextScale ?? DEFAULT_ORIGINAL_SCALE);
  scaleInput.value = initialScale;
  scaleValue.textContent = initialScale;

  scaleInput.addEventListener("input", () => {
    scaleValue.textContent = scaleInput.value;
  });
  scaleInput.addEventListener("change", async () => {
    const scale = clampScale(scaleInput.value);
    await chrome.storage.sync.set({ originalTextScale: scale });
    showStatus("Original text size saved.", "info");
  });

  // Link dots: green when the corresponding page is already open.
  const mainTabs = await findMainTabs(liveUrl);
  setDot("dot-website", mainTabs.length > 0);
  $("btn-website").title = (mainTabs.length ? "Focus" : "Open") + " Glossa.live website";

  // Main-site button: focuses any non-live glossa.live tab, else opens the home page.
  $("btn-website").addEventListener("click", () => focusTabsOrOpen(mainTabs, MAIN_URL));

  const tabs = liveUrl ? await findLiveTabs(liveUrl) : [];

  if (liveUrl) {
    setDot("dot-open-live", tabs.length > 0);
    $("btn-open-live").title = (tabs.length ? "Focus" : "Open") + " your live page";
    $("btn-open-live").addEventListener("click", () => focusTabsOrOpen(tabs, liveUrl));
  } else {
    $("btn-open-live").disabled = true;
  }

  if (!liveUrl) {
    setBaseStatus("No Live URL configured — open Glossa.live first.", "error", "off");
    setButtonsDisabled(true);
    return;
  }

  if (!tabs.length) {
    setBaseStatus("No matching Glossa.live tab found.", "error", "off");
    setButtonsDisabled(true);
    return;
  }

  // Read initial page state
  const state = await getTabState(tabs[0].id);
  if (state) {
    applyState(state);
  } else {
    setBaseStatus("Connecting to your live page…", "info", "idle");
  }

  // ── Play / Pause ──────────────────────────────────────────────────────
  $("btn-play-pause").addEventListener("click", async () => {
    const st = await getTabState(tabs[0].id);
    if (!st) return;

    for (const tab of tabs) {
      await execInTab(tab.id, isPlaying => {
        const sel = isPlaying ? 'button[title="Pause"]' : 'button[title="Play"]';
        document.querySelector(sel)?.click();
      }, [st.isPlaying]);
    }

    // Persist play intent so a subsequent Refresh can restore it
    await chrome.storage.sync.set({ shouldAutoPlay: !st.isPlaying });

    setTimeout(async () => applyState(await getTabState(tabs[0].id)), 300);
  });

  // ── Mute / Unmute ─────────────────────────────────────────────────────
  $("btn-mute").addEventListener("click", async () => {
    const st = await getTabState(tabs[0].id);
    if (!st) return;

    for (const tab of tabs) {
      await execInTab(tab.id, isMuted => {
        const sel = isMuted ? 'button[title="Unmute"]' : 'button[title="Mute"]';
        document.querySelector(sel)?.click();
      }, [st.isMuted]);
    }

    setTimeout(async () => applyState(await getTabState(tabs[0].id)), 300);
  });

  // ── Timestamps (show / hide) ──────────────────────────────────────────
  $("btn-timestamps").addEventListener("click", async () => {
    for (const tab of tabs) {
      await execInTab(tab.id, () => {
        document
          .querySelector('button[title="Show Timestamps"], button[title="Hide Timestamps"]')
          ?.click();
      });
    }

    setTimeout(async () => applyState(await getTabState(tabs[0].id)), 300);
  });

  // ── Originals (show / hide) ───────────────────────────────────────────
  $("btn-originals").addEventListener("click", async () => {
    for (const tab of tabs) {
      await execInTab(tab.id, () => {
        const btn = [...document.querySelectorAll("button")].find(b => {
          const t = b.textContent.trim();
          return t === "Show Originals" || t === "Hide Originals";
        });
        btn?.click();
      });
    }

    setTimeout(async () => applyState(await getTabState(tabs[0].id)), 300);
  });

  // ── Fullscreen / Restore ──────────────────────────────────────────────
  async function syncFullscreenBtn() {
    const isFs = await execInTab(tabs[0].id, () => !!document.fullscreenElement);
    if (isFs) {
      setIcon("icon-fullscreen", "restore");
      $("label-fullscreen").textContent = "Restore";
    } else {
      setIcon("icon-fullscreen", "fullscreen");
      $("label-fullscreen").textContent = "Fullscreen";
    }
  }

  // Enter fullscreen on the captions container. Injected via executeScript so it
  // runs with the popup's user activation (a declarative content script can't).
  // Waits briefly for the container in case the page is still settling.
  async function enterFullscreen(tabId) {
    await execInTab(tabId, async () => {
      const findContent = () =>
        [...document.querySelectorAll("div.bg-white")].find(
          div => div.firstElementChild?.matches("div.overflow-y-auto")
        );
      let el = findContent();
      const end = Date.now() + 8000;
      while (!el && Date.now() < end) {
        await new Promise(r => setTimeout(r, 200));
        el = findContent();
      }
      el?.requestFullscreen?.();
    });
  }

  // Resolve once the tab reports "complete" (or after a short timeout).
  function waitTabComplete(tabId, timeout = 8000) {
    return new Promise(resolve => {
      const finish = () => {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        resolve();
      };
      const listener = (id, info) => {
        if (id === tabId && info.status === "complete") finish();
      };
      chrome.tabs.onUpdated.addListener(listener);
      const timer = setTimeout(finish, timeout);
    });
  }

  await syncFullscreenBtn();

  $("btn-fullscreen").addEventListener("click", async () => {
    const isFs = await execInTab(tabs[0].id, () => !!document.fullscreenElement);
    if (isFs) {
      await execInTab(tabs[0].id, () => document.exitFullscreen?.());
    } else {
      for (const tab of tabs) {
        await enterFullscreen(tab.id);
      }
    }
    setTimeout(syncFullscreenBtn, 300);
  });

  // ── Refresh ───────────────────────────────────────────────────────────
  $("btn-refresh").addEventListener("click", async () => {
    const st = await getTabState(tabs[0].id);
    const wasFs = await execInTab(tabs[0].id, () => !!document.fullscreenElement);
    // Persist play + mute — the content script restores them once the page reloads
    await chrome.storage.sync.set({
      shouldAutoPlay: st?.isPlaying ?? false,
      shouldMute: st?.isMuted ?? false
    });

    showStatus("Refreshing…", "info");

    for (const tab of tabs) {
      await chrome.tabs.reload(tab.id);
    }

    // Fullscreen can't be restored from the content script (no user gesture),
    // so re-enter it here once the reload finishes — this injection keeps the
    // popup's user activation, like clicking the Fullscreen button again.
    if (wasFs) {
      for (const tab of tabs) {
        await waitTabComplete(tab.id);
        await enterFullscreen(tab.id);
      }
      setTimeout(syncFullscreenBtn, 300);
    }
  });
}

init();
