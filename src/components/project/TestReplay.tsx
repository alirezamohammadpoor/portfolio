"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** The test's name, for the button's label. */
  name: string;
  /** The film holds its last frame: the slot is full ink. */
  ended: boolean;
  reduceMotion: boolean;
  /** The centred test's <video>, read each frame for the fill. */
  getVideo: () => HTMLVideoElement | null;
  onReplay: () => void;
};

/**
 * The replay slot in the name pill (Figma "Test pill · placement · 11-09",
 * Ali picked C + R3): the slot fills with ink left to right as the test
 * film plays, then holds as an ink disc once it rests on the design; a tap
 * plays it again. The icon draws in difference blend so it reads on both
 * the grey and the ink part of the slot.
 */
export default function TestReplay({ name, ended, reduceMotion, getVideo, onReplay }: Props) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const getVideoRef = useRef(getVideo);
  useEffect(() => {
    getVideoRef.current = getVideo;
  }, [getVideo]);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    if (ended || reduceMotion) {
      fill.style.transform = ended ? "scaleX(1)" : "scaleX(0)";
      return;
    }
    let raf = 0;
    const tick = () => {
      const v = getVideoRef.current();
      const p = v && Number.isFinite(v.duration) && v.duration > 0 ? Math.min(1, v.currentTime / v.duration) : 0;
      fill.style.transform = `scaleX(${p})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [ended, reduceMotion]);

  return (
    <button
      type="button"
      onClick={onReplay}
      aria-label={`Replay A/B test: ${name}`}
      className="relative isolate inline-flex h-7 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-tertiary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.94]"
    >
      <span ref={fillRef} aria-hidden="true" className="absolute inset-0 origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="relative mix-blend-difference"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    </button>
  );
}
