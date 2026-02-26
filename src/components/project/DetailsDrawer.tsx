"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import TechStack from "./TechStack";

interface DetailsDrawerProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
  isOpen: boolean;
}

export default function DetailsDrawer({ project, isOpen }: DetailsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const hasOpened = useRef(false);

  // Fully hidden on mount — invisible + off-screen
  useEffect(() => {
    if (drawerRef.current) {
      gsap.set(drawerRef.current, { autoAlpha: 0, yPercent: 100 });
    }
  }, []);

  useEffect(() => {
    if (!drawerRef.current || !bgRef.current) return;

    if (isOpen) {
      hasOpened.current = true;
      gsap.set(bgRef.current, { clipPath: "inset(0 0 0% 0)" });
      gsap.to(drawerRef.current, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.6,
        ease: "power2.in",
        delay: 0.15,
        onComplete: () => drawerRef.current?.focus(),
      });
    } else if (hasOpened.current) {
      gsap.to(bgRef.current, {
        clipPath: "inset(100% 0 0 0)",
        duration: 0.4,
        ease: "power2.in",
      });
      gsap.to(drawerRef.current, {
        autoAlpha: 0,
        yPercent: 100,
        duration: 0.4,
        ease: "power2.in",
        delay: 0.35,
      });
    }
  }, [isOpen]);

  // Trap focus within the drawer when open
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || !drawerRef.current) return;
      if (e.key !== "Tab") return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [isOpen],
  );

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-label="Project details"
      aria-hidden={!isOpen}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-x-0 bottom-10 z-30 bg-white px-6 py-8 desktop:hidden outline-none"
    >
      <div
        ref={bgRef}
        className="absolute inset-0 bg-pistachio [&_*::selection]:bg-lightpistachio"
      />
      <div className="relative">
        {project.fullDescription && (
          <p className="text-body text-primary">{project.fullDescription}</p>
        )}
        {project.techStack && project.techStack.length > 0 && (
          <>
            <p className="mt-6 text-sub text-primary">Tech stack</p>
            <TechStack items={project.techStack} />
          </>
        )}
      </div>
    </div>
  );
}
