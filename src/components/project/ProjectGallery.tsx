"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { ease, prefersReducedMotion } from "@/lib/motion";
import NextProjectPreview, { type NextProject } from "@/components/project/NextProjectPreview";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { adoptableVideo, mountAdoptedVideo } from "@/lib/adoptVideo";
import { usePageTransition } from "@/context/TransitionContext";

type ProjectGalleryItems = NonNullable<
  NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["gallery"]
>;

interface ProjectGalleryProps {
  gallery: ProjectGalleryItems;
  projectTitle: string | null;
  galleryRef: React.RefObject<HTMLDivElement | null>;
  firstImageRef: React.RefObject<HTMLDivElement | null>;
  /** Under the clone: invisible, no scroll reveals, no playback retries. */
  hidden: boolean;
  onFirstReady?: () => void;
  nextProject?: NextProject | null;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  onNavigateNext?: () => void;
}

export default function ProjectGallery({
  gallery,
  projectTitle,
  galleryRef,
  firstImageRef,
  hidden,
  onFirstReady,
  nextProject,
  previewRef,
  onNavigateNext,
}: ProjectGalleryProps) {
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Project → project: when the clone carries a live <video> of item 1's
  // file, item 1 is that element. Decided once at mount (only the landing
  // page sees one); it is moved in when the clone leaves, in the same commit.
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const { isTransitioning, inPlace, sourceVideoElement } = usePageTransition();
  const [adopted] = useState(() => {
    const first = gallery[0];
    const src = first?._type === "galleryVideo" && first.video?.asset?._ref ? fileUrl(first.video.asset._ref) : undefined;
    return adoptableVideo(sourceVideoElement, inPlace, src);
  });
  const adoptHostRef = useRef<HTMLDivElement>(null);
  const [adoptedMounted, setAdoptedMounted] = useState(false);
  useLayoutEffect(() => {
    const host = adoptHostRef.current;
    if (!adopted || !host || isTransitioning || adopted.parentElement === host) return;
    mountAdoptedVideo(host, adopted, `${projectTitle} — 1`);
    videoRefs.current[0] = adopted;
    setAdoptedMounted(true);
  }, [adopted, isTransitioning, projectTitle]);

  // Track which videos the observer considers in-view across effects, so
  // the transition-end retry can target only the ones that should play.
  const inViewRef = useRef<WeakSet<HTMLVideoElement>>(new WeakSet());

  useEffect(() => {
    const videos = videoRefs.current.filter(Boolean) as HTMLVideoElement[];
    if (!videos.length) return;

    const inView = inViewRef.current;

    const tryPlay = (video: HTMLVideoElement) => {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            inView.add(video);
            tryPlay(video);
          } else {
            inView.delete(video);
            video.pause();
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: "150px 0px",
      },
    );

    const onCanPlay = (e: Event) => {
      const video = e.currentTarget as HTMLVideoElement;
      if (inView.has(video) && video.paused) tryPlay(video);
    };

    videos.forEach((video) => {
      observer.observe(video);
      video.addEventListener("canplay", onCanPlay);
      // canplay may have already fired before this listener attached
      // (preload="metadata" on a short muxed file can resolve during the
      // same frame as the render). If the video is ready and paused,
      // try once immediately — the observer's initial callback will
      // still correct this if the video actually sits offscreen.
      if (video.readyState >= 3 && video.paused) tryPlay(video);
    });

    return () => {
      observer.disconnect();
      videos.forEach((video) => {
        video.removeEventListener("canplay", onCanPlay);
        video.pause();
      });
    };
  }, [gallery, adoptedMounted]);

  // A video first item reports ready on its first presented frame, so the
  // clone covering it never leaves while it still paints black. An adopted
  // item 1 is the frame the clone shows, so it is ready at once.
  useEffect(() => {
    if (!onFirstReady) return;
    if (adopted) {
      onFirstReady();
      return;
    }
    const first = videoRefs.current[0];
    if (!first) return;
    return onFirstVideoFrame(first, onFirstReady);
  }, [gallery, onFirstReady, adopted]);

  // Retry playback when the home→project clone transition ends. During the
  // transition the gallery container is opacity:0 (and was previously
  // visibility:hidden, which broke iOS Safari's IntersectionObserver — see
  // the className gate below). The initial play() can also be blocked
  // because user activation was consumed by the outgoing page's click.
  //
  // Iterate the SPARSE videoRefs.current so `galleryIndex` lines up with
  // the gallery item index. Do NOT use videos.filter(Boolean).forEach —
  // that compacts the array, so index 0 would mean "first video on the
  // page" rather than "gallery item 0" (broken when gallery[0] is an
  // image and the actual first video is at gallery[3]).
  useEffect(() => {
    if (hidden) return;
    videoRefs.current.forEach((video, galleryIndex) => {
      if (!video) return;
      // First gallery item is always retried because the clone targets it
      // and the observer may have missed it during transition. Other
      // videos retry only if the observer marked them in-view.
      if (galleryIndex !== 0 && !inViewRef.current.has(video)) return;
      if (!video.paused) return;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    });
  }, [hidden]);

  // Scroll-reveal + parallax (skip first item — clone transition targets it)
  useGSAP(
    () => {
      if (!galleryRef.current || hidden) return;

      const lift = prefersReducedMotion() ? 0 : 40;
      const targets: (HTMLDivElement | null)[] = [...itemRefs.current, previewWrapRef.current];
      targets.forEach((el, i) => {
        if (!el || i === 0) return;

        // Fade in on scroll
        gsap.set(el, { opacity: 0, y: lift });
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: ease.out });
          },
        });
      });
    },
    { scope: galleryRef, dependencies: [hidden, gallery] },
  );

  return (
    <div
      ref={galleryRef}
      data-project-gallery
      className={`flex flex-col gap-2 px-4 pb-10 desktop:px-6 desktop:ml-[50%] desktop:w-1/2${hidden ? " opacity-0 pointer-events-none" : ""}`}
    >
      {gallery.map((item, i) => {
        const isImage = item._type === "galleryImage";

        return (
          <div
            key={item._key}
            ref={(el) => {
              itemRefs.current[i] = el;
              if (i === 0) firstImageRef.current = el;
            }}
            className="relative w-full overflow-hidden bg-black"
            style={{ aspectRatio: 4 / 3 }}
          >
            {isImage && item.image?.asset && (
              <Image
                src={imageUrl(item.image, 1200)}
                alt={`${projectTitle} — ${i + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 75rem) 50vw, 100vw"
                priority={i === 0}
                onLoad={i === 0 ? onFirstReady : undefined}
              />
            )}
            {!isImage && i === 0 && adopted && <div ref={adoptHostRef} className="absolute inset-0" />}
            {!isImage && item.video?.asset?._ref && !(i === 0 && adopted) && (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={fileUrl(item.video.asset._ref)}
                className="h-full w-full object-cover"
                aria-label={`${projectTitle} — ${i + 1}`}
                // Only item 1 starts on its own (the clone lands on it); the
                // observer plays the rest as they scroll in, so six videos do
                // not fetch and decode at once against the first.
                autoPlay={i === 0}
                muted
                loop
                playsInline
                preload="metadata"
              />
            )}
          </div>
        );
      })}
      {nextProject && onNavigateNext && (
        <div ref={previewWrapRef} className="pt-6">
          <NextProjectPreview
            nextProject={nextProject}
            previewRef={previewRef}
            onNavigate={onNavigateNext}
          />
        </div>
      )}
    </div>
  );
}
