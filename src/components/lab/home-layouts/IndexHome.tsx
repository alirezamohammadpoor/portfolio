"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/viewTransitions";
import { prefersReducedMotion } from "@/lib/motion";
import {
  Closing,
  Cover,
  STATEMENT,
  href,
  useEntrance,
  useOpenProject,
  type VariantProps,
} from "./shared";

/** How long a project holds the preview when nobody is pointing, ms. */
const HOLD_MS = 6000;

/**
 * Index: one screen, a list and one big preview. Every project's name sits
 * in a column on the left; the preview on the right plays the one you point
 * at (or focus), large, with its line under it. Nobody pointing: the preview
 * moves on by itself every few seconds, so a visitor who only watches still
 * sees the whole body of work. The overview is the list, the content is the
 * preview, so neither has to shrink.
 */
export default function IndexHome({ projects, contact, rootRef }: VariantProps) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const count = projects.length;

  useEffect(() => {
    if (held || count < 2 || prefersReducedMotion()) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % count), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [active, held, count]);

  const current = projects[active];

  return (
    <div ref={rootRef} className="px-margin pb-40">
      <section
        className="grid h-[calc(100svh-var(--header-height))] grid-cols-12 gap-4 pb-8 pt-12"
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
      >
        <div className="col-start-1 col-end-5 flex min-h-0 flex-col justify-between">
          <h2 data-statement className="text-h2">
            {STATEMENT}
          </h2>
          <ul data-item className="flex flex-col">
            {projects.map((project, i) => (
              <li key={project._id} data-text>
                <Link
                  href={href(project)}
                  onClick={(e) => open(e, project)}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => {
                    setActive(i);
                    setHeld(true);
                  }}
                  onBlur={() => setHeld(false)}
                  aria-current={i === active ? "true" : undefined}
                  className={`block text-h2 transition-colors duration-150 ease-out ${i === active ? "text-primary" : "text-secondary hover:text-primary"}`}
                >
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div data-item className="col-start-5 col-end-13 flex min-h-0 flex-col justify-start">
          <Link
            href={current ? href(current) : "/"}
            onClick={(e) => current && open(e, current)}
            aria-label={`View ${current?.title ?? "project"}`}
            data-reveal
            // The box takes the column's width unless the screen is too short
            // for it, then its height decides (16:10 kept).
            className="relative ml-auto block aspect-[16/10] w-[min(100%,calc((100svh-var(--header-height)-10rem)*1.6))]"
          >
            {projects.map((project, i) => (
              <div
                key={project._id}
                className={`absolute inset-0 transition-opacity duration-200 ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
                aria-hidden={i === active ? undefined : true}
              >
                <Cover
                  project={project}
                  playing={i === active}
                  priority={i === 0}
                  sizes="66vw"
                  className="h-full"
                />
              </div>
            ))}
          </Link>
          <p
            data-text
            className="ml-auto mt-4 line-clamp-2 min-h-12 w-[min(100%,calc((100svh-var(--header-height)-10rem)*1.6))] max-w-full text-body text-primary"
          >
            {current?.shortDescription}
          </p>
        </div>
      </section>

      <Closing contact={contact} className="mt-24" />
    </div>
  );
}
