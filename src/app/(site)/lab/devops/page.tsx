import type { Metadata } from "next";
import DevopsLab from "@/components/lab/devops/DevopsLab";

// Devops project visuals, direction A: coded motion diagrams for the
// pipeline, cluster and traffic pieces (Ali, 11-20). Not linked, not
// indexed; delete once the clips are recorded or the direction is dropped.
export const metadata: Metadata = {
  title: "Lab — Devops diagrams",
  robots: { index: false, follow: false },
};

export default function DevopsLabPage() {
  return <DevopsLab />;
}
