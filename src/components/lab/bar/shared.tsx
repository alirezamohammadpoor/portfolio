"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { useLenis } from "lenis/react";
import { ENGLISH_NAME, PERSIAN_NAME } from "@/lib/name";
import type { LabAbout, LabData, LabPage, LabProject } from "./types";

// Pieces every direction shares: the pages under the bar, the Work index
// (Work A, Ali 11-16), the About and details text. The directions differ in
// the bar, where the project pill lives and how panels open, never in these.

export const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
/** iOS sheet curve (Vaul): steep start, gentle settle. Edge-attached sheets only. */
export const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

// ── environment ──────────────────────────────────────────────────────────

function useMedia(query: string, server: boolean): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => server);
}

export const useDesktop = () => useMedia("(min-width: 75rem)", true);
/** A real pointer that hovers: rows preview on hover. Touch gets tap-to-centre. */
export const useFineHover = () => useMedia("(hover: hover) and (pointer: fine)", true);
export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)", false);

/** The page holds still under a panel: Lenis stops and the native scroll is held. */
export function useScrollLock(locked: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!locked) return;
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      lenis?.start();
    };
  }, [locked, lenis]);
}

/**
 * Mounted while open and through the exit: `present` turns false only when
 * the variant says its close has finished.
 */
/** Harness: the picker steps aside while a panel is open (it covered the last rows). */
export function useLabPanelFlag(open: boolean) {
  useEffect(() => {
    const html = document.documentElement;
    if (open) html.dataset.labPanel = "";
    else delete html.dataset.labPanel;
    return () => {
      delete html.dataset.labPanel;
    };
  }, [open]);
}

export function usePresence<T>(value: T | null): [T | null, () => void] {
  const [present, setPresent] = useState<T | null>(value);
  if (value !== null && present !== value) setPresent(value);
  const done = useCallback(() => setPresent(null), []);
  return [value !== null ? value : present, done];
}

// ── the bar's three items ─────────────────────────────────────────────────

export const BAR_H = 40;
/** Phone 12px, laptop 16px from the top edge (and below the notch, if any). */
export const BAR_TOP = "top-[calc(env(safe-area-inset-top)+12px)] desktop:top-[calc(env(safe-area-inset-top)+16px)]";
export const BAR_SHADOW = "shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.06)]";

const ITEM =
  "relative flex h-10 items-center rounded-full transition-[color,scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] select-none touch-manipulation before:absolute before:-inset-x-2 before:-inset-y-1 before:content-['']";

export function BarItems({
  open,
  onWork,
  onAbout,
  centre,
}: {
  open: "work" | "about" | "details" | null;
  onWork: () => void;
  onAbout: () => void;
  /** The middle slot: the name (home) by default. */
  centre: ReactNode;
}) {
  const tone = (me: "work" | "about") => (open === null || open === me ? "text-primary" : "text-secondary");
  return (
    <>
      <button type="button" onClick={onWork} aria-expanded={open === "work"} className={`${ITEM} justify-self-start ${tone("work")}`}>
        Work
      </button>
      <div className="flex min-w-0 justify-center">{centre}</div>
      <button type="button" onClick={onAbout} aria-expanded={open === "about"} className={`${ITEM} justify-self-end ${tone("about")}`}>
        About
      </button>
    </>
  );
}

export function NameButton({ onHome, dim }: { onHome: () => void; dim?: boolean }) {
  return (
    <button
      type="button"
      onClick={onHome}
      aria-label={`${ENGLISH_NAME}, home`}
      className={`${ITEM} whitespace-nowrap ${dim ? "text-secondary" : "text-primary"}`}
    >
      <span className="parastoo-font text-[15px]" dir="rtl" lang="fa">
        {PERSIAN_NAME}
      </span>
    </button>
  );
}

// ── media ─────────────────────────────────────────────────────────────────

