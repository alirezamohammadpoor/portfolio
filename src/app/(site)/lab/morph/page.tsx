import type { Metadata } from "next";
import MorphLab from "@/components/lab/morph/MorphLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Test morphs",
  robots: { index: false, follow: false },
};

export default function MorphLabPage() {
  return <MorphLab />;
}
