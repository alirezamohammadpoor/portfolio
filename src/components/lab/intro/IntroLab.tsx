"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/lib/viewTransitions";
import { ease, prefersReducedMotion } from "@/lib/motion";
import "../home-layouts/proto-picker.css";

/**
 * /lab/intro: home intros (Ali 11-26). Round 1 tried five ideas from
 * annnimate.com's Reveal Kit (Count, Flash, Mosaic, Cut, Compose; in git at
 * 8845aa8). Ali kept Flash, asked for it slower so the projects can be seen,
 * and parked Compose for films (./compose.tsx). Round 2 is Flash variations.
 *
 * Picker: keys 1-5 or arrows switch, R replays. Any wheel, key or press on
 * the page skips to the end.
 */

const STATEMENT =
  "Frontend developer at the intersection of product and design. Currently at TRY Stockholm.";

const W = "/lab/project-window";

// The 1440 cover set (re-recorded 11-26, not in Sanity yet): films for the
// four store projects, stills for TRY Skills and DevOps.
const PROJECTS = [
  {
    slug: "zone-2",
    title: "Zone 2",
    video: `${W}/zone2-cover.mp4`,
    poster: `${W}/zone2-cover-poster.jpg`,
  },
  {
    slug: "sania-d-mina",
    title: "Sania D'mina",
    video: `${W}/sania-cover.mp4`,
    poster: `${W}/sania-cover-poster.jpg`,
  },
  {
    slug: "paul-and-friends",
    title: "Paul & Friends",
    video: `${W}/pnf-cover.mp4`,
    poster: `${W}/pnf-cover-poster.jpg`,
  },
  {
    slug: "stronger",
    title: "Stronger",
    video: `${W}/stronger-cover.mp4`,
    poster: `${W}/stronger-cover-poster.jpg`,
  },
  { slug: "tryskills", title: "TRY Skills", poster: "/lab/intro/tryskills.jpg" },
  { slug: "try-devops", title: "TRY DevOps", poster: "/lab/intro/try-devops.jpg" },
] as const;

const poster = (slug: string) => PROJECTS.find((p) => p.slug === slug)?.poster ?? "";

type Builder = (tl: gsap.core.Timeline, q: (s: string) => HTMLElement[], root: HTMLElement) => void;

interface Variant {
  name: string;
  overlay: () => React.ReactNode;
  build: Builder;
}

/* ------------------------------------------------------------------ */
/* Flash, round 2 (Ali 11-26): the work flashes round a word in the     */
/* centre, then project 1 is left in its slot and the page comes up.    */
/* Round 1 was too fast; these slow it down so the projects can be seen. */
/* ------------------------------------------------------------------ */

type Cell = [col: number, row: number];

interface FlashOpts {
  name: string;
  /** Grid and cell order, laptop and phone. The word's cell stays clear. */
  laptop: { cols: number; rows: number; cells: Cell[] };
  phone: { cols: number; rows: number; cells: Cell[] };
  /** Project index shown by each flash. */
  seq: number[];
  /** Flashes that come up together. */
  group?: number;
  /** Seconds between groups. */
  step: number;
  /** Seconds a flash stays up (ignored when they pile). */
  hold: number;
  /** Soft fade in and out; 0 cuts. */
  fade?: number;
  /** Image width as a share of its cell. */
  size: number;
  /** "craft" cycles the craft words, "titles" names each project. */
  words: "craft" | "titles";
  captions?: boolean;
  /** Flashes stay up and pile, then clear together. */
  pile?: boolean;
  /** Pause on the full frame before the landing. */
  endHold?: number;
}

const CRAFT = ["Product", "Design", "Frontend"];
const CAPTION = 22;

// 6 x 4 for the round-1 reference, the centre band left clear.
const GRID_6x4: Cell[] = [
  [0, 0],
  [4, 3],
  [5, 1],
  [1, 3],
  [3, 0],
  [0, 2],
  [5, 3],
  [2, 0],
  [4, 0],
  [1, 1],
  [5, 2],
  [0, 3],
];
// 3 x 3 round the centre, each pair in opposite cells.
const GRID_3x3: Cell[] = [
  [0, 0],
  [2, 2],
  [2, 0],
  [0, 2],
  [1, 0],
  [1, 2],
  [0, 1],
  [2, 1],
];
// Phone: 2 x 5, the middle row left for the word, pairs opposite.
const GRID_2x5: Cell[] = [
  [0, 0],
  [1, 4],
  [1, 0],
  [0, 4],
  [0, 1],
  [1, 3],
  [1, 1],
  [0, 3],
];
const PHONE = { cols: 2, rows: 5, cells: GRID_2x5 };
const REST = [1, 2, 3, 4, 5];

