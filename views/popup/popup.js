// ── SVG icons ─────────────────────────────────────────────────────────────
// Icons live in the shared views/icons/icons.js library (loaded before this
// script) so they can be reused across the extension. `chevron` maps to the
// library's `rightArrow` (rotated via CSS when the settings section is open).

// ── DOM helpers ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setIcon(iconElId, svgKey) {
  $(iconElId).innerHTML = icons[svgKey];
}

function showStatus(msg, type = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
  if (msg && type !== "error") {
    setTimeout(() => {
      el.textContent = "";
      el.className = "status";
    }, 3000);
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
setIcon("icon-refresh", "refresh");
setIcon("icon-fullscreen", "fullscreen");
setIcon("icon-website", "website");
setIcon("icon-open-live", "openLive");
setIcon("icon-settings", "settings");
setIcon("icon-chevron", "rightArrow");
setIcon("icon-change-live-url", "openLive");

// ── Constants ────────────────────────────────────────────────────────────
const MAIN_URL = "https://glossa.live/";

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
      isMuted: !!document.querySelector('button[title="Unmute"]')
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
}

// ── Main init ──────────────────────────────────────────────────────────────
function setDot(dotElId, open) {
  $(dotElId).classList.toggle("open", open);
}

async function init() {
  const liveUrl = await getLiveUrl();

  // ── Settings: Change Live URL ─────────────────────────────────────────
  // Available regardless of whether a live tab is open.
  $("input-live-url").value = liveUrl || "";
  $("btn-change-live-url").addEventListener("click", async () => {
    const url = $("input-live-url").value.trim();
    if (!url) {
      showStatus("Enter a valid Live URL.", "error");
      return;
    }
    await chrome.storage.sync.set({ liveUrl: url });
    showStatus("Live URL saved — reopen the popup to use it.", "info");
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
    showStatus("No Live URL configured — open Glossa.live first.", "error");
    setButtonsDisabled(true);
    return;
  }

  if (!tabs.length) {
    showStatus("No matching Glossa.live tab found.", "error");
    setButtonsDisabled(true);
    return;
  }

  // Read initial page state
  const state = await getTabState(tabs[0].id);
  applyState(state);

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

  // ── Refresh ───────────────────────────────────────────────────────────
  $("btn-refresh").addEventListener("click", async () => {
    const st = await getTabState(tabs[0].id);
    // Persist current play state — content script will restore it on reload
    await chrome.storage.sync.set({ shouldAutoPlay: st?.isPlaying ?? false });

    for (const tab of tabs) {
      await chrome.tabs.reload(tab.id);
    }
    showStatus("Refreshing…", "info");
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

  await syncFullscreenBtn();

  $("btn-fullscreen").addEventListener("click", async () => {
    const isFs = await execInTab(tabs[0].id, () => !!document.fullscreenElement);
    if (isFs) {
      await execInTab(tabs[0].id, () => document.exitFullscreen?.());
    } else {
      for (const tab of tabs) {
        await execInTab(tab.id, () => {
          const el = [...document.querySelectorAll("div.bg-white")].find(
            div => div.firstElementChild?.matches("div.overflow-y-auto")
          );
          el?.requestFullscreen?.();
        });
      }
    }
    setTimeout(syncFullscreenBtn, 300);
  });
}

init();
