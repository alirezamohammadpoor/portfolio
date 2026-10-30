import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { portableTextComponents } from "@/components/portableText/components";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

/**
 * The project's text as the server renders it, before the client has mounted
 * the laptop panel or the phone stage. Same boxes as those two trees (so the
 * document has the same shape at hydration), kept invisible: the entrance
 * animation of the real tree is the first thing the visitor sees, as before.
 * What this adds is a page with content for crawlers, link previews and
 * visitors without JavaScript, instead of an empty <main>.
 */
export default function ProjectTextShell({ project }: { project: Project }) {
  const description = Array.isArray(project.fullDescription) && project.fullDescription.length > 0
    ? (project.fullDescription as PortableTextBlock[])
    : null;
  const chapters = project.chapters ?? [];
  const hasChapters = chapters.length > 0;
  const links = (
    <>
      {project.siteUrl && (
        <a href={project.siteUrl} target="_blank" rel="noopener noreferrer" className="text-sub uppercase text-primary">
          Visit website
        </a>
      )}
      {project.caseStudy?.slug?.current && (
        <a href={`/journal/${project.caseStudy.slug.current}`} className="text-sub uppercase text-primary">
          {hasChapters ? "Journal post" : "Case study"}
        </a>
      )}
    </>
  );

  return (
    <div className="invisible" data-project-text-shell>
      {/* Laptop and up: the fixed info panel */}
      <div className="hidden desktop:flex fixed top-[var(--header-height)] left-0 w-1/2 h-[calc(100dvh-var(--header-height))] items-center px-6">
        <div>
          {project.title && <h1 className="text-primary">{project.title}</h1>}
          {description && (
            <div className="mt-4 text-body text-primary [&>p]:my-0 [&>p+p]:mt-3">
              <PortableText value={description} components={portableTextComponents} />
            </div>
          )}
          {project.techStack && project.techStack.length > 0 && (
            <p className="mt-6 text-sub text-primary">{project.techStack.join(", ")}</p>
          )}
          <div className="mt-8 flex items-baseline gap-6">{links}</div>
        </div>
      </div>
      {/* Phone and tablet: the stage's title block */}
      <div className="desktop:hidden grid-site px-margin pt-4 pb-4">
        <h1 className="col-span-4 text-h2 text-primary">{project.title}</h1>
        <div className="col-span-4 pt-2 text-sub text-primary">
          {project.shortDescription && <p>{project.shortDescription}</p>}
          {project.techStack && project.techStack.length > 0 && (
            <p className="mt-3 text-primary">{project.techStack.join(", ")}</p>
          )}
          <p className="mt-3 flex gap-4">{links}</p>
        </div>
      </div>
      {/* Chapter page: the case study's text, so the page reads without JS */}
      {chapters.length > 0 && (
        <div className="px-margin">
          {chapters.map((block) =>
            block._type === "testSwitcher" ? (
              <section key={block._key} className="mt-10">
                {block.title && <h2 className="text-h2 text-primary">{block.title}</h2>}
                {(block.tests ?? []).map((test) => (
                  <section key={test._key} className="mt-6">
                    {test.title && <h3 className="text-h3 text-primary">{test.title}</h3>}
                    {test.status && <p className="text-sub text-secondary">{test.status}</p>}
                    {Array.isArray(test.text) && test.text.length > 0 && (
                      <div className="mt-4 text-body text-primary">
                        <PortableText value={test.text as PortableTextBlock[]} components={portableTextComponents} />
                      </div>
                    )}
                    {[
                      ["Hypothesis", test.hypothesis],
                      ["Metric", test.metric],
                      ["Result", test.result],
                      ["Decision", test.decision],
                    ].map(([k, v]) =>
                      v ? (
                        <p key={k} className="mt-2 text-body text-primary">
                          <span className="text-sub uppercase text-secondary">{k}</span> {v}
                        </p>
                      ) : null,
                    )}
                    {test.caption && <p className="mt-3 text-sub text-secondary">{test.caption}</p>}
                  </section>
                ))}
              </section>
            ) : (
              <section key={block._key} className="mt-10">
                {block.title && <h2 className="text-h2 text-primary">{block.title}</h2>}
                {Array.isArray(block.text) && block.text.length > 0 && (
                  <div className="mt-4 text-body text-primary">
                    <PortableText value={block.text as PortableTextBlock[]} components={portableTextComponents} />
                  </div>
                )}
                {block.caption && <p className="mt-3 text-sub text-secondary">{block.caption}</p>}
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
