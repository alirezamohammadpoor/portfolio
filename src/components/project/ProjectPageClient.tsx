"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";
import Footer from "@/components/layout/Footer";
import DetailsDrawer from "@/components/project/DetailsDrawer";
import TechStack from "@/components/project/TechStack";

interface ProjectPageClientProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
}

export default function ProjectPageClient({ project }: ProjectPageClientProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      {/* Desktop: static left panel */}
      <div className="hidden desktop:flex fixed top-[var(--header-height)] left-0 w-1/2 h-[calc(100dvh-var(--header-height))] items-center px-6">
        <div>
          {project.title && (
            <h1 className="text-h1 text-primary">{project.title}</h1>
          )}
          {project.fullDescription && (
            <p className="mt-4 text-body text-primary">{project.fullDescription}</p>
          )}
          {project.techStack && project.techStack.length > 0 && (
            <div className="mt-6">
              <p className="text-sub text-secondary">Tech stack</p>
              <TechStack items={project.techStack} />
            </div>
          )}
          <div className="mt-8 flex gap-6">
            {project.caseStudy?.slug?.current && (
              <Link href={`/journal/${project.caseStudy.slug.current}`} className="text-sub uppercase text-primary">
                Case study
              </Link>
            )}
            {project.siteUrl && (
              <Link href={project.siteUrl} target="_blank" rel="noopener noreferrer" className="text-sub uppercase text-primary">
                Visit website
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-2 px-6 pb-10 desktop:ml-[50%] desktop:w-1/2">
        {project.images?.map((image, i) => (
          <div key={image._key} className="relative h-[70dvh] w-full bg-tertiary">
            {image.asset && (
              <Image
                src={urlFor(image).width(1200).quality(85).url()}
                alt={`${project.title} — ${i + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i === 0}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile only */}
      <DetailsDrawer project={project} isOpen={detailsOpen} />

      <Footer
        projectTitle={project.title ?? undefined}
        siteUrl={project.siteUrl ?? undefined}
        caseStudySlug={project.caseStudy?.slug?.current ?? undefined}
        onDetailsToggle={() => setDetailsOpen((prev) => !prev)}
        detailsOpen={detailsOpen}
      />
    </>
  );
}
