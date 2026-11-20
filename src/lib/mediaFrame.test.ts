import { describe, expect, test } from "bun:test";
import {
  FRAME_PRESET,
  hasSizeOverride,
  resolveCoverFrame,
  resolveFrame,
  resolveLandingFrame,
} from "./mediaFrame";

const project = {
  palette: [{ hex: "#111111" }, { hex: "#bedcaa" }],
  mediaBackground: { colour: "2" },
};

describe("resolveFrame", () => {
  test("media with no background anywhere is flush at full size", () => {
    expect(resolveFrame(null, null, "landscape")).toEqual({
      background: null,
      fit: "flush",
      size: 100,
    });
  });

  test("an item on Project default takes the project's background", () => {
    const frame = resolveFrame({ colour: "default" }, project, "landscape");
    expect(frame.background?.colour).toBe("#bedcaa");
    expect(frame.fit).toBe("laptop");
    expect(frame.size).toBe(FRAME_PRESET.laptop);
  });

  test("an item's own swatch and hex win over the project default", () => {
    expect(resolveFrame({ colour: "1" }, project, "landscape").background?.colour).toBe("#111111");
    expect(
      resolveFrame({ colour: "1", hex: "#abc" }, project, "landscape").background?.colour,
    ).toBe("#abc");
  });

  test("a bad hex or a missing swatch gives no colour", () => {
    expect(resolveFrame({ colour: "9" }, { palette: [] }, "landscape").background).toBeNull();
    expect(
      resolveFrame({ colour: "1", hex: "red" }, { palette: [{ hex: "nope" }] }, "landscape")
        .background,
    ).toBeNull();
  });

  test("a phone recording always stands in the phone box", () => {
    expect(resolveFrame(null, null, "portrait")).toMatchObject({
      fit: "phone",
      size: FRAME_PRESET.phone,
    });
  });

  test("a size inside 20–100 overrides the preset, outside it is ignored", () => {
    expect(resolveFrame({ colour: "1", size: 60 }, project, "landscape").size).toBe(60);
    expect(resolveFrame({ colour: "1", size: 5 }, project, "landscape").size).toBe(
      FRAME_PRESET.laptop,
    );
    expect(hasSizeOverride({ size: 100 })).toBe(true);
    expect(hasSizeOverride({ size: 101 })).toBe(false);
    expect(hasSizeOverride(null)).toBe(false);
  });

  test("image opacity defaults to 60%", () => {
    const bg = resolveFrame({ colour: "1", image: { asset: {} } }, project, "landscape").background;
    expect(bg?.imageOpacity).toBe(0.6);
  });
});

describe("resolveCoverFrame", () => {
  test("ignores a saved fit so the cover keeps its default width", () => {
    expect(resolveCoverFrame({ colour: "1", fit: "phone" }, project).fit).toBe("laptop");
  });
});

describe("resolveLandingFrame", () => {
  test("never lands in a phone box, since the clone morphs from a 16:10 cover", () => {
    expect(resolveLandingFrame({ colour: "1", fit: "phone" }, project)).toMatchObject({
      fit: "laptop",
      size: FRAME_PRESET.laptop,
    });
    expect(resolveLandingFrame({ fit: "phone" }, { palette: [] })).toMatchObject({
      fit: "flush",
      size: 100,
    });
  });
});
