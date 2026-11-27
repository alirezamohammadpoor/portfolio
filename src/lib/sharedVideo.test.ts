import { afterAll, beforeAll, expect, test } from "bun:test";

const realFetch = globalThis.fetch;
let calls: string[] = [];

beforeAll(() => {
  (globalThis as { window?: unknown }).window = globalThis;
  globalThis.fetch = (async (input: string) => {
    calls.push(String(input));
    if (String(input).includes("broken")) return new Response(null, { status: 404 });
    return new Response(new Blob(["clip"], { type: "video/mp4" }));
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
  delete (globalThis as { window?: unknown }).window;
});

test("every copy of a clip shares one download", async () => {
  const { loadVideo, originalSrc, readySrc } = await import("./sharedVideo");
  calls = [];
  const url = "https://cdn.example/a.mp4";
  const [a, b, c] = await Promise.all([loadVideo(url), loadVideo(url), loadVideo(url, true)]);
  expect(calls).toEqual([url]);
  expect(a).toStartWith("blob:");
  expect(b).toBe(a);
  expect(c).toBe(a);
  expect(readySrc(url)).toBe(a);
  expect(originalSrc(a)).toBe(url);
  expect(await loadVideo(url)).toBe(a);
  expect(calls).toEqual([url]);
});

test("a failed download plays from the network, once", async () => {
  const { loadVideo, readySrc } = await import("./sharedVideo");
  calls = [];
  const url = "https://cdn.example/broken.mp4";
  expect(await loadVideo(url)).toBe(url);
  expect(await loadVideo(url)).toBe(url);
  expect(readySrc(url)).toBe(url);
  expect(calls).toEqual([url]);
});
