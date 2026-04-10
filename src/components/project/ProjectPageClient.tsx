"use client";

import { useRef, useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
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

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

interface ProjectPageClientProps {
  project: Project;
  nextProject?: Project["nextProject"];
  prevProject?: Project["prevProject"];
}

export default function ProjectPageClient({ project, nextProject, prevProject }: ProjectPageClientProps) {
  const router = useTransitionRouter();
  const { isTransitioning, animateClone } = usePageTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    prevTextWrapperRef,
    prevTextRef,
    images,
    scrollProgressElRef,
    mobileProgressElRef,
    footerWipeRef,
    showMobileNav,
  } = useGalleryScroll({
    images: project.images ?? [],
    nextProjectSlug: nextProject?.slug?.current ?? undefined,
    prevProjectSlug: prevProject?.slug?.current ?? undefined,
    isTransitioning,
    animateClone,
    routerPush: router.push,
  });

  const skip = isTransitioning;

  useTitleAnimation(titleRef, panelRef, { duration: 1.2, skip, dependencies: [isTransitioning] });
  useBodyAnimation(descRef, panelRef, { duration: 1, delay: 0.15, skip, dependencies: [isTransitioning] });
  useBodyAnimation(techRef, panelRef, { duration: 1, delay: 0.25, skip, dependencies: [isTransitioning] });
  useInlineAnimation(linksRef, panelRef, "a:not([data-pill])", { duration: 1, delay: 0.35, skip, dependencies: [isTransitioning] });

  // Pill button animation (SplitText mask clips rounded corners)
  useGSAP(
    () => {
      if (skip || !linksRef.current) return;
      const pill = linksRef.current.querySelector("[data-pill]");
      if (!pill) return;
      gsap.fromTo(
        pill,
        { yPercent: 40, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 1, ease: "power4.out", delay: 0.35 },
      );
    },
    { scope: panelRef, dependencies: [isTransitioning] },
  );

  return (
    <>
      <ProjectInfoPanel
        project={project}
        hidden={skip}
        panelRef={panelRef}
        titleRef={titleRef}
        descRef={descRef}
        techRef={techRef}
        linksRef={linksRef}
      />

      <ProjectGallery
        images={images}
        projectTitle={project.title}
        galleryRef={galleryRef}
        firstImageRef={firstImageRef}
        isTransitioning={isTransitioning}
      />

      {!skip && (
        <ScrollProgress
          progressRef={scrollProgressElRef}
          nextProjectSlug={nextProject?.slug?.current ?? undefined}
          nextTextWrapperRef={nextTextWrapperRef}
          nextTextRef={nextTextRef}
          prevProjectSlug={prevProject?.slug?.current ?? undefined}
          prevTextWrapperRef={prevTextWrapperRef}
          prevTextRef={prevTextRef}
        />
      )}

      <DetailsDrawer project={project} isOpen={detailsOpen} />

      <Footer
        projectTitle={project.title ?? undefined}
        siteUrl={project.siteUrl ?? undefined}
        caseStudySlug={project.caseStudy?.slug?.current ?? undefined}
        onDetailsToggle={() => setDetailsOpen((prev) => !prev)}
        detailsOpen={detailsOpen}
        visible={!skip}
        progressRef={mobileProgressElRef}
        wipeRef={footerWipeRef}
        nextProjectSlug={nextProject?.slug?.current ?? undefined}
        prevProjectSlug={prevProject?.slug?.current ?? undefined}
        isFirstProject={project.order === 1}
        showNav={showMobileNav}
      />
    </>
  );
}
