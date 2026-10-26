import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { getAbout, getAboutDraft } from "@/sanity/lib/data";
import AboutContent from "@/components/about/AboutContent";
import { OPEN_GRAPH_BASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ali Reza Mohammad Poor — Frontend Developer specializing in eCommerce.",
  alternates: { canonical: "/about" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    type: "profile",
    url: "/about",
    title: "About",
    description:
      "Ali Reza Mohammad Poor — Frontend Developer specializing in eCommerce.",
  },
};

export default async function AboutPage() {
  const { isEnabled: isDraft } = await draftMode();
  const about = isDraft ? await getAboutDraft() : await getAbout();

  return (
    <div>
      <AboutContent
        heading={about?.heading}
        bio={about?.bio ?? []}
        portrait={about?.portrait}
        email={about?.email}
        linkedinUrl={about?.linkedinUrl}
        githubUrl={about?.githubUrl}
      />
    </div>
  );
}
