"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/lib/viewTransitions";
import { ease, prefersReducedMotion } from "@/lib/motion";
import "../home-layouts/proto-picker.css";

/**
 * /lab/intro: a clean-slate round of home intros (Ali 11-26). Each variant
 * plays once over the same resting home, then hands the page over. Sources:
 * annnimate.com's Reveal Kit idea (the cover's release frame is the page's
 * first frame), rebuilt here with the site's own content and tokens.
 *
 * Picker: keys 1-5 or arrows switch, R replays. Any wheel, key or press on
 * the page skips to the end.
 */

const STATEMENT =
  "Frontend developer at the intersection of product and design. Currently at TRY Stockholm.";

const PROJECTS = [
  { slug: "zone-2", title: "Zone 2", video: "/lab/project-window/zone2-cover.mp4" },
  { slug: "sania-d-mina", title: "Sania D'mina" },
  { slug: "paul-and-friends", title: "Paul & Friends" },
  { slug: "stronger", title: "Stronger" },
  { slug: "tryskills", title: "TRY Skills" },
  { slug: "try-devops", title: "TRY DevOps" },
] as const;

const poster = (slug: string) => `/lab/intro/${slug}.jpg`;

type Builder = (tl: gsap.core.Timeline, q: (s: string) => HTMLElement[], root: HTMLElement) => void;

interface Variant {
  name: string;
  overlay: () => React.ReactNode;
  build: Builder;
}

/* ------------------------------------------------------------------ */
/* 1 · Count: the cover counts the projects, then lifts off in columns  */
/* ------------------------------------------------------------------ */

const count: Variant = {
  name: "Count",
  overlay: () => (
    <div data-ov className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 flex">
        {PROJECTS.map((p) => (
          <div key={p.slug} data-col className="h-full flex-1 bg-[#111]" />
        ))}
      </div>
      <div
        data-num
        className="absolute bottom-24 left-[var(--grid-margin)] flex items-end md:bottom-6 gap-4 text-white"
      >
        <span
          data-digits
          className="text-[clamp(7rem,22vw,19rem)] leading-[0.8] tabular-nums tracking-tight"
        >
          00
        </span>
        <span className="mb-3 text-body text-white/60">projects</span>
      </div>
    </div>
  ),
  build: (tl, q) => {
    const digits = q("[data-digits]")[0];
    const n = { v: 0 };
    tl.to(n, {
      v: PROJECTS.length,
      duration: 0.9,
      ease: "power1.out",
      onUpdate: () => {
        digits.textContent = String(Math.round(n.v)).padStart(2, "0");
      },
    })
      .to(q("[data-num]"), { yPercent: -40, autoAlpha: 0, duration: 0.3, ease: ease.out }, 1.05)
      .to(q("[data-col]"), { yPercent: -100, duration: 0.8, ease: ease.inOut, stagger: 0.06 }, 1.05)
      .from(q("[data-win]"), { y: 48, duration: 0.9, ease: ease.out, stagger: 0.06 }, 1.25)
      .set(q("[data-ov]"), { display: "none" });
  },
};

/* ------------------------------------------------------------------ */
/* 2 · Flash: craft words hold the centre while the work flashes round  */
/* ------------------------------------------------------------------ */

