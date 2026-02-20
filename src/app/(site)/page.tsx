import HomeGallery from "@/components/home/HomeGallery";
import { client } from "@/sanity/lib/client";
import { PROJECTS_QUERY } from "@/sanity/lib/queries";

export default async function HomePage() {
  const projects = await client.fetch(PROJECTS_QUERY);

  return <HomeGallery projects={projects} />;
}
