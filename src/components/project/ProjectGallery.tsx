"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { urlFor, fileUrl } from "@/sanity/lib/image";

type ProjectGalleryItems = NonNullable<
  NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["gallery"]
>;

interface ProjectGalleryProps {
  gallery: ProjectGalleryItems;
  projectTitle: string | null;
  galleryRef: React.RefObject<HTMLDivElement | null>;
  firstImageRef: React.RefObject<HTMLDivElement | null>;
  isTransitioning: boolean;
  onFirstReady?: () => void;
}

export default function ProjectGallery({
  gallery,
  projectTitle,
  galleryRef,
  firstImageRef,
  isTransitioning,
  onFirstReady,
}: ProjectGalleryProps) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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
  }, [gallery]);

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
    if (isTransitioning) return;
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
  }, [isTransitioning]);

  // Scroll-reveal + parallax (skip first item — clone transition targets it)
  useGSAP(
    () => {
      if (!galleryRef.current || isTransitioning) return;

      itemRefs.current.forEach((el, i) => {
        if (!el || i === 0) return;

        // Fade in on scroll
        gsap.set(el, { opacity: 0, y: 40 });
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
          },
        });
      });
    },
    { scope: galleryRef, dependencies: [isTransitioning, gallery] },
  );

  return (
    <div
      ref={galleryRef}
      className={`flex flex-col gap-2 px-4 pb-10 desktop:px-6 desktop:ml-[50%] desktop:w-1/2${isTransitioning ? " opacity-0 pointer-events-none" : ""}`}
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
                src={urlFor(item.image).width(1600).quality(85).url()}
                alt={`${projectTitle} — ${i + 1}`}
                fill
                className={`object-cover${i > 0 ? " scale-[1.06]" : ""}`}
                sizes="(min-width: 75rem) 50vw, 100vw"
                priority={i === 0}
                onLoad={i === 0 ? onFirstReady : undefined}
              />
            )}
            {!isImage && item.video?.asset?._ref && (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={fileUrl(item.video.asset._ref)}
                className={`h-full w-full object-cover${i > 0 ? " scale-[1.06]" : ""}`}
                aria-label={`${projectTitle} — ${i + 1}`}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onLoadedMetadata={i === 0 ? onFirstReady : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
