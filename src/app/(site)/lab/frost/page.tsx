import type { Metadata } from "next";
import { fileUrl } from "@/sanity/lib/image";
import FrostLab from "@/components/lab/frost/FrostLab";

// Frost tokens (Ali, 11-04): tune the overlay and pill frost over a real clip,
// then copy the values into globals.css. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Frost",
  robots: { index: false, follow: false },
};

const LAPTOP = "file-94cdbae7c91ff12805a6399d0fa1135b30e65f60-mp4"; // stronger-landing-flush, 1920×1200

export default function FrostLabPage() {
  return <FrostLab clip={fileUrl(LAPTOP)} />;
}
