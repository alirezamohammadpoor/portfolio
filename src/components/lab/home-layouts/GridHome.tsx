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
 * Grid: the overview. Every project at the same size, two to a row, so the
 * whole body of work reads at a glance (Panagora's index) while each
 * recording stays big enough to watch (half the screen, not a thumbnail).
 * Title and one short line under each cover; nothing alternates.
 */
export default function GridHome({ projects, contact, rootRef }: VariantProps) {
  useEntrance(rootRef);
  const open = useOpenProject(rootRef);
  return (
    <div ref={rootRef} className="px-margin pb-40">
      <section className="grid grid-cols-12 gap-4 pt-12">
        <h2 data-statement className="col-start-1 col-end-8 text-h1">
          {STATEMENT}
        </h2>
      </section>

      <div className="mt-16 grid grid-cols-2 gap-x-4 gap-y-16">
        {projects.map((project, i) => (
          <article key={project._id} data-item className="group">
            <Link
              href={href(project)}
              onClick={(e) => open(e, project)}
              className="block"
              aria-label={`View ${project.title ?? "project"}`}
            >
              <div data-reveal>
                <Cover project={project} priority={i < 2} sizes="50vw" />
              </div>
              <div data-text className="mt-4 grid grid-cols-6 gap-4">
                <h3 className="col-span-2 text-h3">
                  <span className="link-highlight">{project.title}</span>
                </h3>
                <p className="col-span-4 line-clamp-2 text-body text-primary">
                  {project.shortDescription}
                </p>
              </div>
            </Link>
          </article>
        ))}
      </div>

      <Closing contact={contact} className="mt-40" />
    </div>
  );
}
