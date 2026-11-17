"use client";

import { useState } from "react";
import { Link } from "@/lib/viewTransitions";
import type { BarData, BarRow } from "@/sanity/lib/bar";

const FINE_HOVER = "(hover: hover) and (pointer: fine)";

/**
 * Home as a full-bleed index (Figma "Home full bleed · bar", 11-17): the
 * leading project fills the screen and the text sits on it in white.
 * Laptop: Projects down the left four columns, Journal at their foot, the
 * project's line bottom right in columns 9-12. Phone: the line under the
 * bar, names and journal at the foot. Same reading as the Work panel: a
 * real pointer leads by hover and opens on click; on touch the first tap
 * leads, the second opens.
 */
export default function FullBleedHome({ bar }: { bar: BarData }) {
  const rows: (BarRow & { kind: "project" | "post" })[] = [
    ...bar.projects.map((r) => ({ ...r, kind: "project" as const })),
    ...bar.posts.map((r) => ({ ...r, kind: "post" as const })),
  ];
  const [active, setActive] = useState(0);
  const lead = rows[active] ?? rows[0];

  const row = (r: (typeof rows)[number], i: number) => (
    <Link
      key={r.href}
      href={r.href}
      onClick={(e) => {
        if (i !== active && !window.matchMedia(FINE_HOVER).matches) {
          e.preventDefault();
          setActive(i);
        }
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setActive(i);
      }}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) setActive(i);
      }}
      aria-current={i === active ? "true" : undefined}
      className={`block w-fit max-w-full [overflow-wrap:anywhere] transition-colors duration-[160ms] ${
        r.kind === "project" ? "text-h3 desktop:text-h2" : "text-body"
      } ${i === active ? "text-white" : "text-white/60 hover:text-white/85"}`}
    >
      {r.title}
    </Link>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-primary">
      {/* The picture: every still stacked (crossfade). No clips here: the recorded
          clips carry the client site's own nav band and captions. */}
      {rows.map((r, i) =>
        r.still ? (
          // eslint-disable-next-line @next/next/no-img-element -- stacked stills crossfade in place
          <img
            key={r.href}
            src={r.still}
            alt=""
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[240ms] ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ) : null,
      )}
      {/* Shade at the edges, so white type reads on any picture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.45),transparent_25%,transparent_45%,rgb(0_0_0/0.7))] desktop:bg-[linear-gradient(to_right,rgb(0_0_0/0.5),transparent_45%),linear-gradient(to_bottom,rgb(0_0_0/0.35),transparent_18%,transparent_70%,rgb(0_0_0/0.55))]"
      />

      <div className="relative grid h-full grid-cols-4 grid-rows-1 gap-x-3 px-margin pt-[calc(var(--header-height)+12px)] pb-7 desktop:grid-site desktop:pb-8">
        <p className="col-span-4 col-start-1 row-start-1 self-start text-[0.9375rem] leading-[1.375rem] text-white desktop:col-span-4 desktop:col-start-9 desktop:self-end desktop:text-lead">
          {lead?.line}
        </p>
        <div className="col-span-4 col-start-1 row-start-1 flex min-h-0 flex-col justify-end gap-6 desktop:justify-between">
          <div>
            <h2 className="pb-1 text-sub text-white/70">Projects</h2>
            {rows.map((r, i) => (r.kind === "project" ? row(r, i) : null))}
          </div>
          {bar.posts.length > 0 && (
            <div>
              <h2 className="pb-1 text-sub text-white/70">Journal</h2>
              {rows.map((r, i) => (r.kind === "post" ? row(r, i) : null))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
