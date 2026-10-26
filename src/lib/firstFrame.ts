/**
 * Call `cb` once `video` has actually presented a frame. `loadeddata` and
 * `loadedmetadata` both fire while a <video> can still paint black for a few
 * frames, which shows the moment the clone covering it is removed.
 */
export function onFirstVideoFrame(video: HTMLVideoElement, cb: () => void): () => void {
  const v = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
    cancelVideoFrameCallback?: (handle: number) => void;
  };
  if (typeof v.requestVideoFrameCallback === "function") {
    const id = v.requestVideoFrameCallback(() => cb());
    return () => v.cancelVideoFrameCallback?.(id);
  }
  const onData = () => cb();
  video.addEventListener("loadeddata", onData, { once: true });
  return () => video.removeEventListener("loadeddata", onData);
}
