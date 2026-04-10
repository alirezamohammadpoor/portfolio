"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import NextLink from "next/link";
import { Link } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const FOOTER_HEIGHT = 40;
const FOOTER_HEIGHT_EXPANDED = 72;

interface FooterProps {
  projectTitle?: string;
  siteUrl?: string;
  caseStudySlug?: string;
  onDetailsToggle?: () => void;
  detailsOpen?: boolean;
  visible?: boolean;
  progressRef?: RefObject<HTMLElement | null>;
  wipeRef?: RefObject<HTMLDivElement | null>;
  nextProjectSlug?: string;
  prevProjectSlug?: string;
  isFirstProject?: boolean;
  showNav?: boolean;
}

export default function Footer({
  projectTitle,
  siteUrl,
  caseStudySlug,
  onDetailsToggle,
  detailsOpen = false,
  visible = true,
  progressRef,
  wipeRef,
  nextProjectSlug,
  prevProjectSlug,
  isFirstProject = false,
  showNav = false,
}: FooterProps) {
  const footerRef = useRef<HTMLElement>(null);
  const navRowRef = useRef<HTMLDivElement>(null);
  const hasAppeared = useRef(false);

  useGSAP(() => {
    if (!footerRef.current) return;
    if (visible && !hasAppeared.current) {
      hasAppeared.current = true;
      gsap.fromTo(
        footerRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.6, ease: "expo.out" },
      );
    } else if (!visible && !hasAppeared.current) {
      gsap.set(footerRef.current, { autoAlpha: 0 });
    }
  }, { dependencies: [visible] });

  useGSAP(() => {
    if (!wipeRef?.current) return;
    if (detailsOpen) {
      gsap.killTweensOf(wipeRef.current);
      gsap.fromTo(
        wipeRef.current,
        { clipPath: "inset(100% 0 0 0)" },
        { clipPath: "inset(0% 0 0 0)", duration: 0.3, ease: "power2.out" },
      );
    } else {
      gsap.killTweensOf(wipeRef.current);
      gsap.to(wipeRef.current, {
        clipPath: "inset(100% 0 0 0)",
        duration: 0.3,
        ease: "power2.out",
        delay: 0.5,
      });
    }
  }, { dependencies: [detailsOpen] });

  // Expand footer to reveal nav row
  useGSAP(() => {
    if (!footerRef.current || !navRowRef.current) return;
    if (showNav) {
      gsap.to(footerRef.current, { height: FOOTER_HEIGHT_EXPANDED, duration: 0.3, ease: "power2.out" });
      gsap.to(navRowRef.current, { opacity: 1, height: "auto", duration: 0.3, ease: "power2.out" });
    } else {
      gsap.to(footerRef.current, { height: FOOTER_HEIGHT, duration: 0.3, ease: "power2.out" });
      gsap.to(navRowRef.current, { opacity: 0, height: 0, duration: 0.3, ease: "power2.out" });
    }
  }, { dependencies: [showNav] });

  if (!projectTitle) return null;

  const hasNav = nextProjectSlug || (prevProjectSlug && !isFirstProject);

  return (
    <footer
      ref={footerRef}
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col justify-center px-4 desktop:hidden bg-white overflow-hidden"
      style={{ height: FOOTER_HEIGHT }}
    >
      <div
        ref={wipeRef}
        className="absolute inset-0 bg-pistachio [clip-path:inset(100%_0_0_0)]"
      />
      <div className="relative flex items-center justify-between">
        <span className="text-h3 text-primary">{projectTitle}</span>
        <span className="flex items-center gap-4">
          {progressRef && (
            <span ref={progressRef as RefObject<HTMLSpanElement | null>} className="text-sub text-primary tabular-nums">0</span>
          )}
          {onDetailsToggle && (
            <button
              onClick={onDetailsToggle}
              aria-expanded={detailsOpen}
              aria-label={
                detailsOpen ? "Close project details" : "Show project details"
              }
              className="text-sub text-primary cursor-pointer"
            >
              {detailsOpen ? "Close -" : "Details +"}
            </button>
          )}
          {caseStudySlug && (
            <Link
              href={`/journal/${caseStudySlug}`}
              className="text-sub text-primary"
            >
              Case study
            </Link>
          )}
          {siteUrl && (
            <NextLink
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sub text-primary"
            >
              Visit website
            </NextLink>
          )}
        </span>
      </div>
      {hasNav && (
        <div
          ref={navRowRef}
          className="relative flex items-center justify-between opacity-0 h-0 overflow-hidden"
        >
          <span>
            {prevProjectSlug && !isFirstProject && (
              <Link
                href={`/project/${prevProjectSlug}`}
                className="text-sub text-primary"
              >
                Previous Project
              </Link>
            )}
          </span>
          <span>
            {nextProjectSlug && (
              <Link
                href={`/project/${nextProjectSlug}`}
                className="text-sub text-primary"
              >
                Next Project
              </Link>
            )}
          </span>
        </div>
      )}
    </footer>
  );
}
