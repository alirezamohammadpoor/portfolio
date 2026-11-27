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
  let cancel = () => {};
  // A clip that is seeking (slide one picking up the home cover's time)
  // counts its first frame at the new time, not the one it decoded first.
  const settle = () => {
    if (!video.seeking) return cb();
    const onSeeked = () => {
      cancel = wait();
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    cancel = () => video.removeEventListener("seeked", onSeeked);
  };
  const wait = (): (() => void) => {
    if (typeof v.requestVideoFrameCallback === "function") {
      const id = v.requestVideoFrameCallback(settle);
      return () => v.cancelVideoFrameCallback?.(id);
    }
    const onData = () => settle();
    const ev = video.seeking ? "seeked" : "loadeddata";
    video.addEventListener(ev, onData, { once: true });
    return () => video.removeEventListener(ev, onData);
  };
  cancel = wait();
  return () => cancel();
}
