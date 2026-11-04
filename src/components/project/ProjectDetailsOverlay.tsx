"use client";

import { useEffect, useRef } from "react";
import NextLink from "next/link";
import { Link } from "@/lib/viewTransitions";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { portableTextComponents } from "@/components/portableText/components";
import { EASE_OUT_CSS } from "@/lib/motion";
import CopyButton from "@/components/CopyButton";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

/**
 * The project's text over the whole gallery (Ali, 11-04, after elodiefabbri.com):
 * the page itself is only media, and the name pill at the top opens this. The
 * gallery stays visible behind a blur; Esc, the Close pill or a click outside
 * the text closes it. Case study and Visit live here, not on the page.
 */
export default function ProjectDetailsOverlay({
  project,
  open,
  onClose,
  reduceMotion,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
  reduceMotion: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const description =
    Array.isArray(project.fullDescription) && project.fullDescription.length > 0
      ? (project.fullDescription as PortableTextBlock[])
      : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // One beat (choreograph): the frost and the text arrive together in
  // 240 ms, the text rising 8 px; closing is faster (160 ms) and all at once,
  // a plain fade. Reduced motion keeps the fade, drops the rise.
  const ms = open ? 240 : 160;
  const fade = `opacity ${ms}ms ${EASE_OUT_CSS}, visibility ${ms}ms`;
  // On close the text only fades; it drops back to its start offset once
  // it is invisible (the delayed 0 s transform), ready for the next open.
  const lift = open
    ? `transform ${reduceMotion ? 0 : ms}ms ${EASE_OUT_CSS}, opacity ${ms}ms ${EASE_OUT_CSS}`
    : `opacity ${ms}ms ${EASE_OUT_CSS}, transform 0s ${ms}ms`;

  return (
    <div
      id="project-details"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title ?? "Project"} details`}
      aria-hidden={!open}
      className="frost-strong absolute inset-0 z-40"
      style={{
        opacity: open ? 1 : 0,
        visibility: open ? "visible" : "hidden",
        transition: fade,
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
        className="mx-auto flex min-h-full max-w-[44rem] flex-col px-margin pt-20 pb-28 desktop:pt-24"
        style={{ transform: open || reduceMotion ? "none" : "translateY(8px)", opacity: open ? 1 : 0, transition: lift }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {project.shortDescription && (
          <p className="text-h3 text-primary desktop:text-h2 desktop:text-center">{project.shortDescription}</p>
        )}
        {description && (
          <div className="mt-6 text-body text-primary desktop:mt-10 desktop:text-lead [&_p+p]:mt-4">
            <PortableText value={description} components={portableTextComponents} />
          </div>
        )}
        {project.techStack && project.techStack.length > 0 && (
          <p className="mt-6 text-body text-secondary">{project.techStack.join(", ")}</p>
        )}
        <div className="mt-6 flex flex-col gap-1 text-body text-primary">
          {project.caseStudy?.slug?.current && (
            <Link href={`/journal/${project.caseStudy.slug.current}`} className="w-fit hover:opacity-60">
              Read the case study →
            </Link>
          )}
          {project.siteUrl && (
            <NextLink href={project.siteUrl} target="_blank" rel="noopener noreferrer" className="w-fit hover:opacity-60">
              Visit the site ↗<span className="sr-only"> (opens in a new tab)</span>
            </NextLink>
          )}
          {project.sitePassword && (
            <CopyButton value={project.sitePassword} label="Copy the site password" className="w-fit cursor-pointer text-left hover:opacity-60" />
          )}
        </div>
      </div>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className="frost-soft absolute bottom-8 left-1/2 inline-flex h-9 -translate-x-1/2 items-center rounded-full px-4 text-sub uppercase font-medium text-primary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97]"
      >
        Close
      </button>
    </div>
  );
}
