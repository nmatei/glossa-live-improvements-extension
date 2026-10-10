importScripts("common/utilities.js");

// The live page opens in its own "popup" window (no address bar / tabs), like
// the projector window in chrome-bible-utilities. Its bounds and state
// (normal / maximized / fullscreen, left, top, width, height) are remembered
// so it reopens on the same screen, in the same place and format.
// Stored in chrome.storage.local: window ids and screen positions are per device.
const liveWindowKey = "liveWindow";

const postCreateWindowStates = ["maximized", "fullscreen"];
const ignoreCreateWindowStates = [...postCreateWindowStates, "minimized"];

chrome.windows.onBoundsChanged.addListener(
  debounce(async win => {
    const settings = await getWindowSettings();
    if (settings && settings.id === win.id) {
      await setWindowSettings(win.id, { ...settings, ...win });
      const config = checkMinSize(win);
      if (config) {
        await chrome.windows.update(win.id, config);
      }
    }
  }, 500)
);

chrome.windows.onRemoved.addListener(async windowId => {
  // in case window is closed from 'x' button / Alt+F4
  const settings = await getWindowSettings();
  if (settings && settings.id === windowId) {
    await setWindowSettings(null, settings);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    // Handled here (not in the toolbar popup) because focusing the new window
    // closes the popup and would interrupt the sequence.
    case "openLive": {
      openLiveWindow(request.payload.url).then(
        win => sendResponse({ status: 200, id: win.id }),
        error => sendResponse({ status: 500, error: error.message })
      );
      return true;
    }
    case "closeLive": {
      closeLiveTabs(request.payload.url).then(() => sendResponse({ status: 200 }));
      return true;
    }
  }
});

async function getWindowSettings() {
  const result = await chrome.storage.local.get(liveWindowKey);
  return result[liveWindowKey];
}

async function setWindowSettings(id, settings = {}) {
  const config = checkMinSize(settings);
  // keep only what is needed to recreate the window
  const { left, top, width, height, state } = { ...settings, ...config };
  await chrome.storage.local.set({
    [liveWindowKey]: { left, top, width, height, state, id }
  });
}

function getWinMinSize() {
  return {
    width: 300,
    height: 200
  };
}

function getWinDefaultSize() {
  return {
    width: 1024,
    height: 700,
    top: 100,
    left: 100
  };
}

function checkMinSize(win) {
  const minSize = getWinMinSize();
  const defaultSize = getWinDefaultSize();
  const config = {};
  if (win.height < minSize.height) {
    config.height = minSize.height;
    if (win.top > 700) {
      config.top = defaultSize.top;
      config.left = defaultSize.left;
    }
  }
  if (win.width < minSize.width) {
    config.width = minSize.width;
  }
  return Object.keys(config).length ? config : null;
}

function mapWindowSettings(settings = {}) {
  // exclude not allowed props
  const { id, state, ...createSettings } = settings;
  Object.keys(createSettings).forEach(key => {
    if (createSettings[key] === undefined) delete createSettings[key];
  });
  if (state && !ignoreCreateWindowStates.includes(state)) {
    createSettings.state = state;
  }
  return createSettings;
}

function createLiveWindow(url, settings = {}) {
  return chrome.windows.create({
    ...getWinDefaultSize(),
    type: "popup",
    url,
    ...settings
  });
}

// Focus the live window if it is still open, otherwise create it using the
// last remembered bounds/state.
async function openLiveWindow(url) {
  const settings = await getWindowSettings();
  if (settings && settings.id) {
    try {
      const win = await chrome.windows.get(settings.id);
      await chrome.windows.update(win.id, { focused: true });
      return win;
    } catch (e) {
      // window no longer exists -> create it below
    }
  }

  let win;
  try {
    win = await createLiveWindow(url, mapWindowSettings(settings));
  } catch (e) {
    // fix causes:
    //  - Error: Invalid value for bounds. Bounds must be at least 50% within visible screen space
    //    (eg. the screen it was on is no longer connected)
    win = await createLiveWindow(url);
  }
  await setWindowSettings(win.id, settings || win);
  if (settings && postCreateWindowStates.includes(settings.state)) {
    await chrome.windows.update(win.id, { state: settings.state });
  }
  return win;
}

// Close every tab showing the live page. The bounds are saved first, so the
// next Open Live restores the same position even if no move happened since.
async function closeLiveTabs(url) {
  const settings = await getWindowSettings();
  if (settings && settings.id) {
    try {
      const win = await chrome.windows.get(settings.id);
      await setWindowSettings(null, { ...settings, ...win });
    } catch (e) {}
  }
  const tabs = await chrome.tabs.query({ url: "https://glossa.live/*" });
  const liveTabs = tabs.filter(tab => tab.url && tab.url.startsWith(url));
  if (liveTabs.length) {
    await chrome.tabs.remove(liveTabs.map(tab => tab.id));
  }
}
