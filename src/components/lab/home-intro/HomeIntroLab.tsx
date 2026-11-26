"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import HomeReel, { type IntroBuilder } from "@/components/home/HomeReel";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import CarouselHome from "@/components/lab/home-layouts/CarouselHome";
import type { Contact } from "@/components/lab/home-layouts/shared";
import { dropIntro, lineIntro, ovalIntro, stackIntro } from "./intros";
import "@/components/lab/home-layouts/proto-picker.css";

interface Variant {
  name: string;
  /** Unset: the home's own ring and dive. */
  build?: IntroBuilder;
}

// Ordered by how far the cards travel, biggest first.
const VARIANTS: Variant[] = [
  { name: "Original" },
  { name: "Oval", build: ovalIntro },
  { name: "Stack", build: stackIntro },
  { name: "Line", build: lineIntro },
  { name: "Drop", build: dropIntro },
];

/**
 * Five entries for the carousel home behind Emil Kowalski's prototype
 * picker. An entry only plays on a full load, so picking one (1-5, arrows)
 * reloads the page with `?v=N`; R plays the current one again.
 */
export default function HomeIntroLab({
  projects,
  contact,
  initial,
}: {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  initial: number;
}) {
  const current = initial >= 1 && initial <= VARIANTS.length ? initial - 1 : 0;
  const variant = VARIANTS[current];
  const rootRef = useRef<HTMLDivElement>(null);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    location.assign(url.toString());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") select(current);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  return (
    <>
      <p className="px-margin pt-12 text-h3 desktop:hidden">
        These intros are for the laptop home. Open this page in a window at least 1200 px wide.
      </p>
      <div className="hidden desktop:block">
        <HomeReel
          projects={projects}
          pageRef={rootRef}
          coverSizes={projects.map(() => "50vw")}
          build={variant.build}
        />
        <CarouselHome projects={projects} contact={contact} rootRef={rootRef} />
      </div>
      <Picker current={current} onSelect={select} />
    </>
  );
}

function Picker({ current, onSelect }: { current: number; onSelect: (i: number) => void }) {
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
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        onClick={() => onSelect(current)}
      >
        ↻
      </button>
    </nav>
  );
}