// Grid cells (col, row) on a 6 x 4 field, the centre band left clear.
const CELLS: [number, number][] = [
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
const WORDS = ["Product", "Design", "Frontend"];

const flash: Variant = {
  name: "Flash",
  overlay: () => (
    <div data-ov className="fixed inset-0 z-[100]">
      <div data-bg className="absolute inset-0 bg-[#f6f6f6]" />
      {CELLS.map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          data-flash
          src={poster(PROJECTS[(i + 1) % PROJECTS.length].slug)}
          alt=""
          className="invisible absolute aspect-[16/10] object-cover"
        />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-final
        src={poster(PROJECTS[0].slug)}
        alt=""
        className="invisible absolute object-cover"
      />
      <div className="absolute inset-0 grid place-items-center">
        {WORDS.map((w) => (
          <span key={w} data-word className="invisible col-start-1 row-start-1 text-h1">
            {w}
          </span>
        ))}
      </div>
    </div>
  ),
  build: (tl, q, root) => {
    const W = innerWidth;
    const H = innerHeight;
    const phone = W < 768;
    const cols = phone ? 3 : 6;
    const rows = phone ? 6 : 4;
    const cw = W / cols;
    const ch = H / rows;
    const flashes = q("[data-flash]");
    flashes.forEach((img, i) => {
      const [c0, r0] = CELLS[i];
      const c = phone ? c0 % 3 : c0;
      const r = phone ? (r0 * 2 + (c0 > 2 ? 1 : 0)) % 6 : r0;
      const w = cw * 0.72;
      gsap.set(img, {
        left: c * cw + (cw - w) / 2,
        top: r * ch + (ch - (w * 10) / 16) / 2,
        width: w,
      });
    });
    const words = q("[data-word]");
    const step = 0.12;
    flashes.forEach((img, i) => {
      tl.set(img, { visibility: "visible" }, i * step).set(
        img,
        { visibility: "hidden" },
        i * step + step,
      );
    });
    words.forEach((w, i) => {
      tl.set(w, { visibility: "visible" }, i * 0.45).set(
        w,
        { visibility: "hidden" },
        i * 0.45 + 0.45,
      );
    });
    // The last flash is project 1, already in its slot on the page.
    const win = root.querySelector<HTMLElement>("[data-win='0']");
    const r = win?.getBoundingClientRect();
    const final = q("[data-final]")[0];
    if (r) gsap.set(final, { left: r.left, top: r.top, width: r.width, height: r.height });
    const end = flashes.length * step;
    tl.set(final, { visibility: "visible" }, end)
      .to(q("[data-bg]"), { autoAlpha: 0, duration: 0.45, ease: ease.out }, end + 0.25)
      .from(q("[data-statement]"), { y: 12, duration: 0.45, ease: ease.out }, end + 0.25)
      .set(q("[data-ov]"), { display: "none" });
  },
};

/* ------------------------------------------------------------------ */
/* 3 · Mosaic: an ink cover dissolves tile by tile from project 1       */
/* ------------------------------------------------------------------ */

const mosaic: Variant = {
  name: "Mosaic",
  overlay: () => (
    <div
      data-ov
      className="fixed inset-0 z-[100] grid grid-cols-8 grid-rows-[repeat(24,1fr)] md:grid-cols-16 md:grid-rows-[repeat(12,1fr)]"
    >
      {Array.from({ length: 192 }, (_, i) => (
        <div key={i} data-tile className="bg-[#111]" />
      ))}
    </div>
  ),
  build: (tl, q) => {
    const phone = innerWidth < 768;
    tl.to(
      q("[data-tile]"),
      {
        autoAlpha: 0,
        duration: 0.16,
        ease: "none",
        stagger: { grid: phone ? [24, 8] : [12, 16], from: phone ? [0, 0.3] : [0, 1], amount: 1.1 },
      },
      0.25,
    )
      .from(q("[data-win]"), { scale: 1.04, duration: 1.2, ease: ease.out }, 0.25)
      .set(q("[data-ov]"), { display: "none" });
  },
};

/* ------------------------------------------------------------------ */
/* 4 · Cut: the name, a line drawn through it, the cover splits on it   */
/* ------------------------------------------------------------------ */

const cut: Variant = {
  name: "Cut",
  overlay: () => (
    <div data-ov className="fixed inset-0 z-[100] overflow-hidden">
      <div
        data-half="a"
        className="absolute inset-0 bg-[#111] [clip-path:polygon(0_0,100%_0,0_100%)]"
      />
      <div
        data-half="b"
        className="absolute inset-0 bg-[#111] [clip-path:polygon(100%_0,100%_100%,0_100%)]"
      />
      <div className="absolute inset-0 grid place-items-center">
        <span data-name className="text-h1 text-white">
          Ali Reza
        </span>
      </div>
      <div data-line className="absolute left-1/2 top-1/2 h-px bg-white" />
    </div>
  ),
  build: (tl, q) => {
    const W = innerWidth;
    const H = innerHeight;
    const len = Math.hypot(W, H);
    // The cut runs from the bottom-left corner to the top-right corner.
    const angle = (-Math.atan2(H, W) * 180) / Math.PI;
    gsap.set(q("[data-line]"), { width: len, xPercent: -50, rotation: angle, scaleX: 0 });
    // Each half leaves along the cut's normal.
    const nx = H / len;
    const ny = W / len;
    const d = Math.max(W, H) * 0.9;
    tl.fromTo(
      q("[data-name]"),
      { opacity: 0.15 },
      { opacity: 1, duration: 0.5, ease: ease.out },
      0.1,
    )
      .to(q("[data-line]"), { scaleX: 1, duration: 0.55, ease: ease.inOut }, 0.45)
      .to(q("[data-name]"), { autoAlpha: 0, duration: 0.2, ease: ease.out }, 1.0)
      .to(q("[data-line]"), { autoAlpha: 0, duration: 0.2, ease: ease.out }, 1.05)
      .to(q("[data-half='a']"), { x: -nx * d, y: -ny * d, duration: 0.85, ease: ease.inOut }, 1.0)
      .to(q("[data-half='b']"), { x: nx * d, y: ny * d, duration: 0.85, ease: ease.inOut }, 1.0)
      .from(q("[data-win]"), { y: 40, duration: 0.9, ease: ease.out, stagger: 0.06 }, 1.15)
      .set(q("[data-ov]"), { display: "none" });
  },
};

/* ------------------------------------------------------------------ */
/* 5 · Compose: the layout grid draws, then the page sets onto it       */
/* ------------------------------------------------------------------ */

const compose: Variant = {
  name: "Compose",
  overlay: () => (
    <div data-ov className="pointer-events-none fixed inset-0 z-[100] grid-site px-margin">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          data-band
          className={`origin-top bg-[#ff3b30]/10 ${i >= 4 ? "hidden md:block" : ""}`}
        />
      ))}
    </div>
  ),
  build: (tl, q) => {
    tl.from(q("[data-band]"), { scaleY: 0, duration: 0.55, ease: ease.out, stagger: 0.03 }, 0)
      .from(
        q("[data-statement]"),
        { clipPath: "inset(0 0 100% 0)", y: 16, duration: 0.6, ease: ease.out },
        0.45,
      )
      .from(
        q("[data-win]"),
        { clipPath: "inset(0 100% 0 0)", duration: 0.75, ease: ease.inOut, stagger: 0.12 },
        0.6,
      )
      .to(q("[data-band]"), { autoAlpha: 0, duration: 0.4, ease: ease.out }, 1.45)
      .set(q("[data-ov]"), { display: "none" });
  },
};

const VARIANTS: Variant[] = [count, flash, mosaic, cut, compose];

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
