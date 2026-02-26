"use client";

import { useRef, useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import type {
  PROJECT_BY_SLUG_QUERY_RESULT,
  NEXT_PROJECT_QUERY_RESULT,
} from "@/sanity/types";
import { usePageTransition } from "@/context/TransitionContext";
import {
  useTitleAnimation,
  useBodyAnimation,
  useInlineAnimation,
} from "@/hooks/useTextAnimation";
import { useGalleryScroll } from "@/hooks/useGalleryScroll";
import Footer from "@/components/layout/Footer";
import DetailsDrawer from "@/components/project/DetailsDrawer";
import ProjectInfoPanel from "@/components/project/ProjectInfoPanel";
import ProjectGallery from "@/components/project/ProjectGallery";
import ScrollProgress from "@/components/project/ScrollProgress";

interface ProjectPageClientProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
  nextProject?: NEXT_PROJECT_QUERY_RESULT;
}

export default function ProjectPageClient({ project, nextProject }: ProjectPageClientProps) {
  const router = useTransitionRouter();
  const { isTransitioning, animateClone } = usePageTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Refs for text animations
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  // All gallery scroll logic
  const {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    displayImages,
    isReeling,
    scrollProgress,
    originalCount,
  } = useGalleryScroll({
    images: project.images ?? [],
    nextProjectSlug: nextProject?.slug?.current ?? undefined,
    isTransitioning,
    animateClone,
    routerPush: router.push,
  });

  // Text panel animations — wait for gallery reel to finish
  const skip = isReeling || isTransitioning;
  const deps = [isReeling, isTransitioning];

  useTitleAnimation(titleRef, panelRef, { duration: 2, skip, dependencies: deps });
  useBodyAnimation(descRef, panelRef, { duration: 2, delay: 0.3, skip, dependencies: deps });
  useBodyAnimation(techRef, panelRef, { duration: 2, delay: 0.5, skip, dependencies: deps });
  useInlineAnimation(linksRef, panelRef, "a", { duration: 2, delay: 0.7, skip, dependencies: deps });

  const hidePanel = skip;

  return (
    <>
      <ProjectInfoPanel
        project={project}
        hidden={hidePanel}
        panelRef={panelRef}
        titleRef={titleRef}
        descRef={descRef}
        techRef={techRef}
        linksRef={linksRef}
      />

      <ProjectGallery
        images={displayImages}
        projectTitle={project.title}
        originalCount={originalCount}
        galleryRef={galleryRef}
        firstImageRef={firstImageRef}
        isTransitioning={isTransitioning}
      />

      {!hidePanel && (
        <ScrollProgress
          progress={scrollProgress}
          nextProjectSlug={nextProject?.slug?.current ?? undefined}
          nextTextWrapperRef={nextTextWrapperRef}
          nextTextRef={nextTextRef}
        />
      )}

      <DetailsDrawer project={project} isOpen={detailsOpen} />

      <Footer
        projectTitle={project.title ?? undefined}
        siteUrl={project.siteUrl ?? undefined}
        caseStudySlug={project.caseStudy?.slug?.current ?? undefined}
        onDetailsToggle={() => setDetailsOpen((prev) => !prev)}
        detailsOpen={detailsOpen}
        visible={!hidePanel}
      />
    </>
  );
}
