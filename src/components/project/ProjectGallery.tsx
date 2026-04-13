"use client";

import { useRef } from "react";
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
}

export default function ProjectGallery({
  gallery,
  projectTitle,
  galleryRef,
  firstImageRef,
  isTransitioning,
}: ProjectGalleryProps) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

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

        // Subtle parallax shift — works on both <img> and <video>
        const media = el.querySelector("img, video");
        if (media) {
          gsap.fromTo(
            media,
            { yPercent: 4 },
            {
              yPercent: -4,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }
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
              />
            )}
            {!isImage && item.video?.asset?._ref && (
              <video
                src={fileUrl(item.video.asset._ref)}
                className={`h-full w-full object-cover${i > 0 ? " scale-[1.06]" : ""}`}
                aria-label={`${projectTitle} — ${i + 1}`}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
