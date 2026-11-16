"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useModalFocus } from "@/hooks/useModalFocus";
import type { VariantProps } from "./BarLab";
import type { Panel } from "./types";
import {
  AboutBody,
  BAR_SHADOW,
  BAR_TOP,
  BarItems,
  DetailsBody,
  HomeView,
  NameButton,
  PostView,
  ProjectView,
  WorkIndex,
  useLabPanelFlag,
  usePresence,
  useReducedMotion,
  useScrollLock,
} from "./shared";

// Sheet (interaction axis): the bar holds still and says where you are. On
// a project page its middle reads "‹ Zone 2": the project's short name is
// the title, the chevron is the way home. A/B test names never go in the
// bar; they stay in the pill under the card, which opens the details.
// Work, About and the details are one bottom sheet you can drag: it tracks
// the finger 1:1, a flick or a drag past 40% closes it, and it can be
// caught mid-flight (gestures, apple-design).

type Spring = { stop: () => void };

/** A damped spring on one number, seeded with a velocity (px/s). */
function spring(from: number, to: number, v0: number, bounce: number, onFrame: (y: number) => void, onDone: () => void): Spring {
  const response = 0.42;
  const omega = (2 * Math.PI) / response;
  const zeta = 1 - bounce;
  let x = from;
  let v = v0;
  let last = performance.now();
  let raf = requestAnimationFrame(function step(now) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const a = -omega * omega * (x - to) - 2 * zeta * omega * v;
    v += a * dt;
    x += v * dt;
    // At rest, or (closing) a few pixels from off-screen, where nothing is left to see.
    if ((Math.abs(x - to) < 0.5 && Math.abs(v) < 20) || (to > from && to - x < 4)) {
      onFrame(to);
      onDone();
      return;
    }
    onFrame(x);
    raf = requestAnimationFrame(step);
  });
  return { stop: () => cancelAnimationFrame(raf) };
}

const TITLES: Record<Exclude<Panel, null>, string> = { work: "Work", about: "About", details: "Details" };

