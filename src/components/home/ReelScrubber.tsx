"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { setIntroState } from "@/lib/intro";
import { setReelState } from "@/lib/reel";

/** `?reel=scrub`: drag through the reel, play it, or hand over to the page. */
export default function Scrubber({ tl }: { tl: gsap.core.Timeline }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = tl.duration();
  const lenis = useLenis();

  useEffect(() => {
    tl.eventCallback("onUpdate", () => setT(tl.time()));
    tl.eventCallback("onComplete", () => setPlaying(false));
    return () => {
      tl.eventCallback("onUpdate", null);
      tl.eventCallback("onComplete", null);
    };
  }, [tl]);

  return (
    <div className="fixed inset-x-4 top-14 z-[70] flex items-center gap-3 bg-primary px-4 py-3 text-sub text-bg">
      <button
        type="button"
        className="w-12 text-left"
        onClick={() => {
          if (playing) tl.pause();
          else tl.play(tl.progress() >= 1 ? 0 : undefined);
          setPlaying(!playing);
        }}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={total}
        step={0.01}
        value={t}
        onChange={(e) => {
          const v = Number(e.target.value);
          // Events on: the ring renders from its tweens' onUpdate.
          tl.pause().seek(v, false);
          setT(v);
          setPlaying(false);
        }}
        className="flex-1"
        aria-label="Reel time"
      />
      <span className="w-20 text-right tabular-nums">
        {t.toFixed(2)} / {total.toFixed(2)}
      </span>
      <button
        type="button"
        onClick={() => {
          // The same hand-over as finish(): Lenis was stopped for the reel.
          tl.progress(1);
          setIntroState("done");
          lenis?.start();
          setReelState("done");
          ScrollTrigger.refresh();
        }}
      >
        Done
      </button>
    </div>
  );
}
