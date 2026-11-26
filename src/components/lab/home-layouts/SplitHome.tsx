"use client";

import { useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "@/lib/viewTransitions";
import {
  Closing,
  Cover,
  STATEMENT,
  href,
  useEntrance,
  useOpenProject,
  type VariantProps,
} from "./shared";

/**
 * Split: the scroll reads like a page. The recordings run down the right
 * two thirds at one size, one after another; the left third holds still
 * and names the project whose recording crosses the middle of the screen.
 * Text and picture are always side by side, and the text never repeats
 * under every cover.
 */
export default function SplitHome({ projects, contact, rootRef }: VariantProps) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const rows = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>("[data-split-row]") ?? [],
      );
      rows.forEach((row, i) => {
        ScrollTrigger.create({
          trigger: row,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });
    },
    { scope: rootRef, dependencies: [projects.length] },
  );

  return (
    <div ref={rootRef} className="px-margin pb-40">
      <section className="grid grid-cols-12 gap-4 pt-12">
        <h2 data-statement className="col-start-1 col-end-8 text-h1">
          {STATEMENT}
        </h2>
      </section>

      <div className="mt-16 grid grid-cols-12 gap-4">
        {/* The held column: every project's text in one cell, the active one
            shown. Swapping is a short fade and rise, never a slide across. */}
        <div
          className="sticky top-[calc(var(--header-height)+3rem)] col-start-1 col-end-5 self-start"
          data-item
        >
          <div data-text className="grid">
            {projects.map((project, i) => (
              <Link
                key={project._id}
                href={href(project)}
                onClick={(e) => open(e, project)}
                tabIndex={i === active ? undefined : -1}
                aria-hidden={i === active ? undefined : true}
                className={`col-start-1 row-start-1 block pr-8 transition-[opacity,transform] duration-200 ease-out ${
                  i === active
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-2 opacity-0"
                }`}
              >
                <h3 className="text-h2">
                  <span className="link-highlight">{project.title}</span>
                </h3>
                <p className="mt-4 text-lead text-primary">{project.shortDescription}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="col-start-5 col-end-13 flex flex-col gap-4">
          {projects.map((project, i) => (
            <article key={project._id} data-split-row data-item>
              <Link
                href={href(project)}
                onClick={(e) => open(e, project)}
                aria-label={`View ${project.title ?? "project"}`}
                className="block"
                data-reveal
              >
                <Cover project={project} priority={i === 0} sizes="66vw" />
              </Link>
            </article>
          ))}
        </div>
      </div>

      <Closing contact={contact} className="mt-40" />
    </div>
  );
}
