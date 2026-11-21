import type { Metadata } from "next";
import StrongerReel from "@/components/lab/reel/StrongerReel";

// Prototype for the internship reel. Not linked, not indexed.
export const metadata: Metadata = { title: "Reel — Stronger" };

export default function StrongerReelPage() {
  return <StrongerReel />;
}
