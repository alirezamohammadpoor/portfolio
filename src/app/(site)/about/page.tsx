import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { ABOUT_QUERY } from "@/sanity/lib/queries";
import AboutContent from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About",
};

export default async function AboutPage() {
  const about = await client.fetch(ABOUT_QUERY);

  return (
    <div>
      <AboutContent
        heading={about?.heading}
        bio={about?.bio ?? []}
        portrait={about?.portrait}
        skills={about?.skills}
        email={about?.email}
        linkedinUrl={about?.linkedinUrl}
      />
    </div>
  );
}
