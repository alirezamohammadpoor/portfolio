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

  useEffect(() => {
    const videos = videoRefs.current.filter(Boolean) as HTMLVideoElement[];
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: "150px 0px",
      },
    );

    videos.forEach((video) => {
      video.pause();
      observer.observe(video);
    });

    return () => {
      observer.disconnect();
      videos.forEach((video) => video.pause());
    };
  }, [gallery]);

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
      className={`flex flex-col gap-2 px-4 pb-10 desktop:px-6 desktop:ml-[50%] desktop:w-1/2${isTransitioning ? " invisible" : ""}`}
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
            className={`relative w-full overflow-hidden ${isImage ? "bg-black" : "bg-tertiary"}`}
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
