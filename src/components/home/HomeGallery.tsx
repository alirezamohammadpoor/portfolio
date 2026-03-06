"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Link } from "next-view-transitions";
import Lenis from "lenis";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // Lenis smooth snap for gallery
  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return;

    const lenis = new Lenis({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      orientation: "vertical",
      infinite: true,
      syncTouch: true,
    });

    const slideCount = slideRefs.current.filter(Boolean).length;
    const slideHeight = wrapperRef.current.clientHeight;
    let snapTimer: ReturnType<typeof setTimeout>;

    // Track active slide + snap after scroll settles
    let currentIndex = 0;
    lenis.on("scroll", () => {
      const rawIndex = Math.round(lenis.scroll / slideHeight);
      const index = ((rawIndex % slideCount) + slideCount) % slideCount;
      if (index !== currentIndex) {
        currentIndex = index;
        setActiveIndex(index);
      }

      // Debounced snap: wait for scroll to settle, then glide to nearest
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const nearestIndex = Math.round(lenis.scroll / slideHeight);
        const target = nearestIndex * slideHeight;
        lenis.scrollTo(target, {
          duration: 0.2,
          easing: (t: number) => t * t,
        });
      }, 200);
    });

    // RAF loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      clearTimeout(snapTimer);
      lenis.destroy();
    };
  }, [projects]);

  // Gallery slides — slide up and fade in
  useGSAP(
    () => {
      if (!contentRef.current) return;
      const slides = contentRef.current.querySelectorAll(":scope > a");
      if (!slides.length) return;

      gsap.fromTo(
        slides,
        { yPercent: 100, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 2,
          ease: "power3.out",
          delay: 1.7,
        },
      );
    },
    { scope: contentRef },
  );

  const activeProject = projects[activeIndex] ?? projects[0];

  const handleProjectClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      project: PROJECTS_QUERY_RESULT[number],
    ) => {
      // Only intercept image covers — video covers navigate normally
      if (
        project.coverMedia?.type !== "image" ||
        !project.coverMedia.image?.asset
      )
        return;

      e.preventDefault();

      const img = e.currentTarget.querySelector("img");
      const rect = (img ?? e.currentTarget).getBoundingClientRect();
      const imageUrl = urlFor(project.coverMedia.image)
        .width(1200)
        .quality(85)
        .url();
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
    <div
      ref={containerRef}
      className="flex h-[calc(100dvh-var(--header-height))] flex-col justify-end desktop:flex-row desktop:justify-start"
    >
      {/* Project info — updates on scroll */}
      <div className="desktop:w-1/2 desktop:flex desktop:items-center">
        <Link
          href={`/project/${activeProject?.slug?.current}`}
          className="block w-full px-4 py-2 desktop:px-6 desktop:py-0"
        >
          <ProjectCard project={activeProject} />
        </Link>
      </div>

      {/* Cover image gallery — Lenis infinite snap */}
      <div
        ref={wrapperRef}
        data-lenis-prevent
        className="h-[50dvh] overflow-hidden desktop:w-1/2 desktop:h-full"
      >
        <div ref={contentRef}>
          {/* Original slides */}
          {projects.map((project, index) => (
            <Link
              key={project._id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              href={`/project/${project.slug?.current}`}
              aria-label={`View ${project.title ?? "project"}`}
              className="block h-[50dvh] desktop:h-[calc(100dvh-var(--header-height))]"
              onClick={(e) => handleProjectClick(e, project)}
            >
              <MediaPanel
                coverMedia={project.coverMedia}
                title={project.title ?? ""}
                priority={index === 0}
              />
            </Link>
          ))}
          {/* Clone for infinite loop — overflow hidden so it doesn't add scroll height */}
          <div className="h-[50dvh] overflow-hidden desktop:h-[calc(100dvh-var(--header-height))]">
            {projects.map((project) => (
              <Link
                key={`clone-${project._id}`}
                href={`/project/${project.slug?.current}`}
                aria-label={`View ${project.title ?? "project"}`}
                className="block h-[50dvh] desktop:h-[calc(100dvh-var(--header-height))]"
                onClick={(e) => handleProjectClick(e, project)}
              >
                <MediaPanel
                  coverMedia={project.coverMedia}
                  title={project.title ?? ""}
                  priority={false}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
