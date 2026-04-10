"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import NextLink from "next/link";
import { Link } from "next-view-transitions";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface FooterProps {
  projectTitle?: string;
  siteUrl?: string;
  caseStudySlug?: string;
  onDetailsToggle?: () => void;
  detailsOpen?: boolean;
  visible?: boolean;
  progressRef?: RefObject<HTMLElement | null>;
  wipeRef?: RefObject<HTMLDivElement | null>;
  nextHintRef?: RefObject<HTMLElement | null>;
  scrollInfoRef?: RefObject<HTMLElement | null>;
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
  nextHintRef,
  scrollInfoRef,
}: FooterProps) {
  const footerRef = useRef<HTMLElement>(null);
  const hasAppeared = useRef(false);

  // Fully hidden on mount, animate in when visible becomes true
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

  // Details drawer wipe — timed animation
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

  if (!projectTitle) return null;

  return (
    <footer
      ref={footerRef}
      className="fixed bottom-0 left-0 right-0 z-40 flex h-10 items-center justify-between px-4 desktop:hidden bg-white overflow-hidden"
    >
      <div
        ref={wipeRef}
        className="absolute inset-0 bg-pistachio [clip-path:inset(100%_0_0_0)]"
      />
      <div className="relative flex items-center gap-3">
        <span className="text-h3 text-primary">{projectTitle}</span>
      </div>
      <div className="relative flex items-center gap-4">
        <span ref={nextHintRef} className="text-sub font-bold uppercase text-primary" style={{ display: "none" }}>
          Scroll to see next project
        </span>
        <span ref={scrollInfoRef} className="flex items-center gap-4">
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
    </footer>
  );
}
