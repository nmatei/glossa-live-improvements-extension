import { deriveOverrideColors } from "../../views/common/utilities";

describe("deriveOverrideColors", () => {
  const HEX = /^#[0-9a-f]{6}$/;

  test("returns the full projector palette keyed for glossa.live's theme vars", () => {
    const p = deriveOverrideColors("#82663a");
    expect(Object.keys(p).sort()).toEqual(
      ["bg", "bgElev", "bgSheet", "border", "segTrack", "text", "textSecondary"].sort()
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

  test("overlay tints and text are stable regardless of the picked color", () => {
    const p = deriveOverrideColors("#0044ff");
    expect(p.segTrack).toBe("rgba(255, 255, 255, 0.09)");
    expect(p.border).toBe("rgba(255, 255, 255, 0.12)");
    expect(p.text).toBe("#ffffff");
    expect(p.textSecondary).toBe("rgba(255, 255, 255, 0.68)");
  });

  test.each([["#000000"], ["#ffffff"], ["#ff0000"]])(
    "stays within valid hex bounds for extreme input %s",
    hex => {
      const p = deriveOverrideColors(hex);
      expect(p.bgElev).toMatch(HEX);
      expect(p.bgSheet).toMatch(HEX);
    }
  );
});
