import HomeGallery from "@/components/home/HomeGallery";
import { sanityFetch } from "@/sanity/lib/live";
import { PROJECTS_QUERY } from "@/sanity/lib/queries";

export default async function HomePage() {
  const { data: projects } = await sanityFetch({ query: PROJECTS_QUERY });

  return <HomeGallery projects={projects} />;
}
