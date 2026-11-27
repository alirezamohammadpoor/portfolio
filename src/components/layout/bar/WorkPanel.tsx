"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "@/lib/viewTransitions";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { isPlainLeftClick } from "@/lib/clicks";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import type { BarData, BarRow } from "@/sanity/lib/bar";

const FINE_HOVER = "(hover: hover) and (pointer: fine)";

/**
 * One window for Work and About (Ali, 11-17): the same size whichever is
 * open and whatever the text, so nothing grows. The height is Work's, worked
 * out from its parts so About can take it without Work being on screen:
 *  phone  = the 16:9 preview (capsule width less 2x16 margin) + 8 + three
 *           12/16 lines (48) + 24 + the list + 12 bottom
 *  laptop = the 16:10 preview (8 of 12 columns in the 64rem capsule, 403)
 *           + 8 + four 16/24 lines (96) + 32 bottom, or the list if longer
 * and never past --panel-max (the screen less the capsule's row).
 */
export function panelSize(bar: BarData) {
  // Quiet (Ali 11-18): every name, project or post, is one 16/24 line on a
  // phone and one 18/28 line on a laptop; a label is 12/16 plus 8 below.
  const count = bar.projects.length + bar.posts.length;
  const phone = `calc((100vw - 64px) * 9 / 16 + ${8 + 48 + 24 + 12 + 24 + (bar.posts.length ? 40 : 0) + 24 * count}px)`;
  const laptop = `${Math.ceil(Math.max(403.34 + 8 + 96 + 32, 32 + 24 + (bar.posts.length ? 56 : 0) + 28 * count))}px`;
  return { "--panel-h": phone, "--panel-h-desk": laptop } as Record<string, string>;
}
export const PANEL_H =
  "h-[min(var(--panel-h),var(--panel-max))] desktop:h-[min(var(--panel-h-desk),var(--panel-max))]";

/**
 * Work (Work A, Ali 11-16): the names and a preview that follows. With a
 * real pointer the hovered or focused row leads and a click opens it. On
 * touch everything fits one screen: the first tap on a row previews it,
 * a tap on the previewed row opens it. The preview plays the project's
 * home cover clip over its still, so a switch shows something at once.
 */
