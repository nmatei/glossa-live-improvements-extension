// ─────────────────────────────────────────────────────────────────────────────
// glossa.live selectors — SINGLE SOURCE OF TRUTH
// ─────────────────────────────────────────────────────────────────────────────
//
// The extension drives glossa.live's own UI. These selectors target the live
// page's DOM and WILL break when glossa.live redesigns the page (it already has,
// twice). Keep every glossa.live selector here — nowhere else — so a site change
// is a one-file update.
//
// HOW TO UPDATE when the site changes: save the latest live page into
// `views/glossa/glossa.live-content/` (that folder is git-ignored) and follow
// the `update-glossa-selectors` skill. The skill walks you through re-deriving
// each selector below from the captured HTML/CSS/JS bundle.
//
// This file is loaded as a plain script in two isolated worlds:
//   1. the content script (via manifest content_scripts) — index.js reads
//      `GLOSSA_SELECTORS` directly.
//   2. the popup page (via popup.html) — popup.js reads it directly for page
//      queries, and passes it as an argument into `chrome.scripting.executeScript`
//      injected functions (which run in the page's main world and cannot close
//      over the popup's copy).
//
// Current page shape (as of 2026-07): a self-contained widget scoped under
// `.lsn` / `.glx`, themed by CSS custom properties, controls keyed by aria-label.
// ─────────────────────────────────────────────────────────────────────────────

const GLOSSA_SELECTORS = {
  // Widget root. `.lsn` is position:fixed; inset:0 and covers the marketing page.
  // `.glx` carries the theme CSS variables (--bg, --bg-elev, --bg-sheet, --accent,
  // --text, --seg-track, …) that overrides.css remaps to recolor the page.
  widget: ".lsn",
  theme: ".glx",

  // Play / pause — a SINGLE toggle button. It carries class `playing` while
  // playing; its aria-label is "Pause" while playing and "Play" while paused.
  playPause: "button.ctl-play",
  playPausePlaying: "button.ctl-play.playing",

  // Sound (mute) toggle — lives in the settings sheet, which is ALWAYS mounted
  // (open/closed only flips a class + aria-hidden), so it is clickable without
  // opening the sheet. Class `on` (aria-pressed="true") means sound is ON.
  sound: 'button[aria-label="Toggle sound"]',

  // Timestamps toggle — settings sheet. Class `on` means timestamps are shown.
  // (Also reflected as `.transcript.show-time`.)
  timestamps: 'button[aria-label="Toggle timestamps"]',

  // Original-text toggle — settings sheet. Class `on` means originals are shown.
  // (Also reflected as `.transcript.show-orig`.)
  originals: 'button[aria-label="Toggle original text"]',

  // Scroll-to-latest — rendered only while the transcript is scrolled up.
  scrollToLatest: 'button[aria-label="Scroll to latest"]',

  // Captions-only region — the popup's Fullscreen target (excludes the control
  // bar). The scroll element itself is `.transcript` inside it.
  captions: ".transcript-wrap",
  transcript: ".transcript",

  // Class that marks a settings-sheet toggle as active (sound/timestamps/originals).
  activeClass: "on",
};

// Export for unit tests (Node/Jest). The browser never defines `module`, so this
// is a no-op there.
if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = { GLOSSA_SELECTORS };
}
