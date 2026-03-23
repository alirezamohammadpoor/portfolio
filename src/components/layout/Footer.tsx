"use client";

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
  scrollProgress?: number;
  nextProgress?: number;
}

export default function Footer({
  projectTitle,
  siteUrl,
  caseStudySlug,
  onDetailsToggle,
  detailsOpen = false,
  visible = true,
  scrollProgress,
  nextProgress = 0,
}: FooterProps) {
  const footerRef = useRef<HTMLElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const hasAppeared = useRef(false);
  const isClosing = useRef(false);

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

  const showNextHint = scrollProgress != null && scrollProgress >= 100;

  // Details drawer wipe — timed animation
  useGSAP(() => {
    if (!wipeRef.current) return;
    if (detailsOpen) {
      isClosing.current = false;
      gsap.killTweensOf(wipeRef.current);
      gsap.fromTo(
        wipeRef.current,
        { clipPath: "inset(100% 0 0 0)" },
        { clipPath: "inset(0% 0 0 0)", duration: 0.3, ease: "power2.out" },
      );
    } else {
      isClosing.current = true;
      gsap.killTweensOf(wipeRef.current);
      gsap.to(wipeRef.current, {
        clipPath: "inset(100% 0 0 0)",
        duration: 0.4,
        ease: "power2.in",
        delay: 0.7,
        onComplete: () => { isClosing.current = false; },
      });
    }
  }, { dependencies: [detailsOpen, showNextHint] });

  // Next-project wipe — scrubbed to scroll progress (not timed)
  useGSAP(() => {
    if (!wipeRef.current || detailsOpen || isClosing.current) return;
    if (showNextHint && nextProgress > 0) {
      const pct = 100 - nextProgress * 100;
      gsap.set(wipeRef.current, { clipPath: `inset(${pct}% 0 0 0)` });
    } else if (!showNextHint) {
      gsap.set(wipeRef.current, { clipPath: "inset(100% 0 0 0)" });
    }
  }, { dependencies: [detailsOpen, showNextHint, nextProgress] });

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
        {showNextHint ? (
          <span className="text-sub font-bold uppercase text-primary">
            Scroll to see next project
          </span>
        ) : (
          <>
            {scrollProgress != null && (
              <span className="text-sub text-primary tabular-nums">{scrollProgress}</span>
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
          </>
        )}
      </div>
    </footer>
  );
}
