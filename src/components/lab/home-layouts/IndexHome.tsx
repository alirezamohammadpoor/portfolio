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

/** How long a project holds the screen when nobody is pointing, ms. */
const HOLD_MS = 6000;

/**
 * Index, round 2 (Ali 11-26): the content takes the screen and the index
 * sits on top of it. One frosted panel, bottom left, holds the statement,
 * every project's name and the line of the one showing; pointing at (or
 * focusing) a name swaps the recording. Nobody pointing: it moves on by
 * itself every few seconds.
 *
 * "bleed": the recording fills the whole screen, under the Pebble too.
 * "window": the recording keeps its project window, as big as the screen's
 * height allows, and the panel overlaps its lower left corner.
 */
export default function IndexHome({
  projects,
  contact,
  rootRef,
  bleed,
}: VariantProps & { bleed: boolean }) {
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

  const stage = projects.map((project, i) => (
    <div
      key={project._id}
      className={`absolute inset-0 transition-opacity duration-200 ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
      aria-hidden={i === active ? undefined : true}
    >
      <Cover
        project={project}
        playing={i === active}
        priority={i === 0}
        frame={bleed ? "bleed" : undefined}
        className={bleed ? "h-full w-full" : "h-full w-full"}
      />
    </div>
  ));

  return (
    <div ref={rootRef} className="pb-40">
      <section
        className={
          bleed
            ? "relative -mt-[var(--header-height)] h-svh"
            : "relative flex h-[calc(100svh-var(--header-height))] items-center justify-end px-margin pb-6 pt-6"
        }
      >
        <Link
          href={current ? href(current) : "/"}
          onClick={(e) => current && open(e, current)}
          aria-label={`View ${current?.title ?? "project"}`}
          data-item
          className={
            bleed ? "absolute inset-0 block" : "relative block aspect-[16/10] h-full max-w-full"
          }
        >
          <div data-reveal className="absolute inset-0">
            {stage}
          </div>
        </Link>

        <div
          data-item
          className="frost-strong absolute bottom-6 left-[var(--spacing-margin,24px)] w-[26rem] rounded-3xl p-6 shadow-[0_10px_24px_-6px_rgb(0_0_0/0.14)] desktop:left-6"
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
        >
          <h2 data-text className="text-h3">
            {STATEMENT}
          </h2>
          <ul data-text className="mt-8 flex flex-col">
            {projects.map((project, i) => (
              <li key={project._id}>
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
                  className={`block text-h3 transition-colors duration-150 ease-out ${i === active ? "text-primary" : "text-secondary hover:text-primary"}`}
                >
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
          <p data-text className="mt-6 line-clamp-3 min-h-18 text-body text-primary">
            {current?.shortDescription}
          </p>
        </div>
      </section>

      <div className="px-margin">
        <Closing contact={contact} className="mt-24" />
      </div>
    </div>
  );
}
