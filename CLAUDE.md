# AI Agents Instructions for Glossa.live Projector Cast Extension

## IDE Rules Sync

This file is kept in sync across all IDE rule files:

| File                              | IDE            |
| --------------------------------- | -------------- |
| `CLAUDE.md`                       | Claude Code    |
| `.github/copilot-instructions.md` | GitHub Copilot |

**When asked to update these rules or instructions, always run the sync script after saving changes:**

```bash
bash .claude/sync-rules.sh <path-to-this-file>
```

Replace `<path-to-this-file>` with the path of the file you just edited — e.g. `CLAUDE.md` or `.github/copilot-instructions.md`. The two files are byte-identical.

> Claude Code: a `PostToolUse` hook in `.claude/settings.json` runs this automatically on every edit.

### Skills (Claude ↔ Copilot)

Reusable agent skills are mirrored across tools. Claude Code and GitHub Copilot / VS Code use the **same `SKILL.md` format** ([VS Code agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)), so the two files are **byte-identical**:

| File                             | Tool                     |
| -------------------------------- | ------------------------ |
| `.claude/skills/<name>/SKILL.md` | Claude Code              |
| `.github/skills/<name>/SKILL.md` | GitHub Copilot / VS Code |

Frontmatter requires `name` (lowercase-hyphen, must match the parent directory) and `description`. Edit either file, then `bash .claude/sync-skills.sh <path-to-edited-file>` copies it to the mirror (also run automatically by the `PostToolUse` hook). Current skills:

- **`testing`** — add, run, and edit Jest + ts-jest unit tests.

---

## Project Overview

This is a **Chrome extension** (Manifest V3) that improves the [glossa.live](https://glossa.live) live-captions experience and makes it suitable for **casting onto a projector or TV screen** for presenters. It strips distractions from the live page, keeps the latest text in view, and adds a toolbar popup that acts as a remote control.

### Key Characteristics

- **Target Platform**: Chrome Extension (Manifest V3)
- **Architecture**: Simple vanilla JavaScript (no frameworks, no build step)
- **Primary Purpose**: Present glossa.live live captions cleanly on an external screen
- **Storage**: `chrome.storage.sync` for user settings (`liveUrl`) and transient flags (`shouldAutoPlay`)
- **Page control**: `chrome.scripting.executeScript` to read and drive glossa.live's own UI from the popup

## Core Functionality

### Main Features

1. **Fullscreen live captions** — context-menu action (and popup button) that fullscreens only the captions container, hiding the rest of the page
2. **Auto-scroll to latest** — automatically clicks glossa.live's "Scroll to latest" control so the newest caption stays visible
3. **Audio-state tracking** — reflects whether audio has started (`audio-not-started` body class) so styles can adapt
4. **Configurable Live URL** — prompts for and stores the specific live page (`liveUrl`); a context-menu action lets the user change it
5. **Toolbar popup remote** — play/pause, mute/unmute, refresh (restoring play state), fullscreen/restore, plus quick links to the main site and the configured live page with open-status indicators

### Architecture

- **Content script** (`views/glossa/index.js` + `overrides.css`): injected into `https://glossa.live/*`. Handles the live-URL prompt, the right-click context menu, auto-scroll, and audio-state tracking.
- **Popup** (`views/popup/`): the toolbar remote control. Reads page state and clicks glossa.live buttons via `chrome.scripting.executeScript`.
- **Background** (`views/background.js`): MV3 service worker.

### Communication Flow

The popup operates the page directly rather than via message passing — it injects functions into the live tab and reads/clicks glossa.live's native controls:

```javascript
// Read page state from the popup
const results = await chrome.scripting.executeScript({
  target: { tabId },
  func: () => ({
    isPlaying: !!document.querySelector('button[title="Pause"]'),
    isMuted: !!document.querySelector('button[title="Unmute"]')
  })
});
```

## Codebase Structure

### Key Directories & Files

- `manifest.json`: MV3 config. Host `https://glossa.live/*`; permissions `activeTab, storage, clipboardWrite, tabs, scripting`.
- `views/background.js`: service worker.
- `views/popup/`: toolbar popup (`popup.html` / `popup.css` / `popup.js`) — the remote control.
- `views/glossa/index.js`: content script entry (live-URL prompt, context menu, auto-scroll, audio state).
- `views/glossa/overrides.css`: page overrides applied when the extension is active.
- `views/common/`: shared code — `utilities.js`, `tooltip/`, `simplePrompt/`, and css (`colors.css`, `actions.css`, `CustomScrollChrome.css`).
- `views/icons/`: `icons.js` plus png/svg icons.

## Development Guidelines

### Code Style & Patterns

- **Vanilla JavaScript**: no frameworks, native DOM APIs, ES6+ (async/await, arrow functions).
- **Formatting**: follow `.prettierrc`.
- **Inline SVG icons**: defined as strings and injected via `innerHTML` (see `views/popup/popup.js` and `views/icons/icons.js`).
- **glossa.live UI detection**: rely on the site's own attributes, primarily `button[title="Play"|"Pause"|"Mute"|"Unmute"]` and `button[aria-label="Scroll to latest"]`. These are external selectors — verify them when glossa.live changes.

### Common Patterns

```javascript
// DOM helper used in the popup
const $ = id => document.getElementById(id);

// Run code inside the live tab
async function execInTab(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return results?.[0]?.result ?? null;
}

// Stored settings
const { liveUrl } = await chrome.storage.sync.get("liveUrl");
```

## Technical Constraints

- **Manifest V3**: service worker instead of a background page; no inline scripts.
- **Host permissions**: limited to `https://glossa.live/*`.
- **External selectors**: the extension drives glossa.live's own buttons, so DOM/selector changes on the site can break play/pause/mute/fullscreen — keep selectors centralized and easy to update.

## Testing Approach

- **Jest + ts-jest** are configured (`npm test` / `npm run watch-test`).
- `views/common/utilities.js` is loaded as a Jest `setupFiles` entry.
- No test suite exists yet — add tests under a `test/` directory and mock Chrome APIs as needed.

## Build & Deployment

- No build step. Load the unpacked extension via `chrome://extensions` → Developer mode → **Load unpacked** → select the repo folder.
- Version is tracked in `manifest.json` and `package.json` (keep them in sync).

## Questions & Clarifications

When working on this codebase, prefer:

- Simple, readable vanilla JavaScript over abstractions or new dependencies.
- Resilient glossa.live selectors, since the site is an external dependency.
- Chrome Extension MV3 best practices for permissions and security.
- A clean, distraction-free presentation experience for projector/TV use.
