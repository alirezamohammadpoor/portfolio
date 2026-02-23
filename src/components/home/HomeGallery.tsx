"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";
import { usePageTransition } from "@/context/TransitionContext";
import ProjectCard from "./ProjectCard";
import MediaPanel from "./MediaPanel";

interface HomeGalleryProps {
  projects: PROJECTS_QUERY_RESULT;
}

export default function HomeGallery({ projects }: HomeGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const router = useRouter();
  const { startTransition } = usePageTransition();

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

  // Gallery slides — slide up and fade in
  useGSAP(
    () => {
      if (!scrollRef.current) return;
      const slides = scrollRef.current.children;
      if (!slides.length) return;

      // Reset scroll so displaced slides don't cause snap to jump
      scrollRef.current.scrollTop = 0;

      gsap.fromTo(
        slides,
        { yPercent: 100, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
        },
      );
    },
    { scope: scrollRef },
  );

  const activeProject = projects[activeIndex];

  const handleProjectClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, project: PROJECTS_QUERY_RESULT[number]) => {
      // Only intercept image covers — video covers navigate normally
      if (project.coverMedia?.type !== "image" || !project.coverMedia.image?.asset) return;

      e.preventDefault();

      const img = e.currentTarget.querySelector("img");
      const rect = (img ?? e.currentTarget).getBoundingClientRect();
      const imageUrl = urlFor(project.coverMedia.image).width(1200).quality(85).url();
      const href = `/project/${project.slug?.current}`;

      startTransition(imageUrl, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      // Fade out the entire page, then navigate
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          autoAlpha: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => router.push(href),
        });
      } else {
        router.push(href);
      }
    },
    [startTransition, router],
  );

  return (
    <div ref={containerRef} className="flex h-[calc(100dvh-var(--header-height))] flex-col justify-end desktop:flex-row desktop:justify-start">
      {/* Project info — updates on scroll */}
      <div className="desktop:w-1/2 desktop:flex desktop:items-center">
        <Link
          href={`/project/${activeProject?.slug?.current}`}
          className="block w-full px-6 py-2 desktop:py-0"
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
            onClick={(e) => handleProjectClick(e, project)}
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