/** A 16:10 box that keeps its shape with or without media (no layout shift). */
export function Media({
  still,
  video,
  alt = "",
  className = "",
  priority,
}: {
  still: string | null;
  video?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden bg-tertiary ${className}`}>
      {video ? (
        <video
          key={video}
          src={video}
          poster={still ?? undefined}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
      ) : still ? (
        // eslint-disable-next-line @next/next/no-img-element -- lab: plain Sanity CDN stills
        <img src={still} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

// ── pages under the bar ───────────────────────────────────────────────────

/** Room the bar takes at the top of every page: 12/16px + 40px + 12/16px. */
export const PAGE_TOP = "pt-16 desktop:pt-[72px]";

export function HomeView({ data, go }: { data: LabData; go: (p: LabPage) => void }) {
  return (
    <div className={`${PAGE_TOP} pb-40`}>
      <div className="grid-site px-margin">
        <p className="col-span-full mt-10 text-center text-h3 text-primary desktop:col-start-3 desktop:col-end-11 desktop:mt-16">
          {data.intro}
        </p>
        <ul className="col-span-full mt-12 grid gap-y-12 desktop:col-start-3 desktop:col-end-11 desktop:mt-20 desktop:gap-y-20">
          {data.projects.map((p, i) => (
            <li key={p.slug}>
              <button type="button" onClick={() => go({ kind: "project", index: i, clip: 0 })} className="block w-full text-left">
                <Media still={p.still} video={i === 0 ? p.video : null} priority={i < 2} />
                <span className="mt-3 block text-body text-primary">{p.title}</span>
                <span className="block text-body text-secondary">{p.line}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PostView({ data, index }: { data: LabData; index: number }) {
  const post = data.posts[index];
  if (!post) return null;
  return (
    <div className={`${PAGE_TOP} pb-40`}>
      <article className="grid-site px-margin">
        <h1 className="col-span-full mt-10 text-h2 [overflow-wrap:anywhere] desktop:col-start-3 desktop:col-end-11 desktop:mt-16 desktop:text-h1">
          {post.title}
        </h1>
        <p className="col-span-full mt-4 text-body text-secondary desktop:col-start-3 desktop:col-end-9">{post.excerpt}</p>
        <Media still={post.still} className="col-span-full mt-10 desktop:col-start-3 desktop:col-end-11" priority />
      </article>
    </div>
  );
}

/** The pill's text on a clip: the A/B test or clip label, else the title. */
export const pillText = (p: LabProject, clip: number) => p.clips[clip]?.label ?? p.title;

/** A clip in the card: one 16:10 frame, or a phones row at the phones' own ratio. */
function ClipMedia({ project, clip }: { project: LabProject; clip: number }) {
  const c = project.clips[clip] ?? project.clips[0];
  if (c?.phones && c.phones.length > 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center gap-2 bg-tertiary p-4 desktop:gap-4 desktop:p-8">
        {c.phones.map((ph, i) => (
          <div key={i} className="relative aspect-[390/844] h-full overflow-hidden bg-bg">
            {ph.video ? (
              <video key={ph.video} src={ph.video} poster={ph.still ?? undefined} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
            ) : ph.still ? (
              // eslint-disable-next-line @next/next/no-img-element -- lab: plain Sanity CDN stills
              <img src={ph.still} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  return <Media still={c?.still ?? project.still} video={c?.video ?? (clip === 0 ? project.video : null)} priority />;
}

export function ProjectView({
  project,
  clip,
  setClip,
  pill,
  top = PAGE_TOP,
}: {
  project: LabProject;
  clip: number;
  setClip: (i: number) => void;
  /** The variant's project pill, under the card; null when the bar carries it. */
  pill: ReactNode;
  top?: string;
}) {
  const n = project.clips.length;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const step = (d: number) => setClip((clip + d + n) % n);
  return (
    <div className={`${top} flex min-h-dvh flex-col justify-center pb-24`}>
      <div className="grid-site px-margin">
        {/* A horizontal swipe on the card steps through the clips (vertical stays scroll). */}
        <div
          className="relative col-span-full touch-pan-y select-none desktop:col-start-3 desktop:col-end-11"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s0 = swipe.current;
            swipe.current = null;
            if (!s0 || n < 2) return;
            const dx = e.clientX - s0.x;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s0.y)) step(dx < 0 ? 1 : -1);
          }}
        >
          <ClipMedia project={project} clip={clip} />
          {n > 1 && (
            <>
              <button type="button" aria-label="Previous clip" onClick={() => step(-1)} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize" />
              <button type="button" aria-label="Next clip" onClick={() => step(1)} className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize" />
            </>
          )}
        </div>
      </div>
      {pill && <div className="mt-4 flex min-h-9 justify-center px-margin">{pill}</div>}
      {n > 1 && (
        <div className="mt-4 flex justify-center px-margin">
          <div className="flex max-w-full items-end gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]" aria-label={`${project.title}, ${n} clips`}>
            {project.clips.map((k, i) => {
              const thumb = k.phones?.[0]?.still ?? k.still;
              const phone = Boolean(k.phones?.length);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setClip(i)}
                  aria-label={`${i + 1} of ${n}${k.label ? `, ${k.label}` : ""}`}
                  aria-current={i === clip}
                  className={`relative h-10 shrink-0 overflow-hidden bg-tertiary transition-[opacity,translate] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${phone ? "aspect-[390/844]" : "aspect-[16/10]"} ${
                    i === clip ? "-translate-y-1 opacity-100" : "opacity-40"
                  }`}
                >
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element -- lab thumbnails
                    <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── panel contents ────────────────────────────────────────────────────────

type Row = { kind: "project" | "post"; index: number; title: string; still: string | null; video: string | null; line: string };

/**
 * Work A: names and a preview that follows. With a fine pointer the hovered
 * or focused row leads and a click opens it. On touch everything fits one
 * screen (Ali 11-16: the wheel scrolled too much): a tap on a row previews
 * it, a tap on the previewed row opens it. The preview plays the project's
 * home cover clip; stills sit under it so a switch is instant.
 */
export function WorkIndex({
  data,
  onOpen,
  scrollRef,
}: {
  data: LabData;
  onOpen: (r: { kind: "project" | "post"; index: number }) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const desktop = useDesktop();
  const hover = useFineHover();
  const rows: Row[] = [
    ...data.projects.map((p, i) => ({ kind: "project" as const, index: i, title: p.title, still: p.still, video: p.video, line: p.line })),
    ...data.posts.map((p, i) => ({ kind: "post" as const, index: i, title: p.title, still: p.still, video: null, line: p.excerpt })),
  ];
  const [active, setActive] = useState(0);
  const press = (i: number) => {
    const r = rows[i];
    if (hover || i === active) onOpen({ kind: r.kind, index: r.index });
    else setActive(i);
  };

  const lead = rows[active] ?? rows[0];
  const preview = (
    <div>
      {/* 16:9 on a phone (one screen with every name), 16:10 on a laptop. */}
      <div className="relative aspect-video overflow-hidden bg-tertiary desktop:aspect-[16/10]">
        {rows.map((r, i) =>
          r.still ? (
            // eslint-disable-next-line @next/next/no-img-element -- lab: stacked stills crossfade, no layout
            <img
              key={`${r.kind}-${r.index}`}
              src={r.still}
              alt=""
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[160ms] ${i === active ? "opacity-100" : "opacity-0"}`}
            />
          ) : null,
        )}
        {lead?.video && (
          <video key={lead.video} src={lead.video} poster={lead.still ?? undefined} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
        )}
      </div>
      <p className="mt-2 min-h-[3rem] text-body text-primary">{lead?.line}</p>
    </div>
  );

  const heading = (text: string, first: boolean) => <h2 className={`${first ? "" : "pt-4 desktop:pt-8"} pb-1 text-sub text-secondary`}>{text}</h2>;
  const list = (
    <>
      {rows.map((r, i) => (
        <div key={`${r.kind}-${r.index}`}>
          {i === 0 && heading("Projects", true)}
          {r.kind === "post" && r.index === 0 && heading("Journal", false)}
          <button
            type="button"
            onClick={() => press(i)}
            onPointerEnter={hover ? () => setActive(i) : undefined}
            onFocus={(e) => {
              // Keyboard focus leads the row; the focus a tap gives does not,
              // or the first tap on a row would open it.
              if (e.currentTarget.matches(":focus-visible")) setActive(i);
            }}
            aria-current={i === active}
            className={`block w-full text-left [overflow-wrap:anywhere] transition-colors duration-[160ms] ${
              r.kind === "project" ? "text-lead leading-7 desktop:text-h3" : "text-body"
            } ${i === active ? "text-primary" : "text-secondary"}`}
          >
            {r.title}
          </button>
        </div>
      ))}
    </>
  );

  if (desktop) {
    return (
      <div ref={scrollRef} data-lenis-prevent className="max-h-[var(--panel-max,calc(100dvh-160px))] overflow-y-auto overscroll-contain">
        <div className="grid-site px-margin pb-8">
          <div className="col-span-4">{list}</div>
          <div className="sticky top-0 col-span-8 col-start-5 self-start">{preview}</div>
        </div>
      </div>
    );
  }
  return (
    <div ref={scrollRef} data-lenis-prevent className="max-h-[var(--panel-max,calc(100dvh-160px))] overflow-y-auto overscroll-contain px-margin pb-3">
      {preview}
      <div className="mt-2">{list}</div>
    </div>
  );
}

