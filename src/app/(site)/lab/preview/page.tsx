import type { Metadata } from "next";
import PreviewLab from "@/components/lab/preview/PreviewLab";

// Work's preview swap (Ali, 11-17): three ways the preview changes when
// another project leads, on the site's own capsule. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Work preview swap",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PreviewLab />;
}