export default function WorkPanel({
  bar,
  scrollRef,
  onOpenProject,
}: {
  bar: BarData;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Takes over opening a project from the preview (the flight into card 1); true when it did. */
  onOpenProject?: (href: string, preview: HTMLElement | null) => boolean;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const rows: (BarRow & { kind: "project" | "post" })[] = [
    ...bar.projects.map((r) => ({ ...r, kind: "project" as const })),
    ...bar.posts.map((r) => ({ ...r, kind: "post" as const })),
  ];
  const [active, setActiveRaw] = useState(0);
  const lead = rows[active] ?? rows[0];
  // The preview is a stack of layers: the lead's on top and the one it
  // replaces underneath, still playing. A layer with a clip waits, hidden,
  // until the clip has a frame, then enters; the one under it leaves when
  // the entrance ends. The cover still is never shown before a clip (Ali
  // 11-18: the still, then the clip, read as a flicker, and with no still
  // the empty box did).
  type Layer = { i: number; id: number; ready: boolean };
  const [layers, setLayers] = useState<Layer[]>(() => [{ i: 0, id: 0, ready: !rows[0]?.video }]);
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const setActive = (i: number) => {
    if (i === active) return;
    setActiveRaw(i);
    setLayers((ls) => {
      // Build on the newest layer that is showing, never on one still waiting.
      const base = [...ls].reverse().find((l) => l.ready) ?? ls[0];
      const r = rows[i];
      const next: Layer = { i, id: ls[ls.length - 1].id + 1, ready: !r?.video };
      return reducedMotion() && next.ready ? [next] : [base, next];
    });
  };
  const markReady = (id: number) =>
    setLayers((ls) => {
      const at = ls.findIndex((l) => l.id === id);
      if (at < 0 || ls[at].ready) return ls;
      const next = ls.map((l) => (l.id === id ? { ...l, ready: true } : l));
      return reducedMotion() ? next.slice(at) : next;
    });
  // Every still is warm before its first switch, so a new layer never
  // shows the empty box.
  useEffect(() => {
    rows.forEach((r) => {
      if (!r.still) return;
      const img = new Image();
      img.src = r.still;
      img.decode().catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open
  }, []);

  const preview = (
    <div>
      {/* 16:9 on a phone (one screen with every name), 16:10 on a laptop.
          The picture opens what it shows (Ali 11-26), the same way its row
          does: a project flies into card 1, a post is a plain link. The
          row is the one in the tab order; this is a second way in. */}
      <Link
        href={lead?.href ?? "/"}
        tabIndex={-1}
        aria-label={lead?.title}
        onClick={(e) => {
          if (
            lead?.kind === "project" &&
            isPlainLeftClick(e) &&
            onOpenProject?.(lead.href, previewRef.current)
          )
            e.preventDefault();
        }}
        className="block"
      >
        <div
          ref={previewRef}
          className="relative aspect-video overflow-hidden bg-tertiary desktop:aspect-[16/10]"
        >
          {layers.map((l, k) => {
            const r = rows[l.i];
            const current = k === layers.length - 1;
            const top = layers[layers.length - 1];
            const state = !l.ready
              ? "wait"
              : current
                ? l.id === 0 && !r?.video
                  ? "rest"
                  : "in"
                : top.ready
                  ? "out"
                  : "rest";
            return (
              <div
                key={l.id}
                className="work-layer absolute inset-0"
                data-state={state}
                data-current={current ? "" : undefined}
                onAnimationEnd={(e) => {
                  if (current && l.ready && e.target === e.currentTarget)
                    setLayers((ls) => ls.slice(-1));
                }}
              >
                {r?.still && (
                  // eslint-disable-next-line @next/next/no-img-element -- a layer's still under its clip, no layout
                  <img
                    src={r.still}
                    alt=""
                    decoding="sync"
                    data-lead={current ? "" : undefined}
                    className={`absolute inset-0 h-full w-full object-cover ${r.video ? "opacity-0" : ""}`}
                  />
                )}
                {r?.video && <LayerVideo src={r.video} onReady={() => markReady(l.id)} />}
              </div>
            );
          })}
        </div>
      </Link>
      {/* A fixed box for the line: three lines on a phone, four on a laptop
          (the longest line on the site), so a longer one never moves the list. */}
      <p
        key={active}
        className={`${layers[layers.length - 1].id > 0 ? "work-line" : ""} mt-2 line-clamp-3 h-12 text-sub text-primary desktop:line-clamp-4 desktop:h-24 desktop:text-body`}
      >
        {lead?.line}
      </p>
    </div>
  );

  const heading = (text: string, first: boolean) => (
    <h2 className={`${first ? "" : "pt-4 desktop:pt-8"} pb-2 text-sub text-primary`}>{text}</h2>
  );
  const list = rows.map((r, i) => (
    <div key={r.href}>
      {i === 0 && heading("Projects", true)}
      {r.kind === "post" && i === bar.projects.length && heading("Journal", false)}
      <Link
        href={r.href}
        onClick={(e) => {
          // Touch: the first tap previews, the second opens.
          if (i !== active && !window.matchMedia(FINE_HOVER).matches) {
            e.preventDefault();
            setActive(i);
            return;
          }
          if (
            r.kind === "project" &&
            i === active &&
            isPlainLeftClick(e) &&
            onOpenProject?.(r.href, previewRef.current)
          )
            e.preventDefault();
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setActive(i);
        }}
        onFocus={(e) => {
          // Keyboard focus leads the row; the focus a tap gives does not,
          // or the first tap on a row would open it.
          if (e.currentTarget.matches(":focus-visible")) setActive(i);
        }}
        aria-current={i === active ? "true" : undefined}
        className={`block w-full text-left text-body [overflow-wrap:anywhere] transition-colors duration-[160ms] desktop:text-lead ${i === active ? "text-primary" : "text-secondary"}`}
      >
        {r.title}
      </Link>
    </div>
  ));

  if (desktop) {
    return (
      <div
        ref={scrollRef}
        tabIndex={-1}
        data-lenis-prevent
        className={`${PANEL_H} overflow-y-auto overscroll-contain outline-none`}
      >
        <div className="grid-site px-margin pb-8">
          <div className="col-span-4">{list}</div>
          <div className="sticky top-0 col-span-8 col-start-5 self-start">{preview}</div>
        </div>
      </div>
    );
  }
  return (
    <div
      ref={scrollRef}
      tabIndex={-1}
      data-lenis-prevent
      className={`${PANEL_H} overflow-y-auto overscroll-contain px-margin pb-3 outline-none`}
    >
      {preview}
      <div className="mt-6">{list}</div>
    </div>
  );
}

/**
 * A layer's clip, hidden until it has presented a frame of its own. A new
 * <video> paints blank (and iOS drops the poster on play) until its first
 * frame decodes, which flickered on every switch on a phone (Ali, 11-18);
 * until then the still underneath shows (or, with no still, the layer
 * waits and the previous preview keeps playing).
 */
function LayerVideo({ src, onReady }: { src: string; onReady: () => void }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  });
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const show = () => {
      setShown(true);
      readyRef.current();
    };
    // A clip that never loads (data saver, low power) still lets the layer in.
    const late = window.setTimeout(() => readyRef.current(), 2500);
    const stop = onFirstVideoFrame(v, show);
    return () => {
      stop();
      window.clearTimeout(late);
    };
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      className={`absolute inset-0 h-full w-full object-cover ${shown ? "opacity-100" : "opacity-0"}`}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
    />
  );
}