/**
 * About sized to fit (Ali 11-16): no scrolling on a phone, left aligned,
 * the lead one step above the body instead of a headline.
 */
export function AboutBody({ about }: { about: LabAbout }) {
  const link = "w-fit hover:opacity-60";
  return (
    <div className="px-margin pb-6 desktop:pb-8">
      <p className="text-lead text-primary">{about.lead}</p>
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-[1.375rem] text-primary">
        {about.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-body">
        {about.linkedinUrl && (
          <a className={link} href={about.linkedinUrl} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        )}
        {about.githubUrl && (
          <a className={link} href={about.githubUrl} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        )}
        {about.email && (
          <button type="button" className={link} onClick={() => navigator.clipboard?.writeText(about.email ?? "")}>
            Copy my email
          </button>
        )}
      </div>
    </div>
  );
}

export function DetailsBody({ project, clip }: { project: LabProject; clip: number }) {
  const label = project.clips[clip]?.label;
  return (
    <div className="px-margin pb-6 desktop:pb-8">
      <h2 className="text-lead [overflow-wrap:anywhere]">{project.title}</h2>
      {label && <p className="text-body text-secondary">{label}</p>}
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-[1.375rem]">
        {(project.description.length ? project.description : [project.line]).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {project.tech.length > 0 && <p className="text-sub text-secondary">{project.tech.join(" · ")}</p>}
      </div>
    </div>
  );
}
