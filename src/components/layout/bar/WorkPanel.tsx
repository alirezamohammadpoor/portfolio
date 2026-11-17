"use client";

import { useRef, useState, type RefObject } from "react";
import { Link } from "@/lib/viewTransitions";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { isPlainLeftClick } from "@/lib/clicks";
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
  // Every row, project or post, is one lead line on a phone (28) and one h3
  // line on a laptop (32).
  const count = bar.projects.length + bar.posts.length;
  const rows = 28 * count;
  const phone = `calc((100vw - 64px) * 9 / 16 + ${8 + 48 + 24 + 12 + 20 + (bar.posts.length ? 36 : 0) + rows}px)`;
  const laptop = `${Math.ceil(Math.max(403.34 + 8 + 96 + 32, 32 + 20 + (bar.posts.length ? 52 : 0) + 32 * count))}px`;
  return { "--panel-h": phone, "--panel-h-desk": laptop } as Record<string, string>;
}
export const PANEL_H = "h-[min(var(--panel-h),var(--panel-max))] desktop:h-[min(var(--panel-h-desk),var(--panel-max))]";

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
  const [active, setActive] = useState(0);
  const lead = rows[active] ?? rows[0];

  const preview = (
    <div>
      {/* 16:9 on a phone (one screen with every name), 16:10 on a laptop. */}
      <div ref={previewRef} className="relative aspect-video overflow-hidden bg-tertiary desktop:aspect-[16/10]">
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
      {/* A fixed box for the line: three lines on a phone, four on a laptop
          (the longest line on the site), so a longer one never moves the list. */}
      <p className="mt-2 line-clamp-3 h-12 text-sub text-primary desktop:line-clamp-4 desktop:h-24 desktop:text-body">{lead?.line}</p>
    </div>
  );

  const heading = (text: string, first: boolean) => (
    <h2 className={`${first ? "" : "pt-4 desktop:pt-8"} pb-1 text-sub text-secondary`}>{text}</h2>
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
          "text-lead desktop:text-h3"
        } ${i === active ? "text-primary" : "text-secondary"}`}
      >
        {r.title}
      </Link>
    </div>
  ));

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
      <div className="mt-6">{list}</div>
    </div>
  );
}
