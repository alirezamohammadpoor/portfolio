"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "@/lib/viewTransitions";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { isPlainLeftClick } from "@/lib/clicks";
import type { BarData, BarRow } from "@/sanity/lib/bar";
import type { PanelLayout } from "@/lib/barProject";

const FINE_HOVER = "(hover: hover) and (pointer: fine)";

/**
 * One window for Work and About (Ali, 11-17): the same size whichever is
 * open and whatever the text, so nothing grows. The height is Work's, worked
 * out from its parts so About can take it without Work being on screen:
 *  phone  = the 16:9 preview (capsule width less 2x16 margin) + 8 + three
 *           15/22 lines (66) + 8 + the list + 12 bottom
 *  laptop = the 16:10 preview (8 of 12 columns in the 64rem capsule, 403)
 *           + 8 + four 16/24 lines (96) + 32 bottom, or the list if longer
 * and never past --panel-max (the screen less the capsule's row).
 */
export function panelSize(bar: BarData) {
  const rows = 28 * bar.projects.length + 24 * bar.posts.length;
  const phone = `calc((100vw - 64px) * 9 / 16 + ${8 + 66 + 8 + 12 + 20 + (bar.posts.length ? 36 : 0) + rows}px)`;
  const laptop = `${Math.ceil(Math.max(403.34 + 8 + 96 + 32, 32 + 20 + (bar.posts.length ? 52 : 0) + rows))}px`;
  return { "--panel-h": phone, "--panel-h-desk": laptop } as Record<string, string>;
}
export const PANEL_H = "h-[min(var(--panel-h),var(--panel-max))] desktop:h-[min(var(--panel-h-desk),var(--panel-max))]";
/** Full bleed takes the panel's top gap too (16 / 24), so the window keeps its size. */
const PANEL_H_BLEED = "h-[calc(min(var(--panel-h),var(--panel-max))+16px)] desktop:h-[calc(min(var(--panel-h-desk),var(--panel-max))+24px)]";

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
  layout = "now",
}: {
  bar: BarData;
  layout?: PanelLayout["work"];
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
  const [active, setActive] = useState(0);
  const lead = rows[active] ?? rows[0];

  // The lead's still and clip, stacked; `box` sizes it (an aspect ratio, or the cell it fills).
  const media = (box: string) => (
    <div ref={previewRef} className={`relative overflow-hidden bg-tertiary ${box}`}>
      {rows.map((r, i) =>
        r.still ? (
          // eslint-disable-next-line @next/next/no-img-element -- stacked stills crossfade in place, no layout
          <img
            key={r.href}
            src={r.still}
            alt=""
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            data-lead={i === active ? "" : undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[160ms] ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ) : null,
      )}
      {lead?.video && (
        <video
          key={lead.video}
          src={lead.video}
          poster={lead.still ?? undefined}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
      )}
    </div>
  );

  const preview = (
    <div>
      {/* 16:9 on a phone (one screen with every name), 16:10 on a laptop. */}
      {media("aspect-video desktop:aspect-[16/10]")}
      {/* A fixed box for the line: three lines on a phone, four on a laptop
          (the longest line on the site), so a longer one never moves the list. */}
      <p className="mt-2 line-clamp-3 h-[66px] text-[0.9375rem] leading-[1.375rem] text-primary desktop:line-clamp-4 desktop:h-24 desktop:text-body">{lead?.line}</p>
    </div>
  );

  const heading = (text: string, first: boolean) => (
    <h2 className={`${first ? "" : "pt-4 desktop:pt-8"} pb-1 text-sub text-primary`}>{text}</h2>
  );
  // `tone` colours a row (active, not); `headings` adds Projects / Journal.
  const rowLink = (r: (typeof rows)[number], i: number, tone: (on: boolean) => string, extra = "") => (
      <Link
        href={r.href}
        onClick={(e) => {
          // Touch: the first tap previews, the second opens.
          if (i !== active && !window.matchMedia(FINE_HOVER).matches) {
            e.preventDefault();
            setActive(i);
            return;
          }
          if (r.kind === "project" && i === active && isPlainLeftClick(e) && onOpenProject?.(r.href, previewRef.current)) e.preventDefault();
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
        className={`block w-full text-left [overflow-wrap:anywhere] transition-colors duration-[160ms] ${
          r.kind === "project" ? "text-lead leading-7 desktop:text-h3" : "text-body"
        } ${tone(i === active)} ${extra}`}
      >
        {r.title}
      </Link>
  );
  const ink = (on: boolean) => (on ? "text-primary" : "text-secondary");
  const list = rows.map((r, i) => (
    <div key={r.href}>
      {i === 0 && heading("Projects", true)}
      {r.kind === "post" && i === bar.projects.length && heading("Journal", false)}
      {rowLink(r, i, ink)}
    </div>
  ));
  // Lab layouts drop the headings: projects lead from the top, the journal
  // sits at the foot of the same column.
  const projectRows = rows.map((r, i) => (r.kind === "project" ? <div key={r.href}>{rowLink(r, i, ink)}</div> : null));
  const postRows = (tone: (on: boolean) => string) =>
    rows.map((r, i) => (r.kind === "post" ? <div key={r.href}>{rowLink(r, i, tone)}</div> : null));

  const scroller = (cls: string, children: ReactNode, h = PANEL_H) => (
    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className={`${h} overflow-y-auto overscroll-contain outline-none ${cls}`}>
      {children}
    </div>
  );

  /* Refined (Work A, Figma 11-17): today's arrangement snapped to the 6-row
     grid. Laptop: names in columns 1-4, journal at their foot; the picture
     fills columns 5-12 over rows 1-5 and its line takes row 6. Phone: the
     picture on rows 1-2, the line on row 3, names below, journal at the foot. */
  if (layout === "refined") {
    return scroller(
      "",
      <div className="grid h-full grid-cols-4 grid-rows-6 gap-x-3 gap-y-3 px-margin pb-4 desktop:grid-site desktop:grid-rows-6 desktop:gap-y-4 desktop:pb-5">
        <div className="col-span-4 row-span-2 row-start-1 desktop:col-span-8 desktop:col-start-5 desktop:row-span-5">{media("h-full")}</div>
        <p className="col-span-4 row-start-3 line-clamp-3 self-start text-[0.9375rem] leading-[1.375rem] text-primary desktop:col-span-6 desktop:col-start-5 desktop:row-start-6">{lead?.line}</p>
        <div className="col-span-4 row-span-2 row-start-4 self-start desktop:col-span-4 desktop:col-start-1 desktop:row-span-5 desktop:row-start-1">{projectRows}</div>
        <div className="col-span-4 row-start-6 self-end desktop:col-span-4 desktop:col-start-1">{postRows(ink)}</div>
      </div>,
    );
  }

  /* Full bleed (Work D, Figma 11-17): the picture fills the window and the
     text sits on it in white, over a shade at the edges. Laptop: names in
     columns 1-4, journal at their foot, the line bottom right in 9-12.
     Phone: the line on top, names and journal at the foot. */
  if (layout === "bleed") {
    const white = (on: boolean) => (on ? "text-white" : "text-white/60 hover:text-white/80");
    return scroller(
      "relative",
      <>
        {media("absolute! inset-0")}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.45),transparent_30%,transparent_55%,rgb(0_0_0/0.65))] desktop:bg-[linear-gradient(to_right,rgb(0_0_0/0.5),transparent_45%),linear-gradient(to_bottom,rgb(0_0_0/0.25),transparent_30%,transparent_60%,rgb(0_0_0/0.6))]" />
        <div className="relative grid h-full grid-cols-4 grid-rows-6 gap-x-3 gap-y-3 px-margin pt-4 pb-4 desktop:grid-site desktop:grid-rows-6 desktop:gap-y-4 desktop:pt-6 desktop:pb-5">
          <p className="col-span-4 col-start-1 row-start-1 self-start text-[0.9375rem] leading-[1.375rem] text-white desktop:col-span-4 desktop:col-start-9 desktop:row-start-6 desktop:self-end desktop:text-body">{lead?.line}</p>
          <div className="col-span-4 col-start-1 row-span-6 row-start-1 flex flex-col justify-end desktop:justify-between">
            <div>{rows.map((r, i) => (r.kind === "project" ? <div key={r.href}>{rowLink(r, i, white)}</div> : null))}</div>
            <div className="pt-3 desktop:pt-0">{postRows(white)}</div>
          </div>
        </div>
      </>,
      PANEL_H_BLEED,
    );
  }


  if (desktop) {
    return (
      <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className={`${PANEL_H} overflow-y-auto overscroll-contain outline-none`}>
        <div className="grid-site px-margin pb-8">
          <div className="col-span-4">{list}</div>
          <div className="sticky top-0 col-span-8 col-start-5 self-start">{preview}</div>
        </div>
      </div>
    );
  }
  return (
    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className={`${PANEL_H} overflow-y-auto overscroll-contain px-margin pb-3 outline-none`}>
      {preview}
      <div className="mt-2">{list}</div>
    </div>
  );
}
