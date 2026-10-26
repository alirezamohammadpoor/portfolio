"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { usePageTransition } from "@/context/TransitionContext";
import { rememberProject } from "@/lib/lastProject";
import {
  useTitleAnimation,
  useBodyAnimation,
  useInlineAnimation,
} from "@/hooks/useTextAnimation";
import { useGalleryScroll } from "@/hooks/useGalleryScroll";
import { dur, ease, maskOutText, prefersReducedMotion, stagger } from "@/lib/motion";
import { cloneSourceFromElement } from "@/lib/cloneSource";
import { usePrefetchProject } from "@/hooks/usePrefetchProject";
import Footer from "@/components/layout/Footer";
import DetailsDrawer from "@/components/project/DetailsDrawer";
import ProjectInfoPanel from "@/components/project/ProjectInfoPanel";
import ProjectGallery from "@/components/project/ProjectGallery";
import ProjectStage from "@/components/project/ProjectStage";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import ScrollProgress from "@/components/project/ScrollProgress";
import ProjectTextShell from "@/components/project/ProjectTextShell";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

interface ProjectPageClientProps {
  project: Project;
  nextProject?: Project["nextProject"];
  prevProject?: Project["prevProject"];
}

export default function ProjectPageClient({ project, nextProject, prevProject }: ProjectPageClientProps) {
  const router = useTransitionRouter();
  const plainRouter = useRouter();
  const { isTransitioning, contentRevealed, pageRevealed, inPlace, animateClone, startTransition, markTargetReady } =
    usePageTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // Media trees mount only on the client so a phone never requests the
  // desktop gallery's six videos from the server HTML (the server snapshot
  // of useIsDesktop is "desktop"). The text is still in the server HTML: see
  // the shell below.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const nextSlug = nextProject?.slug?.current ?? undefined;

  // Home opens on this project when the visitor goes back to it.
  const slug = project.slug?.current;
  useEffect(() => rememberProject(slug), [slug]);

  // Next project only, on arrival: its route and first media are ready long
  // before the reader reaches the end of the gallery. Previous gets nothing;
  // back navigation is cheap already.
  usePrefetchProject(nextSlug, nextProject?.firstMedia);

  // Project → project reads as one page: the gallery column carries the
  // preview block up into the first-item slot (the same move the reader has
  // been making all the way down) while this page's text masks out. By the
  // time the route swaps, the preview already sits exactly where the next
  // page's first item renders, so the clone covers the swap without moving
  // and the next page's text masks in at once. On the stage (mobile) the
  // preview card is already centred where the first card lands, so it swaps
  // straight away. Falls back to a plain push when there is nothing to clone.
  const navigateNext = useCallback(() => {
    if (!nextSlug) return;
    const href = `/project/${nextSlug}`;
    const preview = previewRef.current;
    if (!cloneSourceFromElement(preview, { allowLoadingVideo: true })) {
      router.push(href);
      return;
    }
    // The plain router: the view-transition slide must not run under the clone.
    const swap = () => {
      const source = cloneSourceFromElement(preview, { allowLoadingVideo: true });
      if (!source) {
        router.push(href);
        return;
      }
      startTransition({ ...source, inPlace: true });
      plainRouter.push(href);
    };

    const gallery = preview?.closest<HTMLElement>("[data-project-gallery]") ?? null;
    const slot = gallery?.firstElementChild ?? null;
    if (!gallery || !slot || !preview || prefersReducedMotion()) {
      swap();
      return;
    }
    // Where the first item sits with the page scrolled to the top (the
    // document offset) is where the next page's first item will be.
    const slotTop = slot.getBoundingClientRect().top + window.scrollY;
    const delta = preview.getBoundingClientRect().top - slotTop;
    maskOutText(panelRef.current);
    gsap.to(gallery, {
      y: -delta,
      duration: dur.page,
      ease: ease.inOut,
      overwrite: true,
      onComplete: swap,
    });
  }, [nextSlug, router, plainRouter, startTransition]);

  const {
    galleryRef,
    firstImageRef,
    nextTextWrapperRef,
    nextTextRef,
    gallery,
    scrollProgressElRef,
    mobileProgressElRef,
    footerWipeRef,
    showMobileNav,
    onFirstReady,
  } = useGalleryScroll({
    gallery: project.gallery ?? [],
    nextProjectSlug: nextSlug,
    isTransitioning,
    inPlace,
    animateClone,
    markTargetReady,
    navigateNext,
  });

  // Chrome (counter, footer) waits for the whole morph; the text does not.
  // It masks in once the clone is ~40 % of the way (contentRevealed), while
  // the media is still moving, so the sequence reads as one gesture. The key
  // is stable from "go" onwards so the end of the morph does not re-run it.
  // The page under the clone shows a couple of frames before the clone goes.
  const skip = isTransitioning && !pageRevealed;
  const textWaiting = isTransitioning && !contentRevealed;
  const textKey = textWaiting ? "wait" : "go";

  // `mounted` is a dependency because the panel renders one tick after this
  // component: without it a direct load (or an arrival whose text is never
  // "waiting", project → project) runs the hooks once against empty refs and
  // the text simply appears.
  const textDeps = [textKey, mounted];
  useTitleAnimation(titleRef, panelRef, { duration: 1, skip: textWaiting, dependencies: textDeps });
  useBodyAnimation(descRef, panelRef, { duration: dur.text, delay: stagger, skip: textWaiting, dependencies: textDeps });
  useBodyAnimation(techRef, panelRef, { duration: dur.text, delay: 2 * stagger, skip: textWaiting, dependencies: textDeps });
  useInlineAnimation(linksRef, panelRef, "a:not([data-pill])", { duration: dur.text, delay: 3 * stagger, skip: textWaiting, dependencies: textDeps });

  // Pill button animation (SplitText mask clips rounded corners)
  useGSAP(
    () => {
      if (textWaiting || !linksRef.current) return;
      const pill = linksRef.current.querySelector("[data-pill]");
      if (!pill) return;
      gsap.fromTo(
        pill,
        { yPercent: 40, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: dur.text, ease: ease.out, delay: 3 * stagger },
      );
    },
    { scope: panelRef, dependencies: textDeps },
  );

  // Mobile and tablet get the stage (horizontal strip, pills); laptop and up
  // keep the fixed info panel + vertical gallery. Only one tree mounts, so a
  // phone never decodes the desktop gallery's videos.
  // Before the client picks a layout the server HTML carries the project's
  // text (title, description, stack, links) for both breakpoints, so a
  // crawler, a share preview or a visitor without JS gets the page instead of
  // an empty main. It is invisible: the real tree replaces it on mount and
  // masks the text in, as on any arrival.
  if (!mounted) return <ProjectTextShell project={project} />;

  if (!isDesktop) {
    return (
      // The stage holds the media too, so it stays hidden until the clone
      // has landed (no double image); the desktop panel reveals early.
      <ProjectStage
        project={project}
        hidden={skip}
        firstCardRef={firstImageRef}
        onFirstReady={onFirstReady}
        previewRef={previewRef}
        onNavigateNext={nextSlug ? navigateNext : undefined}
      />
    );
  }

  return (
    <>
      <ProjectInfoPanel
        project={project}
        hidden={textWaiting}
        panelRef={panelRef}
        titleRef={titleRef}
        descRef={descRef}
        techRef={techRef}
        linksRef={linksRef}
      />

      <ProjectGallery
        gallery={gallery}
        projectTitle={project.title}
        galleryRef={galleryRef}
        firstImageRef={firstImageRef}
        hidden={skip}
        onFirstReady={onFirstReady}
        nextProject={nextProject}
        previewRef={previewRef}
        onNavigateNext={nextSlug ? navigateNext : undefined}
      />

      {!skip && (
        <ScrollProgress
          progressRef={scrollProgressElRef}
          nextProjectSlug={nextProject?.slug?.current ?? undefined}
          nextTextWrapperRef={nextTextWrapperRef}
          nextTextRef={nextTextRef}
        />
      )}

      <DetailsDrawer project={project} isOpen={detailsOpen} />

      <Footer
        projectTitle={project.title ?? undefined}
        siteUrl={project.siteUrl ?? undefined}
        sitePassword={project.sitePassword ?? undefined}
        caseStudySlug={project.caseStudy?.slug?.current ?? undefined}
        onDetailsToggle={() => setDetailsOpen((prev) => !prev)}
        detailsOpen={detailsOpen}
        visible={!skip}
        progressRef={mobileProgressElRef}
        wipeRef={footerWipeRef}
        nextProjectSlug={nextProject?.slug?.current ?? undefined}
        prevProjectSlug={prevProject?.slug?.current ?? undefined}
        showNav={showMobileNav}
      />
    </>
  );
}
