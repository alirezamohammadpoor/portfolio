import { afterAll, describe, expect, test } from "bun:test";
import { handoffTime } from "./adoptVideo";

const url = "https://cdn.sanity.io/files/v3d28bxo/production/abc.mp4";
const base = { sourceTime: 4, sourceSrc: url, inPlace: false };

describe("handoffTime", () => {
  test("same file starts on the frame the cover was on", () => {
    expect(handoffTime(base, url, 10)).toBe(4);
  });
  test("wraps a time past the end of a looping clip", () => {
    expect(handoffTime({ ...base, sourceTime: 10.5 }, url, 10)).toBeCloseTo(0.5);
  });
  test("a different file starts from the beginning", () => {
    expect(handoffTime(base, url.replace("abc", "def"), 10)).toBeNull();
  });
  test("in place (project to project) is left to the adopted element", () => {
    expect(handoffTime({ ...base, inPlace: true }, url, 10)).toBeNull();
  });
  test("unknown time or duration", () => {
    expect(handoffTime({ ...base, sourceTime: null }, url, 10)).toBeNull();
    expect(handoffTime(base, url, NaN)).toBeNull();
  });
});

describe("handoffTime with a shared blob", () => {
  const realFetch = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = realFetch;
    delete (globalThis as { window?: unknown }).window;
  });
  test("a cover playing its clip as a blob still counts as the same file", async () => {
    (globalThis as { window?: unknown }).window = globalThis;
    globalThis.fetch = (async () =>
      new Response(new Blob(["clip"], { type: "video/mp4" }))) as unknown as typeof fetch;
    const { loadVideo } = await import("./sharedVideo");
    const blob = await loadVideo(url);
    expect(blob).toStartWith("blob:");
    expect(handoffTime({ ...base, sourceSrc: blob }, url, 10)).toBe(4);
    expect(handoffTime(base, blob, 10)).toBe(4);
  });
});
