function $(selector, parentOrText) {
  if (typeof parentOrText === "string") {
    return $$(selector).find(el => el.innerText === parentOrText);
  }
  return (parentOrText || document).querySelector(selector);
}

function $$(selector, parent) {
  return [...(parent || document).querySelectorAll(selector)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

/**
 *
 * @param fn
 * @param delay
 * @returns {(function(): void)|*}
 */
function debounce(fn, delay) {
  let timer = null;
  return function () {
    const context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

/**
 *
 * @param {String} selector
 * @param {Number} timeout
 * @param {Number} retryInterval
 * @returns {Promise<null | HTMLElement>}
 */
function waitElement(selector, timeout = 30000, retryInterval = 100) {
  return new Promise((resolve, reject) => {
    let el = $(selector);
    if (el) {
      resolve(el);
      return;
    }
    const endTime = Date.now() + timeout;
    const refreshIntervalId = setInterval(() => {
      el = $(selector);
      if (el) {
        clearInterval(refreshIntervalId);
        resolve(el);
      } else if (endTime < Date.now()) {
        clearInterval(refreshIntervalId);
        //reject("timeout");
        resolve(null);
      }
    }, retryInterval);
  });
}

function getInnerToClipboard(html) {
  return new Promise(resolve => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.onload = function () {
      const text = iframe.contentWindow.document.body.innerText;
      resolve(text);
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    };
  });
}

function copyToClipboard(text) {
  const iframe = document.createElement("iframe");
  iframe.onload = function () {
    const doc = iframe.contentWindow.document;
    execCopy(text, doc);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 100);
  };
  document.body.appendChild(iframe);
}

function execCopy(text, doc) {
  if (doc.queryCommandSupported && doc.queryCommandSupported("copy")) {
    const textarea = doc.createElement("textarea");
    textarea.textContent = text;
    // Prevent scrolling to bottom of page in MS Edge.
    textarea.style.position = "fixed";
    doc.body.appendChild(textarea);
    textarea.select();
    try {
      // Security exception may be thrown by some browsers.
      return doc.execCommand("copy");
    } catch (ex) {
      //<debug>
      console.warn("Copy to clipboard failed.", ex);
      //</debug>
      return false;
    } finally {
      doc.body.removeChild(textarea);
    }
  }
}

function download(text, name, type) {
  const anchor = document.createElement("a");
  anchor.className = "download-js-link";
  anchor.id = "download-html";
  anchor.innerHTML = "downloading...";
  anchor.style.display = "none";
  document.body.appendChild(anchor);

  const file = new Blob([text], { type: type });
  anchor.href = URL.createObjectURL(file);
  anchor.download = name;
  anchor.click();
  document.body.removeChild(anchor);
}

function maskElement(element) {
  element.classList.add("extension-loading-mask");
}
function unmaskElement(element) {
  element.classList.remove("extension-loading-mask");
}

// ── Color helpers ────────────────────────────────────────────────────────────
// Used to derive the projector-cast override palette from a single primary
// background color picked by the user (see views/glossa/overrides.css defaults).

/**
 * Convert a "#rrggbb" hex color to [hue (0-360), saturation %, lightness %].
 * @param {String} hex
 * @returns {[number, number, number]}
 */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

/**
 * Convert HSL (hue 0-360, saturation %, lightness %) back to "#rrggbb".
 * @param {Number} h
 * @param {Number} s
 * @param {Number} l
 * @returns {String}
 */
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = v =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Derive the projector-cast override palette from a single primary background
 * color. These keys map onto glossa.live's own theme CSS variables (see
 * views/glossa/overrides.css): `bg` → --bg, `bgElev` → --bg-elev (control
 * buttons), `bgSheet` → --bg-sheet (settings sheet), etc. The elevated surfaces
 * are lightened slightly from the base so buttons and the sheet lift off the
 * background; the overlay tints (track/border) are translucent whites that read
 * consistently over any hue.
 * @param {String} hex primary background color, e.g. "#82663a"
 * @returns {{bg:string, bgElev:string, bgSheet:string, segTrack:string, border:string, text:string, textSecondary:string}}
 */
function deriveOverrideColors(hex) {
  const [h, s, l] = hexToHsl(hex);
  const clamp = v => Math.max(0, Math.min(100, v));
  return {
    bg: hex,
    bgElev: hslToHex(h, clamp(s + 2), clamp(l + 7)),
    bgSheet: hslToHex(h, clamp(s + 2), clamp(l + 9)),
    segTrack: "rgba(255, 255, 255, 0.09)",
    border: "rgba(255, 255, 255, 0.12)",
    text: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.68)"
  };
}

// Export pure helpers for unit tests (Node/Jest). The browser never defines
// `module`, so this block is a no-op there.
if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = { hexToHsl, hslToHex, deriveOverrideColors, debounce, asyncForEach, sleep };
}