export default function Sheet({ data, page, go, setClip }: VariantProps) {
  const [open, setOpen] = useState<Panel>(null);
  const [shown, done] = usePresence(open);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const y = useRef(0);
  const anim = useRef<Spring | null>(null);
  const drag = useRef<{ id: number; start: number; y0: number; samples: [number, number][] } | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const toggle = (p: Exclude<Panel, null>) => setOpen((o) => (o === p ? null : p));

  useScrollLock(shown !== null);
  useLabPanelFlag(shown !== null);
  useModalFocus(open !== null, rootRef, scrollRef, close);

  const project = page.kind === "project" ? data.projects[page.index] : null;
  const clip = page.kind === "project" ? page.clip : 0;
  const label = project?.clips[clip]?.label ?? null;

  const height = () => sheetRef.current?.offsetHeight ?? 800;
  // One source of truth: the sheet's offset drives the scrim (linked values).
  const paint = useCallback((v: number) => {
    y.current = v;
    const h = sheetRef.current?.offsetHeight ?? 800;
    if (sheetRef.current) sheetRef.current.style.transform = `translate3d(0, ${v}px, 0)`;
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, Math.min(1, 1 - v / h)));
  }, []);

  const settle = useCallback(
    (to: number, v0: number, bounce: number) => {
      anim.current?.stop();
      if (reduced) {
        paint(to);
        if (to > 0) done();
        return;
      }
      anim.current = spring(y.current, to, v0, bounce, paint, () => {
        anim.current = null;
        if (to > 0) done();
      });
    },
    [paint, done, reduced],
  );

  // Open and close by button: critically damped, no bounce (no force was
  // applied). A sheet already on screen retargets from where it is.
  const wasShown = useRef(false);
  useLayoutEffect(() => {
    if (!shown) {
      wasShown.current = false;
      return;
    }
    if (!wasShown.current) {
      wasShown.current = true;
      paint(height());
    }
  }, [shown, paint]);
  // A drag that closes hands its own velocity to the spring; the effect
  // that follows the state change must not restart it from rest.
  const fromDrag = useRef(false);
  useEffect(() => {
    if (!shown) return;
    if (fromDrag.current) {
      fromDrag.current = false;
      return;
    }
    settle(open ? 0 : height(), 0, 0);
  }, [open, shown, settle]);
  useEffect(() => () => anim.current?.stop(), []);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    anim.current?.stop();
    anim.current = null;
    drag.current = { id: e.pointerId, start: e.clientY, y0: y.current, samples: [[e.timeStamp, e.clientY]] };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    let next = d.y0 + (e.clientY - d.start);
    if (next < 0) next = next * 0.2; // rubber band past the open position
    paint(next);
    d.samples.push([e.timeStamp, e.clientY]);
    if (d.samples.length > 5) d.samples.shift();
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const [t0, y0] = d.samples[0];
    const [t1, y1] = d.samples[d.samples.length - 1];
    const v = t1 > t0 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0;
    const h = height();
    if (y.current > h * 0.4 || v > 600) {
      fromDrag.current = true;
      setOpen(null);
      settle(h, v, 0);
    } else {
      settle(0, v, 0.15);
    }
  };

  const openRow = (r: { kind: "project" | "post"; index: number }) => {
    setOpen(null);
    go(r.kind === "project" ? { kind: "project", index: r.index, clip: 0 } : { kind: "post", index: r.index });
  };

  const centre = project ? (
    <button
      type="button"
      onClick={() => { setOpen(null); go({ kind: "home" }); }}
      aria-label={`${project.title}. Back to home`}
      className="flex h-10 min-w-0 items-center gap-1 rounded-full transition-[scale] duration-[160ms] active:scale-[0.97]"
    >
      <span aria-hidden className="shrink-0 text-secondary">
        ‹
      </span>
      <span className="truncate">{project.title}</span>
    </button>
  ) : (
    <NameButton onHome={() => { setOpen(null); go({ kind: "home" }); }} dim={open !== null} />
  );

  const pill = project && (
    <button
      type="button"
      onClick={() => toggle("details")}
      aria-expanded={open === "details"}
      title={label ?? undefined}
      className="frost-soft inline-flex h-9 max-w-full min-w-0 items-center rounded-full px-4 text-body text-primary transition-[scale] duration-[160ms] active:scale-[0.97] desktop:max-w-[min(40rem,100%)]"
    >
      <span className="truncate">{label ?? "Details"}</span>
    </button>
  );

  return (
    <>
      {page.kind === "home" && <HomeView data={data} go={go} />}
      {page.kind === "post" && <PostView data={data} index={page.index} />}
      {project && <ProjectView project={project} clip={clip} setClip={setClip} pill={pill} />}

      <div ref={rootRef}>
        <nav
          aria-label="Site"
          className={`frost-strong ${BAR_SHADOW} fixed ${BAR_TOP} inset-x-[var(--grid-margin)] z-[60] grid h-10 grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-7 rounded-full px-5 text-body desktop:right-auto desktop:left-1/2 desktop:max-w-[44rem] desktop:-translate-x-1/2`}
        >
          <BarItems open={open} onWork={() => toggle("work")} onAbout={() => toggle("about")} centre={centre} />
        </nav>

        {shown && (
          <>
            <div ref={scrimRef} aria-hidden onClick={close} className="fixed inset-0 z-[55] bg-black/20" style={{ opacity: 0 }} />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={TITLES[shown]}
              className="frost-strong fixed inset-x-0 bottom-0 z-[56] flex h-[calc(100dvh-72px)] flex-col rounded-t-[24px] shadow-[0_-8px_32px_rgb(0_0_0/0.08)] will-change-transform desktop:inset-x-[calc(var(--grid-margin)+(100vw-2*var(--grid-margin))/12)] desktop:h-[calc(100dvh-96px)]"
              style={{ transform: "translate3d(0,100%,0)" }}
            >
              {/* Grab zone: handle + title row. Buttons inside never start a drag. */}
              <div
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="shrink-0 cursor-grab touch-none px-margin pt-2 pb-4 select-none active:cursor-grabbing"
              >
                <div className="mx-auto h-1 w-9 rounded-full bg-black/15" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-body text-secondary">{TITLES[shown]}</span>
                  <button type="button" onClick={close} className="relative h-8 rounded-full px-3 text-body transition-[scale] duration-[160ms] active:scale-[0.97] before:absolute before:-inset-1 before:content-['']">
                    Close
                  </button>
                </div>
              </div>
              <div key={shown} className="min-h-0 flex-1" style={{ animation: reduced ? undefined : "lab-in 160ms ease-out both" }}>
                {shown === "work" ? (
                  <WorkIndex data={data} onOpen={openRow} scrollRef={scrollRef} />
                ) : (
                  <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain pt-2 outline-none">
                    {shown === "about" ? <AboutBody about={data.about} /> : project && <DetailsBody project={project} clip={clip} />}
                  </div>
                )}
              </div>
            </div>
            <style>{`@keyframes lab-in{from{opacity:0}to{opacity:1}}`}</style>
          </>
        )}
      </div>
    </>
  );
}
