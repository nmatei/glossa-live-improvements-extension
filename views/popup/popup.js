// ── SVG icons ─────────────────────────────────────────────────────────────
const ICONS = {
  play: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6,3 20,12 6,21" fill="currentColor"/>
  </svg>`,

  pause: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="3" width="4" height="18" rx="1" fill="currentColor"/>
    <rect x="15" y="3" width="4" height="18" rx="1" fill="currentColor"/>
  </svg>`,

  mute: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/>
    <path d="M15,9.5 a5,5 0 0 1 0,5" stroke="currentColor"/>
    <path d="M18,7 a9,9 0 0 1 0,10" stroke="currentColor"/>
  </svg>`,

  unmute: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/>
    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor"/>
  </svg>`,

  refresh: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,18H9A6,6,0,0,1,5.54,7.11"/>
    <path d="M10,6h5a6,6,0,0,1,3.46,10.89"/>
    <polyline points="12,16 14,18 12,20" stroke="#2ca9bc"/>
    <polyline points="12,8 10,6 12,4" stroke="#2ca9bc"/>
  </svg>`,

  fullscreen: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polyline points="15,3 21,3 21,9"/>
    <polyline points="9,21 3,21 3,15"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
  </svg>`,

  restore: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polyline points="8,3 3,3 3,8"/>
    <polyline points="16,21 21,21 21,16"/>
    <line x1="3" y1="3" x2="10" y2="10"/>
    <line x1="21" y1="21" x2="14" y2="14"/>
  </svg>`,

  website: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12,2 a15.3,15.3 0 0 1 4,10 a15.3,15.3 0 0 1 -4,10 a15.3,15.3 0 0 1 -4,-10 a15.3,15.3 0 0 1 4,-10z"/>
  </svg>`,

  openLive: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15,3 21,3 21,9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`
};

// ── DOM helpers ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setIcon(iconElId, svgKey) {
  $(iconElId).innerHTML = ICONS[svgKey];
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

// ── Storage helpers ────────────────────────────────────────────────────────
async function getLiveUrl() {
  const { liveUrl } = await chrome.storage.sync.get("liveUrl");
  return liveUrl || null;
}

// ── Focus-or-open a URL ────────────────────────────────────────────────────
async function focusOrOpen(url) {
  try {
    const tabs = await chrome.tabs.query({ url: url.endsWith("*") ? url : url + "*" });
    if (tabs.length) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url });
    }
  } catch (e) {
    console.error("focusOrOpen:", e);
  }
}

// ── Tab helpers ────────────────────────────────────────────────────────────
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
async function init() {
  const liveUrl = await getLiveUrl();

  // These two buttons always work regardless of live tab state
  $("btn-website").addEventListener("click", () => focusOrOpen("https://glossa.live/"));
  if (liveUrl) {
    $("btn-open-live").addEventListener("click", () => focusOrOpen(liveUrl));
  } else {
    $("btn-open-live").disabled = true;
  }

  if (!liveUrl) {
    showStatus("No Live URL configured — open Glossa.live first.", "error");
    setButtonsDisabled(true);
    $("btn-website").disabled = false;
    return;
  }

  const tabs = await findLiveTabs(liveUrl);

  if (!tabs.length) {
    showStatus("No matching Glossa.live tab found.", "error");
    setButtonsDisabled(true);
    $("btn-website").disabled = false;
    $("btn-open-live").disabled = false;
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
