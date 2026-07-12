import {
  deriveOverrideColors,
  deriveLiveColor,
  contrastRatio,
  hexToRgba
} from "../../views/common/utilities";

describe("deriveOverrideColors", () => {
  const HEX = /^#[0-9a-f]{6}$/;

  test("returns the full projector palette keyed for glossa.live's theme vars", () => {
    const p = deriveOverrideColors("#82663a");
    expect(Object.keys(p).sort()).toEqual(
      ["bg", "bgElev", "bgSheet", "border", "segTrack", "text", "textSecondary", "live"].sort()
    );
  });

  test("uses the picked color verbatim as the base background", () => {
    expect(deriveOverrideColors("#82663a").bg).toBe("#82663a");
    expect(deriveOverrideColors("#123456").bg).toBe("#123456");
  });

  test("elevated surfaces are valid hex and lighter than the base", () => {
    const p = deriveOverrideColors("#82663a");
    expect(p.bgElev).toMatch(HEX);
    expect(p.bgSheet).toMatch(HEX);
    // lightness raised → higher summed channel value than the base
    const lum = (h: string) =>
      parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(lum(p.bgElev)).toBeGreaterThan(lum(p.bg));
    expect(lum(p.bgSheet)).toBeGreaterThanOrEqual(lum(p.bgElev));
  });

  test("overlay tints are stable and text defaults to white", () => {
    const p = deriveOverrideColors("#0044ff");
    expect(p.segTrack).toBe("rgba(255, 255, 255, 0.09)");
    expect(p.border).toBe("rgba(255, 255, 255, 0.12)");
    expect(p.text).toBe("#ffffff");
    expect(p.textSecondary).toBe("rgba(255, 255, 255, 0.68)");
  });

  test("applies a custom text color to text and derives the secondary from it", () => {
    const p = deriveOverrideColors("#82663a", "#ffe066");
    expect(p.text).toBe("#ffe066");
    expect(p.textSecondary).toBe("rgba(255, 224, 102, 0.68)");
  });

  test.each([["#000000"], ["#ffffff"], ["#ff0000"]])(
    "stays within valid hex bounds for extreme input %s",
    hex => {
      const p = deriveOverrideColors(hex);
      expect(p.bgElev).toMatch(HEX);
      expect(p.bgSheet).toMatch(HEX);
    }
  );

  test("live color is a valid green hex included in the palette", () => {
    const p = deriveOverrideColors("#82663a");
    expect(p.live).toMatch(HEX);
    expect(p.live).toBe(deriveLiveColor("#82663a"));
  });
});

describe("deriveLiveColor", () => {
  // The regression the feature fixes: the site's fixed green collides with a
  // mid-lightness background, so the derived green must beat it on contrast.
  test.each([["#82663a"], ["#0c0c0e"], ["#faf9f7"], ["#3b5bdb"]])(
    "beats the site default #16a34a on contrast against %s",
    bg => {
      const derived = deriveLiveColor(bg);
      expect(contrastRatio(derived, bg)).toBeGreaterThan(contrastRatio("#16a34a", bg));
    }
  );

  test("picks a bright green on a dark bg and a deep green on a light bg", () => {
    const onDark = deriveLiveColor("#0c0c0e");
    const onLight = deriveLiveColor("#faf9f7");
    const lightness = (h: string) =>
      (Math.max(...[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))) +
        Math.min(...[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)))) /
      2;
    expect(lightness(onDark)).toBeGreaterThan(lightness(onLight));
  });
});
