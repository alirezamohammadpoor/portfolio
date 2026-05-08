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
        // Position next slide off-screen in the scroll direction.
        // Use opacity (not autoAlpha) so visibility stays visible — iOS
        // Safari refuses to fetch video resources inside a
        // visibility:hidden element, even with preload="auto".
        gsap.set(nextEl, {
          yPercent: direction > 0 ? 100 : -100,
          opacity: 1,
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

        // Honor prefers-reduced-motion: snap instantly instead of sliding.
        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const slideDuration = reduced ? 0 : 0.35;

        tl.to(
          currentEl,
          {
            yPercent: direction > 0 ? -100 : 100,
            duration: slideDuration,
            ease: "power3.inOut",
          },
          0,
        );

        tl.to(
          nextEl,
          {
            yPercent: 0,
            duration: slideDuration,
            ease: "power3.inOut",
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

    // Initialize: position non-first slides off-screen and transparent.
    // Using opacity (not autoAlpha) keeps visibility:visible so iOS Safari
    // will fetch video resources on inactive slides.
    slides.forEach((el, i) => {
      if (i > 0) gsap.set(el, { yPercent: 100, opacity: 0 });
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

  // Prefetch the active project's route + preload its first gallery item.
  // Mobile has no hover, so Next's Link prefetch never fires before tap —
  // this gives the destination a head start so the clone overlay doesn't
  // morph onto an empty box. Handles both image and video first items so
  // the video case isn't a regression vs the image case.
  useEffect(() => {
    const project = projects[activeIndex];
    const slug = project?.slug?.current;
    if (!slug) return;

    router.prefetch(`/project/${slug}`);

    const firstGalleryItem = project?.gallery?.[0];
    let href: string | null = null;
    let asAttr: "image" | "video" | null = null;

    if (
      firstGalleryItem?._type === "galleryImage" &&
      firstGalleryItem.image?.asset
    ) {
      href = urlFor(firstGalleryItem.image).width(1600).quality(85).url();
      asAttr = "image";
    } else if (
      firstGalleryItem?._type === "galleryVideo" &&
      firstGalleryItem.video?.asset?._ref
    ) {
      href = fileUrl(firstGalleryItem.video.asset._ref);
      asAttr = "video";
    }

    if (!href || !asAttr) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = asAttr;
    link.href = href;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [activeIndex, projects, router]);

  // Desktop: cursor-follow scroll hint with adaptive color
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const cursor = cursorHintRef.current;
    if (!wrapper || !cursor) return;

    // quickTo pre-creates a single tween whose target props are updated on
    // each call — no allocation per mousemove. gsap.to inside an event
    // handler creates a fresh tween every time, which adds up at typical
    // mousemove rates.
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3.out" });

    function onMove(e: MouseEvent) {
      const rect = wrapper!.getBoundingClientRect();
      xTo(e.clientX - rect.left);
      yTo(e.clientY - rect.top + 24);
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
      // First slide is in its final position from mount — no entrance.
      // Setting opacity:1 explicitly here in case the className's opacity-0
      // hasn't been overridden by a later gsap.set yet.
      const firstSlide = slideRefs.current[0];
      if (firstSlide) {
        gsap.set(firstSlide, { yPercent: 0, opacity: 1 });
      }

      // Mobile scroll hint entrance
      if (scrollHintRef.current) {
        gsap.fromTo(
          scrollHintRef.current,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", delay: 0.2 },
        );
      }
      if (tapHintRef.current) {
        gsap.fromTo(
          tapHintRef.current,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", delay: 0.2 },
        );
      }
      // Desktop cursor hint — fade in with gallery entrance
      if (cursorHintRef.current) {
        gsap.fromTo(
          cursorHintRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.4, ease: "power3.out", delay: 0.2 },
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

      // The media element may live inside the clicked anchor (gallery slide)
      // or in a sibling slide (when the click came from the ProjectCard link
      // above the gallery). Look up the slide by the project's index in the
      // current list — not by a captured activeIndex, which is stale because
      // useCallback's deps don't include it (and adding it would re-create
      // the callback on every scroll).
      const projectIndex = projects.findIndex((p) => p._id === project._id);
      const activeSlideEl =
        projectIndex >= 0 ? slideRefs.current[projectIndex] : null;
      const mediaEl =
        e.currentTarget.querySelector("img, video") ??
        activeSlideEl?.querySelector("img, video") ??
        null;
      const rectSource = mediaEl ?? activeSlideEl ?? e.currentTarget;
      const rect = rectSource.getBoundingClientRect();
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
          sourceVideoElement: videoEl ?? undefined,
          sourceRect,
        });
      }

      router.push(href);
    },
    [startTransition, router, projects],
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
          onClick={(e) => activeProject && handleProjectClick(e, activeProject)}
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
              aria-hidden={index !== activeIndex}
              tabIndex={index !== activeIndex ? -1 : undefined}
              className={`absolute inset-0 block opacity-0${index !== activeIndex ? " pointer-events-none" : ""}`}
              onClick={(e) => handleProjectClick(e, project)}
            >
              <MediaPanel
                coverMedia={project.coverMedia}
                title={project.title ?? ""}
                priority={index === 0}
                isActive={index === activeIndex}
                shouldPreload={Math.abs(index - activeIndex) === 1}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
