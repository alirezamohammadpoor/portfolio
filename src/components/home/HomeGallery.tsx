"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import ProjectCard from "./ProjectCard";
import MediaPanel from "./MediaPanel";

interface HomeGalleryProps {
  projects: PROJECTS_QUERY_RESULT;
}

export default function HomeGallery({ projects }: HomeGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const slides = slideRefs.current.filter(Boolean) as HTMLAnchorElement[];
    if (!slides.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slides.indexOf(entry.target as HTMLAnchorElement);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: scrollRef.current, threshold: 0.6 }
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [projects]);

  const activeProject = projects[activeIndex];

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] flex-col justify-end desktop:flex-row desktop:justify-start">
      {/* Project info — updates on scroll */}
      <div className="desktop:w-1/2 desktop:flex desktop:items-center desktop:justify-center">
        <Link
          href={`/project/${activeProject?.slug?.current}`}
          className="block py-2 desktop:py-0"
        >
          <ProjectCard project={activeProject} index={activeIndex} />
        </Link>
      </div>

      {/* Cover image gallery — native snap scroll */}
      <div
        ref={scrollRef}
        className="h-[50dvh] overflow-y-auto snap-y snap-mandatory desktop:w-1/2 desktop:h-full"
      >
        {projects.map((project, index) => (
          <Link
            key={project._id}
            ref={(el) => { slideRefs.current[index] = el; }}
            href={`/project/${project.slug?.current}`}
            className="block h-full snap-start"
          >
            <MediaPanel
              coverMedia={project.coverMedia}
              title={project.title ?? ""}
              priority={index === 0}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
