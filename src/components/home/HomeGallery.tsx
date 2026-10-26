"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Link } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { usePageTransition } from "@/context/TransitionContext";
import { lockScroll, unlockScroll } from "@/hooks/useScrollLock";
import { EXIT_LEAD_MS, dur, ease, maskOutText, prefersReducedMotion } from "@/lib/motion";
import { usePrefetchProject } from "@/hooks/usePrefetchProject";
import { lastProjectSlug } from "@/lib/lastProject";
import { isPlainLeftClick } from "@/lib/clicks";
import ProjectCard from "./ProjectCard";
import MediaPanel from "./MediaPanel";

interface HomeGalleryProps {
  projects: PROJECTS_QUERY_RESULT;
}

/** Index of the project the visitor was on most recently, or -1. */
function rememberedIndex(projects: PROJECTS_QUERY_RESULT) {
  const slug = lastProjectSlug();
  return slug ? projects.findIndex((p) => p.slug?.current === slug) : -1;
}

export default function HomeGallery({ projects }: HomeGalleryProps) {
  // Home is kept mounted but hidden while a project page is up (Next's
  // cacheComponents keeps the last pages in a hidden Activity): state lives
  // on, effects are torn down on leave and run again on return. So the
  // gallery opens on the project the visitor was just on, and each return
  // counts as a visit so the card plays its entrance again.
  const [activeIndex, setActiveIndex] = useState(() => Math.max(rememberedIndex(projects), 0));
  const activeIndexRef = useRef(activeIndex);
  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  const [visit, setVisit] = useState(0);
  const shownOnce = useRef(false);
  useEffect(() => {
    if (!shownOnce.current) {
      shownOnce.current = true;
      return;
    }
    setVisit((v) => v + 1);
  }, []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const tapHintRef = useRef<HTMLDivElement>(null);
  const cursorHintRef = useRef<HTMLDivElement>(null);
  const cardLinkRef = useRef<HTMLAnchorElement>(null);
  const hasScrolled = useRef(false);
  const hasTapped = useRef(false);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // Lock the page itself while on home — the gallery's own wheel/touch
  // handlers preventDefault inside the gallery wrapper, but events on
  // the surrounding ProjectCard area (especially on mobile) would
  // otherwise scroll the page or trigger overscroll bounce.
  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);

  // Snap gallery — one scroll gesture = one slide, infinite loop via GSAP transforms
  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {}, wrapperRef.current);
    const slides = slideRefs.current.filter(Boolean) as HTMLElement[];
    const slideCount = slides.length;
    if (!slideCount) return;
    // On return, continue from the project the visitor was just on (which
    // may differ from the one they left home on after project → project).
    const remembered = rememberedIndex(projects);
    const start = Math.min(remembered >= 0 ? remembered : activeIndexRef.current, slideCount - 1);
    let currentIndex = start; // always 0..slideCount-1
    let isAnimating = false;
    if (start !== activeIndexRef.current) setActiveIndex(start);

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
            // The wheel handler already gates one gesture → one slide, so
            // this only needs to cover the last frame of the tween.
            setTimeout(() => {
              isAnimating = false;
            }, 100);
          },
        });

        // Honor prefers-reduced-motion: snap instantly instead of sliding.
        const slideDuration = prefersReducedMotion() ? 0 : 0.35;

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

    // Capture wheel events — one GESTURE = one slide. A trackpad flick emits
    // a stream of decaying deltas for ~1 s, longer than the slide animation
    // plus its 400 ms lock, so without gating one flick advanced two or three
    // slides. A new gesture starts after a 150 ms silence, on a direction
    // change, or when the delta re-accelerates (a second flick mid-inertia).
    let lastWheelAt = 0;
    let lastDelta = 0;
    let gestureConsumed = false;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const now = performance.now();
      const magnitude = Math.abs(e.deltaY);
      const newGesture =
        now - lastWheelAt > 150 ||
        Math.sign(e.deltaY) !== Math.sign(lastDelta) ||
        magnitude > lastDelta * 1.5;
      lastWheelAt = now;
      lastDelta = magnitude;
      if (newGesture) gestureConsumed = false;
      if (gestureConsumed || isAnimating || magnitude < 2) return;
      gestureConsumed = true;
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
      gsap.set(el, i === start ? { yPercent: 0, opacity: 1 } : { yPercent: 100, opacity: 0 });
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
  // morph onto an empty box.
  usePrefetchProject(projects[activeIndex]?.slug?.current, projects[activeIndex]?.gallery?.[0]);

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

    function onLeave() {
      gsap.to(cursor!, { autoAlpha: 0, duration: dur.fast, ease: ease.out });
    }

    wrapper.addEventListener("mousemove", onMove);
    wrapper.addEventListener("mouseenter", onEnter);
    wrapper.addEventListener("mouseleave", onLeave);

    return () => {
      wrapper.removeEventListener("mousemove", onMove);
      wrapper.removeEventListener("mouseenter", onEnter);
      wrapper.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(cursor);
    };
  }, []);

  // Gallery entrance — first slide fades in, hints appear
  useGSAP(
    () => {
      // First slide is in its final position from mount — no entrance.
      // Setting opacity:1 explicitly here in case the className's opacity-0
      // hasn't been overridden by a later gsap.set yet.
      const firstSlide = slideRefs.current[activeIndexRef.current];
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
      if (!isPlainLeftClick(e)) return;

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
          imageUrl: imageUrl(image, 1200),
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

      // Exit choreography: the card's title chars and description lines
      // leave upward through the masks SplitText already wrapped them in
      // (the reverse of their entrance). The push waits just long enough
      // for most of that to be visible; the clone is already covering the
      // media, so the click still reads as immediate.
      if (maskOutText(cardLinkRef.current)) {
        gsap.to([scrollHintRef.current, tapHintRef.current, cursorHintRef.current], { autoAlpha: 0, duration: dur.fast, overwrite: true });
        setTimeout(() => router.push(href), EXIT_LEAD_MS);
      } else {
        router.push(href);
      }
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
          ref={cardLinkRef}
          href={`/project/${activeProject?.slug?.current}`}
          className="block w-full px-4 py-2 desktop:px-6 desktop:py-0"
          onClick={(e) => activeProject && handleProjectClick(e, activeProject)}
        >
          <ProjectCard key={`${activeProject?._id}-${visit}`} project={activeProject} />
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
