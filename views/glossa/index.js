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

    // Restore play state after a popup-triggered refresh
    const { shouldAutoPlay } = await chrome.storage.sync.get("shouldAutoPlay");
    if (shouldAutoPlay) {
      await chrome.storage.sync.set({ shouldAutoPlay: false }); // consume the flag
      const playBtn = await waitElement('button[title="Play"]', 10000, 250);
      if (playBtn) {
        playBtn.click();
      }
    }

    initAutoScroll();
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
