import type { Metadata } from "next";
import NumbersReel from "@/components/lab/reel/NumbersReel";

// Prototype for the internship reel. Not linked, not indexed.
export const metadata: Metadata = { title: "Reel — Numbers" };

export default function NumbersReelPage() {
  return <NumbersReel />;
}
