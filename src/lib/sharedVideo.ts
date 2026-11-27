import { useEffect, useSyncExternalStore } from "react";

/**
 * One download per clip, however many <video>s show it.
 *
 * The home shows every cover twice (the carousel repeats its set to loop)
 * and the intro plays a third copy, and each <video> fetched the file on its
 * own: about 33 MB on a first visit for 11 MB of covers, all at once, so the
 * covers waited grey while three copies of each raced (Ali, 11-27). Here a
 * clip is fetched once, in order, kept as a blob for the life of the tab,
 * and every element that shows it plays the same blob: no second request,
 * a seamless loop, and a Work panel or project page that opens on a cover
 * the home already loaded has its frame at once.
 *
 * Positions, adoption and the morph compare the clip's own URL, never the
 * blob's: `originalSrc` maps one back.
 */

// The covers come in the order they are asked for, two at a time, so the
// first ones in the row are not slowed down by the last ones.
const CONCURRENCY = 2;

const blobs = new Map<string, string>();
const originals = new Map<string, string>();
const loading = new Map<string, Promise<string>>();
const queue: { url: string; start: () => void }[] = [];
const listeners = new Set<() => void>();
let running = 0;

function emit() {
  listeners.forEach((l) => l());
}

function next() {
  while (running < CONCURRENCY && queue.length) {
    running += 1;
    queue.shift()!.start();
  }
}

/** A reader asked to save data, or the tab has no fetch: play from the network. */
function shouldStream() {
  if (typeof window === "undefined" || typeof fetch !== "function") return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(c?.saveData);
}

/**
 * Starts (or joins) the one download of `url`. Resolves to the blob URL, or
 * to `url` itself if the fetch fails, so a caller always gets something to
 * play. `first` puts it at the front of the queue.
 */
export function loadVideo(url: string, first = false): Promise<string> {
  const done = blobs.get(url);
  if (done) return Promise.resolve(done);
  const inFlight = loading.get(url);
  if (inFlight) {
    if (first) {
      const at = queue.findIndex((q) => q.url === url);
      if (at > 0) queue.unshift(...queue.splice(at, 1));
    }
    return inFlight;
  }
  if (shouldStream()) return Promise.resolve(url);
  const p = new Promise<string>((resolve) => {
    const start = () => {
      // Low priority: the stills (images) go first on a busy phone
      // connection; a clip only replaces a still that is already up.
      fetch(url, { priority: "low" } as RequestInit)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.blob();
        })
        .then((b) => {
          const blob = URL.createObjectURL(b);
          blobs.set(url, blob);
          originals.set(blob, url);
          resolve(blob);
        })
        .catch(() => {
          // Play it from the network instead, and don't try again.
          blobs.set(url, url);
          resolve(url);
        })
        .finally(() => {
          loading.delete(url);
          running -= 1;
          emit();
          next();
        });
    };
    if (first) queue.unshift({ url, start });
    else queue.push({ url, start });
  });
  loading.set(url, p);
  next();
  return p;
}

/** Queues every clip in `urls`, in order. */
export function warmVideos(urls: (string | null | undefined)[]) {
  urls.forEach((u) => u && loadVideo(u));
}

/** The clip's blob if it is already in, else its URL: for players that
 *  should not wait (they stream the file instead). */
export function readySrc(url: string): string {
  return blobs.get(url) ?? url;
}

/** The clip URL a `src` stands for: a blob maps back to its file. */
export function originalSrc(src: string): string {
  return originals.get(src) ?? src;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * The src to give a <video> for `url`: undefined until the one download is
 * in (show the still meanwhile), then the blob. Kicks the download off.
 * Data saver or a failed fetch gives the URL itself. A clip with no still
 * (`hasStill` false) streams from its URL instead of waiting on a grey box,
 * unless its blob is already in. `start` false holds the download back
 * (the caller's still has not loaded yet).
 */
export function useSharedVideo(
  url: string | null,
  first = false,
  hasStill = true,
  start = true,
): string | undefined {
  const src = useSyncExternalStore(
    subscribe,
    () => (url ? (blobs.get(url) ?? (shouldStream() || !hasStill ? url : undefined)) : undefined),
    () => undefined,
  );
  useEffect(() => {
    if (url && hasStill && start) void loadVideo(url, first);
  }, [url, first, hasStill, start]);
  return src;
}
