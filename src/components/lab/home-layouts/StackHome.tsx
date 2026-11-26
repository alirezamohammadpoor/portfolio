"use client";

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
 * Stack: one project per screen. Each recording is as large as the window
 * allows (Elodie Fabbri's cover size, vertical instead of a reel), centred,
 * with its title and line on one row above it. The page is a sequence you
 * walk through, not a field you scan.
 */
export default function StackHome({ projects, contact, rootRef }: VariantProps) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  // The cover is sized by the screen's height: a 16:10 box that leaves room
  // for the title row and some air, never wider than the margins.
  const width = "w-[min(100%,calc((100svh-var(--header-height)-9rem)*1.6))]";
  return (
    <div ref={rootRef} className="px-margin pb-40">
      <section className="grid grid-cols-12 gap-4 pt-12">
        <h2 data-statement className="col-start-1 col-end-8 text-h1">
          {STATEMENT}
        </h2>
      </section>

      <div className="mt-16 flex flex-col gap-32">
        {projects.map((project, i) => (
          <article key={project._id} data-item className={`mx-auto ${width}`}>
            <Link
              href={href(project)}
              onClick={(e) => open(e, project)}
              className="block"
              aria-label={`View ${project.title ?? "project"}`}
            >
              <div data-text className="mb-4 flex items-end justify-between gap-16">
                <h3 className="shrink-0 text-h2">
                  <span className="link-highlight">{project.title}</span>
                </h3>
                <p className="max-w-[34rem] text-right text-body text-primary">
                  {project.shortDescription}
                </p>
              </div>
              <div data-reveal>
                <Cover project={project} priority={i === 0} sizes="90vw" />
              </div>
            </Link>
          </article>
        ))}
      </div>

      <Closing contact={contact} className="mt-40" />
    </div>
  );
}
