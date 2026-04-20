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
  }

  document.body.addEventListener("contextmenu", e => {
    const content = e.target.closest("div.bg-white");
    if (content) {
      e.stopPropagation();
      e.preventDefault();

      showContextMenu(content, e);
    }
  });
}

initEvents();
