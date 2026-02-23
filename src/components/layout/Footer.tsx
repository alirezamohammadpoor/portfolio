"use client";

import Link from "next/link";

interface FooterProps {
  projectTitle?: string;
  siteUrl?: string;
  caseStudySlug?: string;
  onDetailsToggle?: () => void;
  detailsOpen?: boolean;
}

export default function Footer({
  projectTitle,
  siteUrl,
  caseStudySlug,
  onDetailsToggle,
  detailsOpen = false,
}: FooterProps) {
  if (!projectTitle) return null;

  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-40 flex h-10 items-center justify-between border-t border-tertiary px-6 desktop:hidden ${detailsOpen ? "bg-[rgba(233,243,226,0.95)]" : "bg-white"}`}
    >
      <span className="text-h3 text-primary">{projectTitle}</span>
      <div className="flex items-center gap-4">
        {onDetailsToggle && (
          <button
            onClick={onDetailsToggle}
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
          <Link
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sub text-primary hover:text-pomegranate"
          >
            Visit website
          </Link>
        )}
      </div>
    </footer>
  );
}
