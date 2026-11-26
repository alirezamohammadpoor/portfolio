"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import HomeReel, { type IntroBuilder } from "@/components/home/HomeReel";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import CarouselHome from "@/components/lab/home-layouts/CarouselHome";
import { LAB_CLIPS, type Contact } from "@/components/lab/home-layouts/shared";
import { dropIntro, ringIntro } from "./intros";
import "@/components/lab/home-layouts/proto-picker.css";

interface Variant {
  name: string;
  /** Unset: the home's own ring and dive. */
  build?: IntroBuilder;
}

/** The ring's cards use the lab's re-recorded covers too. */
function heroOverride(project: PROJECTS_QUERY_RESULT[number]) {
  const lab = LAB_CLIPS[project.slug?.current ?? ""];
  if (!lab) return undefined;
  return lab.still ? { src: lab.poster, still: true } : { src: lab.src };
}

// Ordered by how far the cards travel, biggest first.
const VARIANTS: Variant[] = [
  { name: "Original" },
  { name: "Ring", build: ringIntro },
  { name: "Drop", build: dropIntro },
];

/**
 * Entries for the carousel home behind Emil Kowalski's prototype
 * picker. An entry only plays on a full load, so picking one (1-3, arrows)
 * reloads the page with `?v=N`; R plays the current one again.
 */
export default function HomeIntroLab({
  projects,
  contact,
  initial,
  count,
}: {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  initial: number;
  /** `?n=`: the projects repeated up to this many (6, 10, 15), to see how
   *  an intro copes with a longer list. The ring reads the same param. */
  count: number;
}) {
  // Repeats get their own ids, so each copy is its own cover on the page.
  const page =
    count > projects.length
      ? Array.from({ length: count }, (_, i) => {
          const p = projects[i % projects.length];
          return i < projects.length ? p : { ...p, _id: `${p._id}~${i}` };
        })
      : projects;
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
        {/* The page first: its ref is set before the reel's layout effect
            looks for the covers (the reel renders into a portal anyway). */}
        <CarouselHome projects={page} contact={contact} rootRef={rootRef} />
        <HomeReel
          projects={projects}
          pageRef={rootRef}
          coverSizes={page.map(() => "50vw")}
          build={variant.build}
          heroOverride={heroOverride}
        />
      </div>
      <Picker current={current} onSelect={select} count={count || projects.length} />
    </>
  );
}

const COUNTS = [6, 10, 15];

/** Reloads with `?n=`; the live count drops the param. */
function setCount(n: number, live: boolean) {
  const url = new URL(location.href);
  if (live) url.searchParams.delete("n");
  else url.searchParams.set("n", String(n));
  location.assign(url.toString());
}

function Picker({
  current,
  onSelect,
  count,
}: {
  current: number;
  onSelect: (i: number) => void;
  count: number;
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
      {/* How many projects (N): today's list, or repeats up to 10 and 15. */}
      <button
        type="button"
        className="proto-picker-item"
        aria-label="Number of projects"
        onClick={() => {
          const next = COUNTS[(COUNTS.findIndex((c) => c >= count) + 1) % COUNTS.length];
          setCount(next, next <= 6);
        }}
      >
        {count} projects
      </button>
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
