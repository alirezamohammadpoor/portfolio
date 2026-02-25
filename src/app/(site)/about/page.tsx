import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/live";
import { ABOUT_QUERY } from "@/sanity/lib/queries";
import AboutContent from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About",
};

export default async function AboutPage() {
  const { data: about } = await sanityFetch({ query: ABOUT_QUERY });

  return (
    <div>
      <AboutContent
        heading={about?.heading}
        bio={about?.bio ?? []}
        portrait={about?.portrait}
        email={about?.email}
        linkedinUrl={about?.linkedinUrl}
      />
    </div>
  );
}
