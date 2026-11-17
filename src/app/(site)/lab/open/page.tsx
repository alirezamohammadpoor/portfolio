import type { Metadata } from "next";
import OpenLab from "@/components/lab/open/OpenLab";

// Work → project (Ali, 11-17): the preview flies into card 1 while the
// capsule does one of three things. The picker sets which; the site's own
// capsule and project page do the rest. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Opening a project from Work",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpenLab />;
}
