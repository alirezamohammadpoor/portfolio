"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl } from "@/sanity/lib/image";
import { EASE_OUT_CSS } from "@/lib/motion";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
export type SwitcherProject = Project["allProjects"][number];

type Props = {
  projects: SwitcherProject[];
  currentSlug: string | undefined;
  open: boolean;
  onClose: () => void;
  /** Open another project; `media` is the cover the morph starts from. */
  onPick: (slug: string, media: HTMLElement | null) => void;
  isDesktop: boolean;
  reduceMotion: boolean;
};

/** The project's first card as a still: a clip's poster, an image, a phone's poster. */
export function switcherStill(p: SwitcherProject, width: number): string | null {
  const f = p.first;
  if (!f) return null;
  const src = f._type === "galleryVideo" ? f.poster : f._type === "galleryImage" ? f.image : (f.phone?.poster ?? f.phone?.image);
  if (!src?.asset) return null;
  return imageUrl(src as Parameters<typeof imageUrl>[0], width);
}

export function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

const ROUND_BUTTON =
  "frost-soft inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.94]";

/**
 * Every project from a project page (Figma "Project switcher · 11-05", B;
 * Ali 11-09 picked it over the zoom-out reel after trying both in code). The
 * round grid button that leads the filmstrip opens it; the button's place at
 * the bottom becomes Close. The stage frosts over and all covers sit on
 * columns 3-10 (two columns on a phone), the current one outlined, names
 * under.
 *
 * A cover is the project's first card, so picking one morphs it onto the
 * page it opens (the same in-place transition as the next-project pill).
 */
export default function ProjectSwitcher({ projects, currentSlug, open, onClose, onPick, isDesktop, reduceMotion }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cur = Math.max(0, projects.findIndex((p) => p.slug?.current === currentSlug));

  // Modal for the keyboard, as the details overlay: Escape closes, Tab stays
  // inside, focus lands on the current project and returns to the opener.
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])'));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    root?.querySelector<HTMLElement>(`[data-switcher-card="${cur}"]`)?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      const active = document.activeElement;
      if (opener && opener.isConnected && (!active || active === document.body || root?.contains(active))) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, cur]);

  const pick = (p: SwitcherProject, card: HTMLElement) => {
    const slug = p.slug?.current;
    if (!slug || slug === currentSlug) {
      onClose();
      return;
    }
    onPick(slug, card.querySelector<HTMLElement>("[data-switcher-media]"));
  };

  // Same beat as the details overlay: in 240 ms, out 160 ms.
  const ms = open ? 240 : 160;
  const fade = `opacity ${ms}ms ${EASE_OUT_CSS}, visibility 0s${open ? "" : ` linear ${ms}ms`}`;
  const settle = open
    ? `transform ${reduceMotion ? 0 : ms + 80}ms ${EASE_OUT_CSS}, opacity ${ms}ms ${EASE_OUT_CSS}`
    : `opacity ${ms}ms ${EASE_OUT_CSS}, transform 0s ${ms}ms`;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="All projects"
      aria-hidden={!open}
      inert={!open || undefined}
      className="frost-strong absolute inset-0 z-40"
      style={{ opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden", transition: fade }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 overflow-y-auto"
        data-lenis-prevent
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="grid-site min-h-full content-center px-margin pt-16 pb-28"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <ul
            className="col-span-4 grid grid-cols-2 gap-x-3 gap-y-5 desktop:col-span-8 desktop:col-start-3 desktop:grid-cols-3 desktop:gap-x-4 desktop:gap-y-7"
            style={{ transform: open || reduceMotion ? "none" : "translateY(8px)", opacity: open ? 1 : 0, transition: settle }}
          >
            {projects.map((p, i) => {
              const src = switcherStill(p, isDesktop ? 640 : 400);
              return (
                <li key={p._id}>
                  <button
                    type="button"
                    data-switcher-card={i}
                    aria-current={i === cur ? "page" : undefined}
                    onClick={(e) => pick(p, e.currentTarget)}
                    className="group flex w-full cursor-pointer flex-col gap-2 text-left"
                  >
                    <span
                      data-switcher-media
                      className="relative block aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-tertiary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-active:scale-[0.98]"
                      style={i === cur ? { outline: "1.5px solid var(--color-primary)", outlineOffset: 3 } : undefined}
                    >
                      {src && <Image src={src} alt="" fill unoptimized sizes="(min-width: 75rem) 300px, 50vw" className="object-cover" />}
                    </span>
                    <span className="truncate text-body text-primary">{p.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Close sits where the index button opened it, on the filmstrip row. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-margin pb-11 desktop:pb-12">
        <button type="button" onClick={onClose} aria-label="Close all projects" className={`${ROUND_BUTTON} pointer-events-auto`}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

export { ROUND_BUTTON };
