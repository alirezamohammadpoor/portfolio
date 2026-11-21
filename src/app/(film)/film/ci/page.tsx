import type { Metadata } from "next";
import CiReel from "@/components/lab/reel/CiReel";

// Prototype for the internship reel. Not linked, not indexed.
export const metadata: Metadata = { title: "Reel — CI" };

export default function CiReelPage() {
  return <CiReel />;
}
