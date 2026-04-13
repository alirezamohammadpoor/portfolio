"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Link } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { urlFor, fileUrl } from "@/sanity/lib/image";
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
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const tapHintRef = useRef<HTMLDivElement>(null);
  const cursorHintRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const hasTapped = useRef(false);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // Snap gallery — one scroll gesture = one slide, infinite loop via GSAP transforms
  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {}, wrapperRef.current);
    const slides = slideRefs.current.filter(Boolean) as HTMLElement[];
    const slideCount = slides.length;
    if (!slideCount) return;
    let currentIndex = 0; // always 0..slideCount-1
    let isAnimating = false;

    function goToSlide(direction: 1 | -1) {
      if (isAnimating) return;
      isAnimating = true;

      const nextIndex = (currentIndex + direction + slideCount) % slideCount;

      // Hide scroll hints on first interaction
      if (!hasScrolled.current) {
        hasScrolled.current = true;
        if (scrollHintRef.current) {
          ctx.add(() => {
            gsap.to(scrollHintRef.current, { autoAlpha: 0, duration: 0.4, ease: "power2.out" });
          });
        }
      }

      const currentEl = slides[currentIndex];
      const nextEl = slides[nextIndex];

      ctx.add(() => {
        // Position next slide off-screen in the scroll direction
        gsap.set(nextEl, {
          yPercent: direction > 0 ? 100 : -100,
          autoAlpha: 1,
        });

        const tl = gsap.timeline({
          onComplete: () => {
            currentIndex = nextIndex;
            setActiveIndex(nextIndex);
            // Hold lock during trackpad inertia decay
            setTimeout(() => {
              isAnimating = false;
            }, 400);
          },
        });

        tl.to(
          currentEl,
          {
            yPercent: direction > 0 ? -100 : 100,
            duration: 0.6,
            ease: "power2.inOut",
          },
          0,
        );

        tl.to(
          nextEl,
          {
            yPercent: 0,
            duration: 0.6,
            ease: "power2.inOut",
          },
          0,
        );
      });
    }

    // Capture wheel events — one event = one slide
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (isAnimating) return;
      if (e.deltaY > 0) goToSlide(1);
      else if (e.deltaY < 0) goToSlide(-1);
    }

    // Touch: detect swipe direction
    let touchStartY = 0;
    let touchMoved = false;

    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (isAnimating || touchMoved) return;
      const delta = touchStartY - e.touches[0].clientY;
      if (Math.abs(delta) > 30) {
        touchMoved = true;
        if (delta > 0) goToSlide(1);
        else goToSlide(-1);
      }
    }

    // Initialize: hide all slides except the first (handled by useGSAP entrance)
    slides.forEach((el, i) => {
      if (i > 0) gsap.set(el, { yPercent: 100, autoAlpha: 0 });
    });

    const wrapper = wrapperRef.current;
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    wrapper.addEventListener("touchstart", onTouchStart, { passive: true });
    wrapper.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      ctx.revert();
      wrapper.removeEventListener("wheel", onWheel);
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop: cursor-follow scroll hint with adaptive color
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const cursor = cursorHintRef.current;
    if (!wrapper || !cursor) return;

    function onMove(e: MouseEvent) {
      const rect = wrapper!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top + 24;
      gsap.to(cursor!, { x, y, duration: 0.5, ease: "power3.out" });
    }

    function onEnter() {
      gsap.to(cursor!, { autoAlpha: 1, duration: 0.3, ease: "power2.out" });
    }

    // No mouseleave handler — cursor hint stays visible once shown
    wrapper.addEventListener("mousemove", onMove);
    wrapper.addEventListener("mouseenter", onEnter);

    return () => {
      wrapper.removeEventListener("mousemove", onMove);
      wrapper.removeEventListener("mouseenter", onEnter);
      gsap.killTweensOf(cursor);
    };
  }, []);

  // Gallery entrance — first slide fades in, hints appear
  useGSAP(
    () => {
      const firstSlide = slideRefs.current[0];
      if (firstSlide) {
        gsap.fromTo(
          firstSlide,
          { yPercent: 40, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 1.4,
            ease: "power3.out",
            delay: 0.6,
          },
        );
      }

      // Mobile scroll hint entrance
      if (scrollHintRef.current) {
        gsap.fromTo(
          scrollHintRef.current,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 1.2 },
        );
      }
      if (tapHintRef.current) {
        gsap.fromTo(
          tapHintRef.current,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 1.2 },
        );
      }
      // Desktop cursor hint — fade in with gallery entrance
      if (cursorHintRef.current) {
        gsap.fromTo(
          cursorHintRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.6, ease: "power3.out", delay: 1.2 },
        );
      }
    },
    { scope: contentRef },
  );

  const activeProject = projects[activeIndex] ?? projects[0];

  const handleProjectClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      project: PROJECTS_QUERY_RESULT[number],
    ) => {
      if (!hasTapped.current) {
        hasTapped.current = true;
        if (tapHintRef.current) {
          gsap.to(tapHintRef.current, {
            autoAlpha: 0,
            duration: 0.4,
            ease: "power2.out",
          });
        }
      }

      const coverMedia = project.coverMedia;
      const image =
        coverMedia?.type === "image" && coverMedia.image?.asset
          ? coverMedia.image
          : null;
      const videoRef =
        coverMedia?.type === "video" && coverMedia.video?.asset?._ref
          ? coverMedia.video.asset._ref
          : null;

      if (!image && !videoRef) return;

      e.preventDefault();

      const mediaEl = e.currentTarget.querySelector("img, video");
      const rect = (mediaEl ?? e.currentTarget).getBoundingClientRect();
      const sourceRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
      const href = `/project/${project.slug?.current}`;

      if (image) {
        startTransition({
          mediaType: "image",
          imageUrl: urlFor(image).width(1200).quality(85).url(),
          sourceRect,
        });
      } else if (videoRef) {
        const videoEl = mediaEl as HTMLVideoElement | null;
        startTransition({
          mediaType: "video",
          videoSrc: fileUrl(videoRef),
          videoCurrentTime: videoEl?.currentTime ?? 0,
          sourceRect,
        });
      }

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
          <ProjectCard key={activeProject?._id} project={activeProject} />
        </Link>
      </div>

      {/* Cover image gallery — Lenis infinite snap */}
      <div
        ref={wrapperRef}
        data-lenis-prevent
        className="relative mt-2 h-[50dvh] overflow-hidden desktop:mt-0 desktop:w-1/2 desktop:h-full"
      >
        {/* Mobile: scroll hint (bottom-left) */}
        <div
          ref={scrollHintRef}
          className="invisible pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col items-start gap-1 desktop:hidden"
        >
          <span className="text-sub font-medium uppercase text-white">Scroll ↕</span>
        </div>
        {/* Mobile: tap hint (bottom-right) */}
        <div
          ref={tapHintRef}
          className="invisible pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1 desktop:hidden"
        >
          <span className="text-sub font-medium uppercase text-white">Tap to view</span>
        </div>
        {/* Desktop cursor-follow hint */}
        <div
          ref={cursorHintRef}
          className="invisible pointer-events-none absolute left-0 top-0 z-10 hidden -translate-x-1/2 flex-col items-center gap-4 desktop:flex"
        >
          <span className="text-sub font-medium uppercase text-white">
            Scroll to Explore
          </span>
          <span className="text-sub font-medium uppercase text-white">
            Click to View
          </span>
        </div>
        <div ref={contentRef} className="relative h-full">
          {projects.map((project, index) => (
            <Link
              key={project._id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              href={`/project/${project.slug?.current}`}
              aria-label={`View ${project.title ?? "project"}`}
              className="absolute inset-0 block invisible"
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
    </div>
  );
}
