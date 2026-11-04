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

  const fade = reduceMotion ? "none" : `opacity 240ms ${EASE_OUT_CSS}, visibility 240ms`;
  const lift = reduceMotion ? "none" : `transform 320ms ${EASE_OUT_CSS}, opacity 320ms ${EASE_OUT_CSS}`;

  return (
    <div
      id="project-details"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title ?? "Project"} details`}
      aria-hidden={!open}
      className="absolute inset-0 z-40"
      style={{
        backgroundColor: "var(--frost-strong-bg)",
        backdropFilter: "blur(var(--frost-strong-blur))",
        WebkitBackdropFilter: "blur(var(--frost-strong-blur))",
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
        style={{ transform: open ? "none" : "translateY(12px)", opacity: open ? 1 : 0, transition: lift }}
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
        style={{ backgroundColor: "var(--pill-bg)" }}
        className="absolute bottom-8 left-1/2 inline-flex h-9 -translate-x-1/2 items-center rounded-full border border-tertiary px-4 text-sub uppercase font-medium text-primary active:scale-[0.97]"
      >
        Close
      </button>
    </div>
  );
}
