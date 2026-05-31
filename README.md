# Chrome extension to improve Glossa.live experience

![icon](views/icons/icon-48.png)

✨ This extension improve Glossa.live experience by adding new features and improving existing ones.

## 💠 Features

- [x] `🔲 Fullscreen` in context menu in [glossa.live](https://glossa.live) - as a client - inside live captions
      this will allow you to fullscreen only the live captions and hide the entire page that has a lot of distractions and is not needed when you want to focus on the live captions
- [ ] Custom background & text colors
- [ ] integration with https://github.com/nmatei/chrome-bible-utilities?
      (to be able to project text directly on those projectors screens, without the need to customise styles)

## ⚙ Setup Plugin as Developer

If you want to try to install it as Developer

- [x] **Download/Clone** this repo
  - [ ] as zip & Unzip it
  - [x] or `git clone https://github.com/nmatei/glossa-live-improvements-extension.git`
  - [x] to update use `git pull`
- [x] Open [chrome://extensions/](chrome://extensions/)
  - [x] Activate `Developer mode`
- [x] **Load unpacked** Extension
- [x] Select `glossa-live-improvements-extension` folder

## TODOs

- [x] when this `aria-label="Scroll to latest"` button appears, scroll to the latest caption in 2 seconds if this doesn't happen automatically. This is needed because sometimes the live captions don't scroll to the latest caption and this button appears, so we need to scroll to the latest caption manually by clicking this button, but we want to automate this process and scroll to the latest caption automatically when this button appears.

- [ ] fullscreen button works to fullscreen the live captions, but it doesn't work to exit fullscreen mode, so we want to change it to 'restore' (example pressing esc works... but we want to be able to exit fullscreen mode by clicking the same button again)
- [ ] more buttons to popup instead "No matching Glossa.live tab found." - just add a separator and then:
  - [ ] add a button to popup to open the 'glossa.live' website directly from the extension popup, this will allow users to easily access the website without the need to type the URL in the address bar or search for it in their bookmarks (if they have the page opened in a tab, this button will focus that tab instead of opening a new one)
  - [ ] add a button to popup to open the 'glossa.live/${liveUrl}' or to focus it if it's already opened in a tab
