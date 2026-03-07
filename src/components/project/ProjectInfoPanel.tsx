import type { RefObject } from "react";
import NextLink from "next/link";
import { Link } from "next-view-transitions";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import TechStack from "@/components/project/TechStack";

interface ProjectInfoPanelProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
  hidden: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  descRef: RefObject<HTMLParagraphElement | null>;
  techRef: RefObject<HTMLDivElement | null>;
  linksRef: RefObject<HTMLDivElement | null>;
}

export default function ProjectInfoPanel({
  project,
  hidden,
  panelRef,
  titleRef,
  descRef,
  techRef,
  linksRef,
}: ProjectInfoPanelProps) {
  return (
    <div
      ref={panelRef}
      className={`hidden desktop:flex fixed top-[var(--header-height)] left-0 w-1/2 h-[calc(100dvh-var(--header-height))] items-center px-6${hidden ? " invisible" : ""}`}
    >
      <div>
        {project.title && (
          <h1 ref={titleRef} className="text-primary">
            {project.title}
          </h1>
        )}
        {project.fullDescription && (
          <p ref={descRef} className="mt-4 text-body text-primary">
            {project.fullDescription}
          </p>
        )}
        {project.techStack && project.techStack.length > 0 && (
          <div ref={techRef} className="mt-6">
            <p className="text-sub text-secondary">Tech stack</p>
            <TechStack items={project.techStack} />
          </div>
        )}
        <div ref={linksRef} className="mt-8 flex items-baseline gap-6">
          {project.caseStudy?.slug?.current && (
            <Link
              href={`/journal/${project.caseStudy.slug.current}`}
              data-pill
              className="invisible rounded-full bg-pistachio px-4 pt-[7px] pb-[5px] text-sub uppercase text-primary hover:bg-lightpistachio transition-colors duration-200"
            >
              Case study
            </Link>
          )}
          {project.siteUrl && (
            <NextLink
              href={project.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-sub uppercase text-primary"
            >
              Visit website
            </NextLink>
          )}
        </div>
      </div>
    </div>
  );
}
