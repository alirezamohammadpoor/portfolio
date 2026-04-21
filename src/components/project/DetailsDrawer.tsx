"use client";

import { useRef, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import TechStack from "./TechStack";
import { portableTextComponents } from "@/components/portableText/components";

interface DetailsDrawerProps {
  project: NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
  isOpen: boolean;
}

export default function DetailsDrawer({ project, isOpen }: DetailsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const hasOpened = useRef(false);

  // Hidden on mount + open/close animation
  useGSAP(() => {
    if (!drawerRef.current || !bgRef.current) return;

    // Initial hidden state
    if (!hasOpened.current && !isOpen) {
      gsap.set(drawerRef.current, { autoAlpha: 0, yPercent: 100 });
      return;
    }

    if (isOpen) {
      hasOpened.current = true;
      gsap.set(bgRef.current, { clipPath: "inset(0 0 0% 0)" });
      gsap.to(drawerRef.current, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.4,
        ease: "power3.out",
        delay: 0.1,
        onComplete: () => drawerRef.current?.focus(),
      });
    } else if (hasOpened.current) {
      gsap.to(bgRef.current, {
        clipPath: "inset(100% 0 0 0)",
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(drawerRef.current, {
        autoAlpha: 0,
        yPercent: 100,
        duration: 0.25,
        ease: "power2.out",
        delay: 0.15,
      });
    }
  }, { dependencies: [isOpen] });

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
      className="fixed inset-x-0 bottom-10 z-30 bg-white px-4 py-8 desktop:hidden outline-none invisible"
    >
      <div
        ref={bgRef}
        className="absolute inset-0 bg-pistachio [&_*::selection]:bg-lightpistachio"
      />
      <div className="relative">
        {Array.isArray(project.fullDescription) && project.fullDescription.length > 0 && (
          <div className="text-body text-primary [&>p]:my-0 [&>p+p]:mt-3 [&>h2]:mt-12 [&>h3]:mt-10">
            <PortableText
              value={project.fullDescription as PortableTextBlock[]}
              components={portableTextComponents}
            />
          </div>
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
