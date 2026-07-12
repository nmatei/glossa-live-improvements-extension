---
name: update-selectors
description: Use when glossa.live changed its page and the extension's play/pause/mute/timestamps/originals/scroll/fullscreen controls or recolor stopped working. Walks through re-deriving every selector in views/glossa/selectors.js (and the recolor rules in overrides.css) from a freshly-saved copy of the live page.
---

# Update glossa.live selectors

The extension drives glossa.live's own UI, so it breaks whenever the site
redesigns its page. **Every glossa.live selector lives in one file:**
[views/glossa/selectors.js](../../../views/glossa/selectors.js) (the
`GLOSSA_SELECTORS` object). This skill re-derives those selectors from a
captured copy of the current live page.

## Step 1 — Capture the current page (the dev does this)

Open the configured live page in Chrome, then **Save Page As → "Webpage,
Complete"** into:

```
views/glossa/glossa.live-content/
```

That folder is git-ignored (see `.gitignore`) — it holds the reference HTML plus
the `_files/` bundle (JS + CSS). Delete any previous capture first so you're
reading the latest markup.

## Step 2 — Inventory the controls

The saved HTML is usually minified into one line, so use `grep`/Python rather
than reading it top to bottom. From `views/glossa/glossa.live-content/`:

```bash
f="$(ls *.html | head -1)"
# How are controls identified now? (title=, aria-label=, or button text)
grep -oE 'aria-label="[^"]*"' "$f" | sort | uniq -c
grep -oE 'title="[^"]*"'      "$f" | sort | uniq -c
# Any modal/sheet the controls live inside?
grep -oiE '(role="dialog"|aria-modal|class="[^"]*sheet[^"]*")' "$f" | sort | uniq -c
```

For each control you need (play/pause, sound, timestamps, originals, scroll,
captions container), print its surrounding markup to see the tag, classes, and
state attributes:

```bash
python3 - "$f" <<'PY'
import sys, re
html = open(sys.argv[1], encoding='utf-8', errors='replace').read()
for label in ["Pause","Toggle sound","Toggle timestamps","Toggle original text","Scroll to latest","Settings"]:
    m = re.search(re.escape('aria-label="%s"' % label), html)
    if not m:
        print("MISSING:", label); continue
    print("\n=== %s ===" % label)
    print(html[max(0, m.start()-380):m.end()+120])
PY
```

## Step 3 — Confirm behavior in the JS bundle

Markup alone doesn't tell you how state is represented or whether a control is
always in the DOM. Check the app bundle in `_files/` (the big `index-*.js`):

```bash
cd _files
js="$(ls index-*.js | head -1)"
grep -oE '.{60}(ctl-play|Toggle sound|Scroll to latest|aria-hidden).{60}' "$js" | head
```

Verify two things that have bitten us before:

- **Single toggle vs. two buttons.** Play/pause is now ONE button
  (`aria-label` flips `Play`↔`Pause`, class `playing` marks running). Detect
  state by the class, not by which of two buttons exists.
- **Dialog toggles stay mounted.** The sound/timestamps/originals toggles live
  in the Settings sheet. In the bundle the sheet's `children` render regardless
  of `open` (only a class + `aria-hidden` flip), so the popup can `.click()`
  them **without opening the sheet**. If a future redesign conditionally
  *unmounts* the sheet, the popup would first have to click the Settings button
  — check this each time.

## Step 4 — Update `GLOSSA_SELECTORS`

Edit [views/glossa/selectors.js](../../../views/glossa/selectors.js) only. Keep
each entry's comment accurate (what the selector targets + how state is encoded,
e.g. "class `on` means shown"). Because every consumer reads this object, that's
the entire code change for control selectors:

- [views/glossa/index.js](../../../views/glossa/index.js) — content script; reads `GLOSSA_SELECTORS` directly.
- [views/popup/popup.js](../../../views/popup/popup.js) — reads it directly, and **passes it as an arg** into `chrome.scripting.executeScript` injected functions (they run in the page's main world and can't close over the popup's copy). If you add a selector used inside an injected function, thread it through the args array like `getTabState` / `enterFullscreen` do.

`selectors.js` is loaded in both worlds via `manifest.json` (glossa content_scripts entry, before `index.js`) and `views/popup/popup.html` (before `popup.js`). No import wiring needed.

## Step 5 — Update the recolor (only if theming changed)

The recolor is CSS, so its "selectors" live in
[views/glossa/overrides.css](../../../views/glossa/overrides.css), not in
`selectors.js`. The current page is themed by CSS custom properties on `.glx`
(and `.glx[data-theme=light]`); `overrides.css` remaps them from the user's one
color. Confirm the variable names still exist:

```bash
cd _files && grep -oE '\-\-(bg|bg-elev|bg-sheet|accent|text|text-mid|seg-track|border)\b' index-*.css | sort -u
```

If glossa renamed these vars (or dropped the `.glx` scope), update the
`body.glossa-live-improvements-extension .glx { … }` block and the
`.transcript-wrap` fullscreen / `.seg-orig` size rules to match.

## Step 6 — Verify

1. `npm test` (color-palette unit tests).
2. Load unpacked (`chrome://extensions` → Load unpacked → repo root) and open the live page.
3. From the popup — **without opening the Settings sheet** — exercise Play/Pause, Mute, Timestamps, Originals; each label/active state should reflect the page. Then check auto-scroll, Fullscreen (captions only), Refresh (restores play/mute), and the recolor updating live when you change the color.
