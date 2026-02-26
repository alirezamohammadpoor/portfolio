"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);

export default function GsapProvider({ children }: { children: ReactNode }) {
  return <ReactLenis root options={{ syncTouch: true }}>{children}</ReactLenis>;
}
