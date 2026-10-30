"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { landingKind, landingTop } from "@/lib/landing";
import { usePrefetchProject } from "@/hooks/usePrefetchProject";
import Footer from "@/components/layout/Footer";
import DetailsDrawer from "@/components/project/DetailsDrawer";
import ProjectInfoPanel from "@/components/project/ProjectInfoPanel";
import ProjectGallery from "@/components/project/ProjectGallery";
import ProjectStage from "@/components/project/ProjectStage";
import { DESKTOP_QUERY, useIsDesktop } from "@/hooks/useIsDesktop";
import ScrollProgress from "@/components/project/ScrollProgress";
import ProjectTextShell from "@/components/project/ProjectTextShell";
import ProjectChapters, { type MobileVariant } from "@/components/project/ProjectChapters";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

interface ProjectPageClientProps {
  project: Project;
  nextProject?: Project["nextProject"];
  prevProject?: Project["prevProject"];
  /** Lab only: phone layout exploration for the chapter page. */
  mobileVariant?: MobileVariant;
}

export default function ProjectPageClient({ project, nextProject, prevProject, mobileVariant }: ProjectPageClientProps) {
  const plainRouter = useRouter();
  const {
    isTransitioning: transitionRunning,
    id: transitionId,
    contentRevealed,
    pageRevealed,
    inPlace,
    animateClone,
    startTransition,
    markTargetReady,
  } = usePageTransition();
  // Only the page that mounted under a transition is its landing page. The
  // page being left (project → project) sees the same flags flip when it
  // starts the next one and must stay as it is until the route swaps:
  // hiding it there shows a blank page under the clone for as long as the
  // next route takes to arrive (noticeable on a dev server or a slow link).
  const [landingId] = useState(() => (transitionRunning ? transitionId : -1));
  const isTransitioning = transitionRunning && transitionId === landingId;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isDesktop = useIsDesktop();
  // A project with chapters is a case study: one scrolling page on every
  // breakpoint (brief-v2). Without them it keeps the gallery page.
  const hasChapters = (project.chapters?.length ?? 0) > 0;
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
  // Always the plain router here, never the view-transition one: the root
  // slide (globals.css) must not run under the clone, and without a clone a
  // plain swap is still smoother than a slide that starts from a frozen
  // snapshot of a page scrolled to its end.
  const nextHasChapters = nextProject?.hasChapters ?? false;
  const navigateNext = useCallback(() => {
    if (!nextSlug) return;
    const href = `/project/${nextSlug}`;
    const preview = previewRef.current;
    if (!cloneSourceFromElement(preview, { allowLoadingVideo: true })) {
      plainRouter.push(href);
      return;
    }
    const swap = () => {
      const source = cloneSourceFromElement(preview, { allowLoadingVideo: true });
      if (!source) {
        plainRouter.push(href);
        return;
      }
      startTransition({ ...source, inPlace: true });
      plainRouter.push(href);
    };

    const gallery = preview?.closest<HTMLElement>("[data-project-gallery]") ?? null;
    // Where the next page's first media will sit once that page is scrolled
    // to the top (lib/landing.ts): the preview block already has its shape,
    // so after the slide the clone covers the swap without moving. Null for
    // the stage, whose card is centred by its own layout: the clone settles
    // onto it after the swap instead.
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    const slotTop = landingTop(landingKind(nextHasChapters, desktop), desktop);
    if (!gallery || slotTop === null || !preview || prefersReducedMotion()) {
      swap();
      return;
    }
    const delta = preview.getBoundingClientRect().top - slotTop;
    maskOutText(panelRef.current);
    gsap.to(gallery, {
      y: -delta,
      duration: dur.page,
      ease: ease.inOut,
      overwrite: true,
      onComplete: swap,
    });
  }, [nextSlug, nextHasChapters, plainRouter, startTransition]);

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

  // Shown again after leaving for the next project (browser back; Next keeps
  // the page mounted hidden and runs the effects again): the column is still
  // where the slide left it, so it goes back to rest before the first paint.
  // The hero text re-enters on its own, its hooks run again as well.
  useLayoutEffect(() => {
    const column = galleryRef.current;
    if (column) gsap.set(column, { clearProps: "transform" });
  }, []);

  // Chrome (counter, footer) waits for the whole morph. So does the text on
  // a home → project arrival (Ali, 10-29: the media lands first, then the
  // text comes in); project → project keeps masking it in once the clone is
  // ~40 % of the way (contentRevealed), since that hand-off barely moves. The
  // key is stable from "go" onwards so the end of the morph does not re-run
  // it. The page under the clone shows a couple of frames before the clone goes.
  const skip = isTransitioning && !pageRevealed;
  const textWaiting = isTransitioning && !(inPlace ? contentRevealed : pageRevealed);
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
      const pills = linksRef.current.querySelectorAll("[data-pill]");
      if (!pills.length) return;
      gsap.fromTo(
        pills,
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

  if (hasChapters) {
    return (
      <>
        <ProjectChapters
          project={project}
          hidden={skip}
          textHidden={textWaiting}
          panelRef={panelRef}
          titleRef={titleRef}
          descRef={descRef}
          techRef={techRef}
          linksRef={linksRef}
          galleryRef={galleryRef}
          firstImageRef={firstImageRef}
          onFirstReady={onFirstReady}
          nextProject={nextProject}
          previewRef={previewRef}
          onNavigateNext={nextSlug ? navigateNext : undefined}
          mobileVariant={mobileVariant}
        />
        {!skip && (
          <ScrollProgress
            progressRef={scrollProgressElRef}
            nextProjectSlug={nextSlug}
            nextTextWrapperRef={nextTextWrapperRef}
            nextTextRef={nextTextRef}
            align="right"
          />
        )}
      </>
    );
  }

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
