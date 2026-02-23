"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";
import { usePageTransition } from "@/context/TransitionContext";
import Footer from "@/components/layout/Footer";
import DetailsDrawer from "@/components/project/DetailsDrawer";
import TechStack from "@/components/project/TechStack";

interface ProjectPageClientProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
}

export default function ProjectPageClient({ project }: ProjectPageClientProps) {
  const { isTransitioning, animateClone } = usePageTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isReeling, setIsReeling] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const firstImageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const images = project.images ?? [];
  const originalCount = images.length;

  // During reel: original images + duplicate set + clone of first
  // After reel: just original images
  const displayImages = useMemo(() => {
    if (!isReeling || originalCount <= 1) return images;
    return [...images, ...images.map((img, i) => ({ ...img, _key: `${img._key}-dup-${i}` }))];
  }, [images, isReeling, originalCount]);

  // Disable browser scroll restoration so reload starts at top
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // When transitioning from homepage, animate clone to first image position
  useEffect(() => {
    if (!isTransitioning || !firstImageRef.current) return;

    requestAnimationFrame(() => {
      const rect = firstImageRef.current!.getBoundingClientRect();
      animateClone({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    });
  }, [isTransitioning, animateClone]);

  // Gallery reel — scroll down through duplicated set, land on duplicate first image
  // Waits for clone transition to finish before starting
  useGSAP(
    () => {
      if (!galleryRef.current || !isReeling || isTransitioning || originalCount <= 1) return;

      // The duplicate of image 1 starts at index = originalCount
      // We need to scroll so that element is at the top of the viewport
      const duplicateFirst = galleryRef.current.children[originalCount] as HTMLElement;
      if (!duplicateFirst) return;

      requestAnimationFrame(() => {
        const targetScroll = duplicateFirst.offsetTop - galleryRef.current!.offsetTop;
        window.scrollTo(0, 0);

        const obj = { value: 0 };
        gsap.to(obj, {
          value: targetScroll,
          duration: 2,
          ease: "power2.inOut",
          onUpdate: () => window.scrollTo(0, obj.value),
          onComplete: () => {
            // Remove duplicates and reset — first image is identical
            setIsReeling(false);
            window.scrollTo(0, 0);
          },
        });
      });
    },
    { scope: galleryRef, dependencies: [isReeling, isTransitioning] },
  );

  // Text panel animations — wait for gallery reel to finish
  useGSAP(
    () => {
      if (isReeling || isTransitioning) return;

      // Title — chars drop in
      if (titleRef.current) {
        SplitText.create(titleRef.current, {
          type: "words, chars",
          autoSplit: true,
          mask: "chars",
          charsClass: "char",
          onSplit: (self) =>
            gsap.from(self.chars, {
              duration: 2,
              yPercent: -120,
              scale: 1.2,
              stagger: 0.01,
              ease: "expo.out",
            }),
        });
      }

      // Description — lines slide up
      if (descRef.current) {
        SplitText.create(descRef.current, {
          type: "lines, words",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          onSplit: (self) =>
            gsap.from(self.lines, {
              duration: 2,
              yPercent: 105,
              stagger: 0.04,
              ease: "expo.out",
              delay: 0.3,
            }),
        });
      }

      // Tech stack — lines slide up
      if (techRef.current) {
        SplitText.create(techRef.current, {
          type: "lines, words",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          onSplit: (self) =>
            gsap.from(self.lines, {
              duration: 2,
              yPercent: 105,
              stagger: 0.04,
              ease: "expo.out",
              delay: 0.5,
            }),
        });
      }

      // Links — each link individually so flex gap is preserved
      if (linksRef.current) {
        const links = linksRef.current.querySelectorAll("a");
        links.forEach((link) => {
          SplitText.create(link, {
            type: "lines, words",
            autoSplit: true,
            mask: "lines",
            linesClass: "line",
            onSplit: (self) =>
              gsap.from(self.lines, {
                duration: 2,
                yPercent: 105,
                stagger: 0.04,
                ease: "expo.out",
                delay: 0.7,
              }),
          });
        });
      }
    },
    { scope: panelRef, dependencies: [isReeling, isTransitioning] },
  );

  const hidePanel = isReeling || isTransitioning;

  return (
    <>
      {/* Desktop: static left panel */}
      <div
        ref={panelRef}
        className={`hidden desktop:flex fixed top-[var(--header-height)] left-0 w-1/2 h-[calc(100dvh-var(--header-height))] items-center px-6${hidePanel ? " invisible" : ""}`}
      >
        <div>
          {project.title && (
            <h1 ref={titleRef} className="text-h1 text-primary">
              {project.title}
            </h1>
          )}
          {project.fullDescription && (
            <p ref={descRef} className="mt-4 text-body text-primary">
              {project.fullDescription}
            </p>
          )}
          {project.techStack && project.techStack.length > 0 && (
            <div ref={techRef} className="mt-6">
              <p className="text-sub text-secondary">Tech stack</p>
              <TechStack items={project.techStack} />
            </div>
          )}
          <div ref={linksRef} className="mt-8 flex gap-6">
            {project.caseStudy?.slug?.current && (
              <Link
                href={`/journal/${project.caseStudy.slug.current}`}
                className="text-sub uppercase text-primary hover:text-pomegranate"
              >
                Case study
              </Link>
            )}
            {project.siteUrl && (
              <Link
                href={project.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sub uppercase text-primary hover:text-pomegranate"
              >
                Visit website
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div ref={galleryRef} className={`flex flex-col gap-2 px-6 pb-10 desktop:ml-[50%] desktop:w-1/2${isTransitioning ? " invisible" : ""}`}>
        {displayImages.map((image, i) => (
          <div
            key={image._key}
            ref={i === 0 ? firstImageRef : undefined}
            className="relative h-[70dvh] w-full bg-tertiary"
          >
            {image.asset && (
              <Image
                src={urlFor(image).width(1200).quality(85).url()}
                alt={`${project.title} — ${(i % originalCount) + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i < originalCount}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile only */}
      <DetailsDrawer project={project} isOpen={detailsOpen} />

      <Footer
        projectTitle={project.title ?? undefined}
        siteUrl={project.siteUrl ?? undefined}
        caseStudySlug={project.caseStudy?.slug?.current ?? undefined}
        onDetailsToggle={() => setDetailsOpen((prev) => !prev)}
        detailsOpen={detailsOpen}
      />
    </>
  );
}
