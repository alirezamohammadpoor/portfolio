"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import HomeReel from "@/components/home/HomeReel";
import { ringIntro } from "./ringIntro";
import { getReelState, setReelState } from "@/lib/reel";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import {
  ClipsContext,
  FrameContext,
  labHero,
  type Contact,
  type FrameMode,
  type VariantProps,
} from "./shared";
import IndexHome from "./IndexHome";
import SplitHome from "./SplitHome";
// The carousel is the live home now; this lab shows it with the Sanity covers.
import CarouselHome from "@/components/home/CarouselHome";
import "./proto-picker.css";

interface Variant {
  name: string;
  Component: (props: VariantProps) => React.ReactNode;
  /** The `sizes` each cover asks for, so the ring's heroes load the same file. */
  sizes: string;
  /** How the entry ring ends on this layout. */
  landing?: "dive" | "settle";
}

const VARIANTS: Variant[] = [
  { name: "Index full", Component: (p) => <IndexHome {...p} bleed />, sizes: "100vw" },
  { name: "Index window", Component: (p) => <IndexHome {...p} bleed={false} />, sizes: "90vw" },
  { name: "Split", Component: SplitHome, sizes: "66vw" },
  { name: "Carousel", Component: CarouselHome, sizes: "50vw", landing: "settle" },
];

interface Props {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  /** `?v`, 1-based. */
  initial: number;
  /** `?frame=flush` starts on flush windows. */
  initialFrame: FrameMode;
  /** `?clips=old` starts on the Sanity covers instead of the re-shoot. */
  initialNewClips: boolean;
}

/**
 * Laptop home layouts, behind Emil Kowalski's prototype picker. The entry
 * ring plays on a fresh load (or with `&reel`, which the replay button
 * adds) and lands on the chosen layout's covers, exactly as on the home.
 * Switching remounts the layout so its entrance runs again; the ring only
 * plays on a full load.
 */
export default function HomeLayoutsLab({
  projects,
  contact,
  initial,
  initialFrame,
  initialNewClips,
}: Props) {
  const [newClips, setNewClips] = useState(initialNewClips);
  const toggleClips = useCallback(() => {
    setNewClips((on) => {
      const url = new URL(location.href);
      if (on) url.searchParams.set("clips", "old");
      else url.searchParams.delete("clips");
      history.replaceState(history.state, "", url);
      return !on;
    });
  }, []);
  const [frame, setFrame] = useState<FrameMode>(initialFrame);
  const toggleFrame = useCallback(() => {
    setFrame((f) => {
      const next = f === "inset" ? "flush" : "inset";
      const url = new URL(location.href);
      if (next === "flush") url.searchParams.set("frame", "flush");
      else url.searchParams.delete("frame");
      history.replaceState(history.state, "", url);
      return next;
    });
  }, []);
  const rootRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(() =>
    initial >= 1 && initial <= VARIANTS.length ? initial - 1 : 0,
  );
  const [mountKey, setMountKey] = useState(0);
  const variant = VARIANTS[current];

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    // The ring landed on the layout before this one: the next mount plays
    // its own entrance (covers fade up, the carousel glides in).
    if (getReelState() === "done") setReelState("off");
    setCurrent(i);
    setMountKey((k) => k + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    url.searchParams.delete("reel");
    history.replaceState(history.state, "", url);
    window.scrollTo(0, 0);
  }, []);

  // Replay = a full load with the ring forced on, so the entry lands on
  // this layout again.
  const replay = useCallback(() => {
    const url = new URL(location.href);
    url.searchParams.set("v", String(current + 1));
    url.searchParams.set("reel", "");
    location.assign(url.toString().replace(/reel=(&|$)/, "reel$1"));
  }, [current]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
      else if (e.key === "f" || e.key === "F") toggleFrame();
      else if (e.key === "c" || e.key === "C") toggleClips();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select, replay, toggleFrame, toggleClips]);

  const { Component } = variant;
  return (
    <>
      <p className="px-margin pt-12 text-h3 desktop:hidden">
        These home layouts are for the laptop. Open this page in a window at least 1200 px wide; the
        phone keeps today&apos;s single column.
      </p>
      <FrameContext.Provider value={frame}>
        <ClipsContext.Provider value={newClips}>
          <div className="hidden desktop:block">
            <HomeReel
              projects={projects}
              pageRef={rootRef}
              coverSizes={projects.map(() => variant.sizes)}
              build={ringIntro(variant.landing)}
              heroOverride={newClips && variant.Component !== CarouselHome ? labHero : undefined}
            />
            <Component
              key={`${current}-${mountKey}`}
              projects={projects}
              contact={contact}
              rootRef={rootRef}
            />
          </div>
        </ClipsContext.Provider>
      </FrameContext.Provider>
      <Picker
        newClips={newClips}
        onClips={toggleClips}
        current={current}
        onSelect={select}
        onReplay={replay}
        frame={frame}
        onFrame={toggleFrame}
      />
    </>
  );
}

function Picker({
  current,
  onSelect,
  onReplay,
  frame,
  onFrame,
  newClips,
  onClips,
}: {
  current: number;
  onSelect: (i: number) => void;
  onReplay: () => void;
  frame: FrameMode;
  onFrame: () => void;
  newClips: boolean;
  onClips: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const move = () => {
      const el = itemsRef.current[current];
      const hl = highlightRef.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav ref={navRef} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((v, i) => (
        <button
          key={v.name}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {v.name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      {/* The window switch (F): inset or flush recordings. */}
      <button
        type="button"
        className="proto-picker-item"
        aria-label="Window: inset or flush (F)"
        onClick={onFrame}
      >
        {frame === "inset" ? "Inset" : "Flush"}
      </button>
      {/* The covers (C): the 11-26 re-shoot (Zone 2, Sania) or the Sanity files. */}
      <button
        type="button"
        className="proto-picker-item"
        aria-label="Covers: new or old (C)"
        onClick={onClips}
      >
        {newClips ? "New clips" : "Old clips"}
      </button>
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        onClick={onReplay}
      >
        ↻
      </button>
    </nav>
  );
}