function makeFlash(o: FlashOpts): Variant {
  const group = o.group ?? 1;
  const fade = o.fade ?? 0;
  const labels = o.words === "titles" ? o.seq.map((p) => PROJECTS[p].title) : CRAFT;
  return {
    name: o.name,
    overlay: () => (
      <div data-ov className="fixed inset-0 z-[100]">
        <div data-bg className="absolute inset-0 bg-[#f6f6f6]" />
        {o.seq.map((p, i) => (
          <figure key={i} data-flash className="invisible absolute m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster(PROJECTS[p].slug)}
              alt=""
              className="block aspect-[16/10] w-full object-cover"
            />
            {o.captions && (
              <figcaption className="mt-1.5 text-[0.8125rem] leading-4 text-primary/60">
                {PROJECTS[p].title}
              </figcaption>
            )}
          </figure>
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-final
          src={poster(PROJECTS[0].slug)}
          alt=""
          className="invisible absolute object-cover"
        />
        <div className="absolute inset-0 grid place-items-center">
          {labels.map((w, i) => (
            <span key={i} data-word className="invisible col-start-1 row-start-1 text-h1">
              {w}
            </span>
          ))}
        </div>
      </div>
    ),
    build: (tl, q, root) => {
      const phone = innerWidth < 768;
      const g = phone ? o.phone : o.laptop;
      const cw = innerWidth / g.cols;
      const ch = innerHeight / g.rows;
      const cap = o.captions ? CAPTION : 0;
      const w = Math.min(cw * o.size, (ch * o.size - cap) * 1.6);
      const h = (w * 10) / 16 + cap;
      const flashes = q("[data-flash]");
      const starts = flashes.map((_, i) => Math.floor(i / group) * o.step);
      const groups = Math.ceil(flashes.length / group);
      const end = (o.pile ? (groups - 1) * o.step + o.hold : groups * o.step) + (o.endHold ?? 0);

      flashes.forEach((el, i) => {
        const [c, r] = g.cells[i % g.cells.length];
        gsap.set(el, { left: c * cw + (cw - w) / 2, top: r * ch + (ch - h) / 2, width: w });
        const t = starts[i];
        const out = o.pile ? end : t + o.hold;
        if (fade) {
          tl.fromTo(
            el,
            { autoAlpha: 0, scale: 0.97 },
            { autoAlpha: 1, scale: 1, duration: fade, ease: ease.out },
            t,
          ).to(el, { autoAlpha: 0, duration: fade, ease: ease.out }, out - fade);
        } else {
          tl.set(el, { visibility: "visible" }, t).set(el, { visibility: "hidden" }, out);
        }
      });

      // Titles follow their flash; craft words share the run evenly.
      const words = q("[data-word]");
      const wordAt = (i: number) =>
        o.words === "titles" ? starts[i] : (i * (end - (o.endHold ?? 0))) / words.length;
      words.forEach((el, i) => {
        const next = i + 1 < words.length ? wordAt(i + 1) : end;
        tl.set(el, { visibility: "visible" }, wordAt(i)).set(el, { visibility: "hidden" }, next);
      });

      // Project 1 is left in its slot on the page, then the cover lifts.
      const r = root.querySelector<HTMLElement>("[data-win='0']")?.getBoundingClientRect();
      const final = q("[data-final]")[0];
      if (r) gsap.set(final, { left: r.left, top: r.top, width: r.width, height: r.height });
      if (fade)
        tl.fromTo(final, { autoAlpha: 0 }, { autoAlpha: 1, duration: fade, ease: ease.out }, end);
      else tl.set(final, { visibility: "visible" }, end);
      const lift = end + Math.max(0.25, fade + 0.15);
      tl.to(q("[data-bg]"), { autoAlpha: 0, duration: 0.45, ease: ease.out }, lift)
        .from(q("[data-statement]"), { y: 12, duration: 0.45, ease: ease.out }, lift)
        .set(q("[data-ov]"), { display: "none" });
    },
  };
}

const VARIANTS: Variant[] = [
  // 1 · Round 1 as it was, for reference: twelve hard cuts, 0.12 s apart.
  makeFlash({
    name: "Flash",
    laptop: { cols: 6, rows: 4, cells: GRID_6x4 },
    phone: {
      cols: 3,
      rows: 6,
      cells: GRID_6x4.map(([c, r]) => [c % 3, (r * 2 + (c > 2 ? 1 : 0)) % 6]),
    },
    seq: GRID_6x4.map((_, i) => (i + 1) % PROJECTS.length),
    step: 0.12,
    hold: 0.12,
    size: 0.72,
    words: "craft",
  }),
  // 2 · Slow: one project at a time, big, with its name, half a second each.
  makeFlash({
    name: "Slow",
    laptop: { cols: 3, rows: 3, cells: GRID_3x3 },
    phone: PHONE,
    seq: REST,
    step: 0.6,
    hold: 0.6,
    fade: 0.15,
    size: 0.86,
    words: "craft",
    captions: true,
  }),
  // 3 · Pairs: two at a time in opposite corners, a long look at each pair.
  makeFlash({
    name: "Pairs",
    laptop: { cols: 3, rows: 3, cells: GRID_3x3 },
    phone: PHONE,
    seq: REST,
    group: 2,
    step: 0.75,
    hold: 0.75,
    fade: 0.12,
    size: 0.86,
    words: "craft",
    captions: true,
  }),
  // 4 · Pile: each one stays, the frame fills, holds, then clears to project 1.
  makeFlash({
    name: "Pile",
    laptop: { cols: 3, rows: 3, cells: GRID_3x3 },
    phone: PHONE,
    seq: REST,
    step: 0.25,
    hold: 0.25,
    fade: 0.15,
    size: 0.86,
    words: "craft",
    pile: true,
    endHold: 0.7,
  }),
  // 5 · Names: the centre word is the project on screen, so you read what you see.
  makeFlash({
    name: "Names",
    laptop: { cols: 3, rows: 3, cells: GRID_3x3 },
    phone: PHONE,
    seq: REST,
    step: 0.5,
    hold: 0.5,
    fade: 0.1,
    size: 0.86,
    words: "titles",
  }),
];

/* ------------------------------------------------------------------ */
/* The resting home every variant lands on                              */
/* ------------------------------------------------------------------ */

function Home() {
  return (
    <>
      <section className="px-margin pt-10 md:pt-12">
        <h2 data-statement className="max-w-[40rem] text-h1">
          {STATEMENT}
        </h2>
      </section>
      <div className="mt-10 flex flex-col gap-8 px-margin pb-28 md:absolute md:inset-x-0 md:bottom-6 md:mt-0 md:flex-row md:pb-0 md:pr-0">
        {PROJECTS.map((p, i) => (
          <Link
            key={p.slug}
            href={`/project/${p.slug}`}
            className="block shrink-0 md:w-[55.5vw] md:max-w-[calc((100svh-var(--header-height)-12rem)*1.6)]"
          >
            <div data-win={i} className="relative aspect-[16/10] overflow-hidden bg-[#e9e9e9]">
              {"video" in p ? (
                <video
                  src={p.video}
                  poster={poster(p.slug)}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster(p.slug)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
            <p className="mt-2 text-body text-primary md:hidden">{p.title}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function Stage({ variant }: { variant: Variant }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const tl = gsap.timeline();
      variant.build(tl, gsap.utils.selector(el) as (s: string) => HTMLElement[], el);
      if (prefersReducedMotion()) tl.progress(1);
      const skip = (e: Event) => {
        if ((e.target as Element | null)?.closest?.(".proto-picker")) return;
        if (e instanceof KeyboardEvent && /^[1-5rR]$|^Arrow/.test(e.key)) return;
        tl.progress(1);
      };
      const opts = { passive: true, capture: true } as const;
      addEventListener("wheel", skip, opts);
      addEventListener("pointerdown", skip, opts);
      addEventListener("keydown", skip, opts);
      return () => {
        removeEventListener("wheel", skip, opts);
        removeEventListener("pointerdown", skip, opts);
        removeEventListener("keydown", skip, opts);
      };
    },
    { scope: root },
  );
  return (
    <div
      ref={root}
      className="relative md:h-[calc(100svh-var(--header-height))] md:overflow-hidden"
    >
      <Home />
      {variant.overlay()}
    </div>
  );
}

export default function IntroLab({ initial }: { initial: number }) {
  const [current, setCurrent] = useState(
    initial >= 1 && initial <= VARIANTS.length ? initial - 1 : 0,
  );
  const [run, setRun] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setRun((r) => r + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(history.state, "", url);
  }, []);
  const replay = useCallback(() => setRun((r) => r + 1), []);

  useLayoutEffect(() => {
    const move = () => {
      const el = itemRefs.current[current];
      const hl = highlightRef.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    addEventListener("resize", move);
    return () => removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [current, select, replay]);

  return (
    <>
      <Stage key={`${current}-${run}`} variant={VARIANTS[current]} />
      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => select(i)}
          >
            {v.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={replay}
        >
          ↻
        </button>
      </nav>
    </>
  );
}
