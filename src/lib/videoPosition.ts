/**
 * Remembers where a video was, per source URL, for the life of the page.
 * Players that unmount their <video> (the journal popup, the home cover
 * slides) would otherwise restart from 0 every time they come back.
 */
const positions = new Map<string, number>();

export function saveVideoPosition(video: HTMLVideoElement, key: string) {
  if (video.ended) positions.delete(key);
  else if (video.currentTime > 0.25) positions.set(key, video.currentTime);
  // A fresh element (near 0) keeps what an earlier one saved: React's dev
  // StrictMode unmounts every new player once right after mounting, and
  // that save used to wipe the position before the restore could read it.
}

/** Seeks to the saved time once metadata is known. No-op without one. */
export function restoreVideoPosition(video: HTMLVideoElement, key: string) {
  const t = positions.get(key);
  if (t === undefined || !video.duration || t >= video.duration - 0.25) return;
  if (Math.abs(video.currentTime - t) > 0.25) video.currentTime = t;
}
