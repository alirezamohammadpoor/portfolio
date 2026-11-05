"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { ReactLenis, useLenis } from "lenis/react";
import type { LenisRef } from "lenis/react";
import type Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { registerMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);
registerMotion();
gsap.ticker.lagSmoothing(0);

function ScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update());
  return null;
}

// Lenis reads the option per wheel event, so it is changed in place and
// ReactLenis is not re-created.
function setSmoothWheel(lenis: Lenis, on: boolean) {
  lenis.options.smoothWheel = on;
}

// Reduced motion: the wheel scrolls natively instead of through the lerp.
// The hook hands over the instance once it exists; a ref read at mount
// would still be empty.
function ReducedMotionSync() {
  const lenis = useLenis();
  useEffect(() => {
    if (!lenis) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setSmoothWheel(lenis, !mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [lenis]);
  return null;
}

export default function GsapProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const pathname = usePathname();

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  // Disable browser scroll restoration + scroll Lenis to top on route change
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    const lenis = lenisRef.current?.lenis;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      ScrollTrigger.refresh();
    }
  }, [pathname]);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      autoRaf={false}
      options={{ lerp: 0.06, smoothWheel: true }}
    >
      <ScrollTriggerSync />
      <ReducedMotionSync />
      {children}
    </ReactLenis>
  );
}
