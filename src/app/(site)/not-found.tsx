"use client";

import { useRef } from "react";
import { Link } from "next-view-transitions";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";

export default function NotFound() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useTitleAnimation(titleRef, scopeRef);
  useBodyAnimation(bodyRef, scopeRef, { delay: 0.3 });

  return (
    <div ref={scopeRef} className="flex min-h-screen flex-col items-center justify-center px-4 desktop:px-6">
      <h1 ref={titleRef} className="text-primary">404</h1>
      <p ref={bodyRef} className="mt-4 text-body text-secondary">Page not found.</p>
      <Link href="/" className="link-underline mt-8 text-sub text-primary uppercase">
        Back to home
      </Link>
    </div>
  );
}
