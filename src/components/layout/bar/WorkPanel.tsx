"use client";

import { useState, type RefObject } from "react";
import { Link } from "@/lib/viewTransitions";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { BarData, BarRow } from "@/sanity/lib/bar";

const FINE_HOVER = "(hover: hover) and (pointer: fine)";

/**
 * Work (Work A, Ali 11-16): the names and a preview that follows. With a
 * real pointer the hovered or focused row leads and a click opens it. On
 * touch everything fits one screen: the first tap on a row previews it,
 * a tap on the previewed row opens it. The preview plays the project's
 * home cover clip over its still, so a switch shows something at once.
 */
export default function WorkPanel({ bar, scrollRef }: { bar: BarData; scrollRef: RefObject<HTMLDivElement | null> }) {
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
      <div className="relative aspect-video overflow-hidden bg-tertiary desktop:aspect-[16/10]">
        {rows.map((r, i) =>
          r.still ? (
            // eslint-disable-next-line @next/next/no-img-element -- stacked stills crossfade in place, no layout
            <img
              key={r.href}
              src={r.still}
              alt=""
              decoding="async"
              loading={i === 0 ? "eager" : "lazy"}
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
      <p className="mt-2 min-h-12 text-body text-primary">{lead?.line}</p>
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
          }
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
        } ${i === active ? "text-primary" : "text-secondary"}`}
      >
        {r.title}
      </Link>
    </div>
  ));

  if (desktop) {
    return (
      <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="max-h-[var(--panel-max)] overflow-y-auto overscroll-contain outline-none">
        <div className="grid-site px-margin pb-8">
          <div className="col-span-4">{list}</div>
          <div className="sticky top-0 col-span-8 col-start-5 self-start">{preview}</div>
        </div>
      </div>
    );
  }
  return (
    <div ref={scrollRef} tabIndex={-1} data-lenis-prevent className="max-h-[var(--panel-max)] overflow-y-auto overscroll-contain px-margin pb-3 outline-none">
      {preview}
      <div className="mt-2">{list}</div>
    </div>
  );
}
