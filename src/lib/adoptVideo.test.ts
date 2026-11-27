import { describe, expect, test } from "bun:test";
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
