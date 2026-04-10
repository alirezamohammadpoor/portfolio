"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

type ProjectImages = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["images"]>;

interface ProjectGalleryProps {
  images: ProjectImages;
  projectTitle: string | null;
  galleryRef: React.RefObject<HTMLDivElement | null>;
  firstImageRef: React.RefObject<HTMLDivElement | null>;
  isTransitioning: boolean;
}

export default function ProjectGallery({
  images,
  projectTitle,
  galleryRef,
  firstImageRef,
  isTransitioning,
}: ProjectGalleryProps) {
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll-reveal + parallax (skip first image — clone transition targets it)
  useGSAP(
    () => {
      if (!galleryRef.current || isTransitioning) return;

      imageRefs.current.forEach((el, i) => {
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

        // Subtle parallax shift
        const img = el.querySelector("img");
        if (img) {
          gsap.fromTo(
            img,
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
    { scope: galleryRef, dependencies: [isTransitioning, images] },
  );

  return (
    <div
      ref={galleryRef}
      className={`flex flex-col gap-2 px-4 pb-10 desktop:px-6 desktop:ml-[50%] desktop:w-1/2${isTransitioning ? " invisible" : ""}`}
    >
      {images.map((image, i) => (
        <div
          key={image._key}
          ref={(el) => {
            imageRefs.current[i] = el;
            if (i === 0) firstImageRef.current = el;
          }}
          className="relative h-[70dvh] w-full overflow-hidden bg-tertiary [content-visibility:auto] [contain-intrinsic-size:auto_70dvh]"
        >
          {image.asset && (
            <Image
              src={urlFor(image).width(1200).quality(85).url()}
              alt={`${projectTitle} — ${i + 1}`}
              fill
              className={`object-cover${i > 0 ? " scale-[1.06]" : ""}`}
              sizes="(min-width: 75rem) 50vw, 100vw"
              priority={i === 0}
            />
          )}
        </div>
      ))}
    </div>
  );
}
