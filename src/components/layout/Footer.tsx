"use client";

import { useRef, useEffect } from "react";
import NextLink from "next/link";
import { Link } from "next-view-transitions";
import gsap from "gsap";

interface FooterProps {
  projectTitle?: string;
  siteUrl?: string;
  caseStudySlug?: string;
  onDetailsToggle?: () => void;
  detailsOpen?: boolean;
  visible?: boolean;
}

export default function Footer({
  projectTitle,
  siteUrl,
  caseStudySlug,
  onDetailsToggle,
  detailsOpen = false,
  visible = true,
}: FooterProps) {
  const footerRef = useRef<HTMLElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const hasAppeared = useRef(false);

  // Fully hidden on mount, animate in when visible becomes true
  useEffect(() => {
    if (!footerRef.current) return;
    if (visible && !hasAppeared.current) {
      hasAppeared.current = true;
      gsap.fromTo(
        footerRef.current,
        { autoAlpha: 0, yPercent: 100 },
        { autoAlpha: 1, yPercent: 0, duration: 0.6, ease: "expo.out" },
      );
    } else if (!visible && !hasAppeared.current) {
      gsap.set(footerRef.current, { autoAlpha: 0, yPercent: 100 });
    }
  }, [visible]);

  useEffect(() => {
    if (!wipeRef.current) return;

    if (detailsOpen) {
      gsap.fromTo(
        wipeRef.current,
        { clipPath: "inset(100% 0 0 0)" },
        { clipPath: "inset(0% 0 0 0)", duration: 0.3, ease: "power2.in" },
      );
    } else {
      gsap.to(wipeRef.current, {
        clipPath: "inset(100% 0 0 0)",
        duration: 1,
        ease: "power2.in",
        delay: 0.4,
      });
    }
  }, [detailsOpen]);

  if (!projectTitle) return null;

  return (
    <footer ref={footerRef} className="fixed bottom-0 left-0 right-0 z-40 flex h-10 items-center justify-between px-6 desktop:hidden bg-white overflow-hidden">
      <div
        ref={wipeRef}
        className="absolute inset-0 bg-pistachio [clip-path:inset(100%_0_0_0)]"
      />
      <span className="relative text-h3 text-primary">{projectTitle}</span>
      <div className="relative flex items-center gap-4">
        {onDetailsToggle && (
          <button
            onClick={onDetailsToggle}
            aria-expanded={detailsOpen}
            aria-label={
              detailsOpen ? "Close project details" : "Show project details"
            }
            className="text-sub text-primary hover:text-pomegranate hover:cursor-pointer"
          >
            {detailsOpen ? "Close -" : "Details +"}
          </button>
        )}
        {caseStudySlug && (
          <Link
            href={`/journal/${caseStudySlug}`}
            className="text-sub text-primary hover:text-pomegranate"
          >
            Case study
          </Link>
        )}
        {siteUrl && (
          <NextLink
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sub text-primary hover:text-pomegranate"
          >
            Visit website
          </NextLink>
        )}
      </div>
    </footer>
  );
}
