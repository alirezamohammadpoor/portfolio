import { describe, expect, test } from "bun:test";
import { handoffTime } from "./adoptVideo";

const url = "https://cdn.sanity.io/files/v3d28bxo/production/abc.mp4";
const base = { sourceTime: 4, sourceSrc: url, startedAt: 1000, inPlace: false };

describe("handoffTime", () => {
  test("same file picks up where the cover was plus the morph time", () => {
    expect(handoffTime(base, url, 10, 1600)).toBeCloseTo(4.6);
  });
  test("wraps around a looping clip", () => {
    expect(handoffTime({ ...base, sourceTime: 9.8 }, url, 10, 1500)).toBeCloseTo(0.3);
  });
  test("a different file starts from the beginning", () => {
    expect(handoffTime(base, url.replace("abc", "def"), 10, 1600)).toBeNull();
  });
  test("in place (project to project) is left to the adopted element", () => {
    expect(handoffTime({ ...base, inPlace: true }, url, 10, 1600)).toBeNull();
  });
  test("unknown time or duration", () => {
    expect(handoffTime({ ...base, sourceTime: null }, url, 10, 1600)).toBeNull();
    expect(handoffTime(base, url, NaN, 1600)).toBeNull();
  });
});
